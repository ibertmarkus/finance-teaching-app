"""
Classroom Polling App
=====================
A simple web-based polling application for classroom use.
Students scan QR codes to vote, teachers see real-time results.
"""

import streamlit as st
import qrcode
from io import BytesIO
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional
import time


# =============================================================================
# Configuration
# =============================================================================

# Change this password to something only you know
TEACHER_PASSWORD = "teacher123"


# =============================================================================
# Authentication
# =============================================================================

def check_password() -> bool:
    """Returns True if the user has entered the correct password."""
    if st.session_state.get("authenticated"):
        return True

    st.title("Teacher Login")
    st.markdown("Enter the password to access the teacher dashboard.")

    password = st.text_input("Password", type="password")

    if st.button("Login", type="primary"):
        if password == TEACHER_PASSWORD:
            st.session_state.authenticated = True
            st.rerun()
        else:
            st.error("Incorrect password")

    return False


# =============================================================================
# Shared State Management
# =============================================================================

@dataclass
class Poll:
    """Represents a single poll question."""
    id: str
    question: str
    options: List[str]
    votes: Dict[str, int] = field(default_factory=dict)
    is_open: bool = False  # Polls start closed - teacher must open them

    def __post_init__(self):
        # Initialize vote counts for each option
        if not self.votes:
            self.votes = {opt: 0 for opt in self.options}


@dataclass
class PollGroup:
    """Represents a group of related polls (multi-question poll)."""
    id: str
    name: str
    poll_ids: List[str]
    is_open: bool = False


@st.cache_resource
def get_poll_store() -> Dict[str, Poll]:
    """
    Returns a shared dictionary that persists across sessions.
    This allows votes from different students to be aggregated.
    Resets when the app restarts.
    """
    return {}


@st.cache_resource
def get_poll_group_store() -> Dict[str, PollGroup]:
    """Returns a shared dictionary for poll groups."""
    return {}


@st.cache_resource
def get_voter_store() -> set:
    """
    Tracks which session IDs have voted on which polls.
    Format: "{session_id}_{poll_id}"
    """
    return set()


def create_poll(question: str, options: List[str]) -> Poll:
    """Create a new poll and add it to the store."""
    poll_id = str(uuid.uuid4())[:8]
    poll = Poll(id=poll_id, question=question, options=options)
    get_poll_store()[poll_id] = poll
    return poll


def get_poll(poll_id: str) -> Optional[Poll]:
    """Retrieve a poll by ID."""
    return get_poll_store().get(poll_id)


def cast_vote(poll_id: str, option: str, session_id: str) -> bool:
    """
    Cast a vote for an option. Returns True if vote was counted,
    False if user already voted.
    """
    voter_key = f"{session_id}_{poll_id}"
    if voter_key in get_voter_store():
        return False

    poll = get_poll(poll_id)
    if poll and option in poll.votes:
        poll.votes[option] += 1
        get_voter_store().add(voter_key)
        return True
    return False


def has_voted(poll_id: str, session_id: str) -> bool:
    """Check if a session has already voted on a poll."""
    return f"{session_id}_{poll_id}" in get_voter_store()


def clear_all_polls():
    """Clear all polls, poll groups, and votes."""
    get_poll_store().clear()
    get_poll_group_store().clear()
    get_voter_store().clear()


def toggle_poll(poll_id: str) -> bool:
    """Toggle a poll's open/closed state. Returns new state."""
    poll = get_poll(poll_id)
    if poll:
        poll.is_open = not poll.is_open
        return poll.is_open
    return False


def create_poll_group(name: str, poll_ids: List[str]) -> PollGroup:
    """Create a new poll group."""
    group_id = str(uuid.uuid4())[:8]
    group = PollGroup(id=group_id, name=name, poll_ids=poll_ids)
    get_poll_group_store()[group_id] = group
    return group


def get_poll_group(group_id: str) -> Optional[PollGroup]:
    """Retrieve a poll group by ID."""
    return get_poll_group_store().get(group_id)


def toggle_poll_group(group_id: str) -> bool:
    """Toggle a poll group's open/closed state. Also toggles all polls in the group."""
    group = get_poll_group(group_id)
    if group:
        group.is_open = not group.is_open
        # Also toggle all polls in the group
        for poll_id in group.poll_ids:
            poll = get_poll(poll_id)
            if poll:
                poll.is_open = group.is_open
        return group.is_open
    return False


def clear_all_poll_groups():
    """Clear all poll groups."""
    get_poll_group_store().clear()


# =============================================================================
# QR Code Generation
# =============================================================================

def generate_qr_code(url: str) -> BytesIO:
    """Generate a QR code image for the given URL."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer


def get_poll_url(poll_id: str, base_url: str) -> str:
    """Generate the student voting URL for a poll."""
    # Remove trailing slash if present
    base_url = base_url.rstrip('/')
    return f"{base_url}/?poll={poll_id}"


def get_results_url(poll_id: str, base_url: str) -> str:
    """Generate the results display URL for a poll."""
    base_url = base_url.rstrip('/')
    return f"{base_url}/?poll={poll_id}&results=1"


def get_group_url(group_id: str, base_url: str) -> str:
    """Generate the student voting URL for a poll group."""
    base_url = base_url.rstrip('/')
    return f"{base_url}/?group={group_id}"


def get_group_results_url(group_id: str, base_url: str) -> str:
    """Generate the results display URL for a poll group."""
    base_url = base_url.rstrip('/')
    return f"{base_url}/?group={group_id}&results=1"


# =============================================================================
# Session Management
# =============================================================================

def get_session_id() -> str:
    """Get or create a unique session ID for this user."""
    if 'session_id' not in st.session_state:
        st.session_state.session_id = str(uuid.uuid4())
    return st.session_state.session_id


# =============================================================================
# Page Components
# =============================================================================

def render_teacher_dashboard():
    """Render the teacher dashboard for creating and managing polls."""
    st.title("Classroom Polling")
    st.markdown("Create polls, share QR codes with students, and view live results.")

    # App URL configuration
    st.sidebar.header("Settings")
    default_url = "https://your-app.streamlit.app"
    base_url = st.sidebar.text_input(
        "App URL (for QR codes)",
        value=st.session_state.get('base_url', default_url),
        help="Enter your deployed Streamlit app URL"
    )
    st.session_state.base_url = base_url

    # Create new poll section
    st.header("Create New Poll")

    with st.form("create_poll_form"):
        question = st.text_input("Question", placeholder="What is the present value of $100 received in 5 years at 10% interest?")

        st.markdown("**Answer Options** (leave blank for fewer options)")
        col1, col2 = st.columns(2)
        with col1:
            opt_a = st.text_input("Option A", placeholder="$62.09")
            opt_b = st.text_input("Option B", placeholder="$72.45")
            opt_c = st.text_input("Option C", placeholder="$82.64")
        with col2:
            opt_d = st.text_input("Option D", placeholder="$90.00")
            opt_e = st.text_input("Option E (optional)", placeholder="")
            opt_f = st.text_input("Option F (optional)", placeholder="")

        submitted = st.form_submit_button("Create Poll", type="primary")

        if submitted:
            if not question.strip():
                st.error("Please enter a question.")
            else:
                # Collect non-empty options
                options = []
                for label, value in [('A', opt_a), ('B', opt_b), ('C', opt_c),
                                      ('D', opt_d), ('E', opt_e), ('F', opt_f)]:
                    if value.strip():
                        options.append(f"{label}. {value.strip()}")

                if len(options) < 2:
                    st.error("Please provide at least 2 options.")
                else:
                    poll = create_poll(question.strip(), options)
                    st.success(f"Poll created! ID: {poll.id}")
                    st.rerun()

    # Display active polls
    st.header("Active Polls")

    polls = get_poll_store()

    if not polls:
        st.info("No active polls. Create one above!")
    else:
        for poll_id, poll in polls.items():
            # Show status in expander title
            status_indicator = "OPEN" if poll.is_open else "CLOSED"
            with st.expander(f"**{poll.question}** [{status_indicator}]", expanded=True):
                # Poll status and control at the top
                status_col1, status_col2 = st.columns([2, 1])
                with status_col1:
                    if poll.is_open:
                        st.success("Poll is OPEN - students can vote")
                    else:
                        st.warning("Poll is CLOSED - students see the question but cannot vote yet")
                with status_col2:
                    button_label = "Close Poll" if poll.is_open else "Open Poll"
                    button_type = "secondary" if poll.is_open else "primary"
                    if st.button(button_label, key=f"toggle_{poll_id}", type=button_type):
                        toggle_poll(poll_id)
                        st.rerun()

                st.divider()

                col1, col2 = st.columns([1, 2])

                with col1:
                    # QR Code
                    poll_url = get_poll_url(poll_id, base_url)
                    qr_image = generate_qr_code(poll_url)
                    st.image(qr_image, caption="Scan to vote", width=200)

                    # Download QR code button
                    qr_download = generate_qr_code(poll_url)
                    st.download_button(
                        "Download QR Code",
                        data=qr_download,
                        file_name=f"poll_{poll_id}_qr.png",
                        mime="image/png"
                    )

                    st.markdown(f"**Voting link:**")
                    st.code(poll_url, language=None)

                with col2:
                    # Live results
                    st.markdown("**Live Results:**")
                    total_votes = sum(poll.votes.values())
                    st.markdown(f"Total votes: **{total_votes}**")

                    if total_votes > 0:
                        # Create bar chart data
                        chart_data = {opt: votes for opt, votes in poll.votes.items()}
                        st.bar_chart(chart_data)
                    else:
                        st.info("No votes yet")

                    # Results URL for projector
                    results_url = get_results_url(poll_id, base_url)
                    st.markdown(f"**Full-screen results:** `{results_url}`")

    # Poll Groups Section
    st.header("Poll Groups (Multi-Question)")
    st.markdown("Combine multiple polls - students answer one at a time, see results side by side.")

    # Create poll group
    polls = get_poll_store()
    if len(polls) >= 2:
        with st.form("create_group_form"):
            group_name = st.text_input("Group Name", placeholder="Exercise 1")

            # Let teacher select which polls to include
            poll_options = {f"{p.question[:50]}..." if len(p.question) > 50 else p.question: pid
                          for pid, p in polls.items()}
            selected_polls = st.multiselect(
                "Select polls to include (in order)",
                options=list(poll_options.keys()),
                help="Select 2 or more polls. Students will answer them in this order."
            )

            if st.form_submit_button("Create Poll Group", type="primary"):
                if not group_name.strip():
                    st.error("Please enter a group name.")
                elif len(selected_polls) < 2:
                    st.error("Please select at least 2 polls.")
                else:
                    selected_poll_ids = [poll_options[q] for q in selected_polls]
                    group = create_poll_group(group_name.strip(), selected_poll_ids)
                    st.success(f"Poll group created! ID: {group.id}")
                    st.rerun()
    else:
        st.info("Create at least 2 polls first to make a poll group.")

    # Display poll groups
    poll_groups = get_poll_group_store()
    if poll_groups:
        for group_id, group in poll_groups.items():
            status_indicator = "OPEN" if group.is_open else "CLOSED"
            with st.expander(f"**{group.name}** ({len(group.poll_ids)} questions) [{status_indicator}]", expanded=True):
                # Group status and control
                gcol1, gcol2 = st.columns([2, 1])
                with gcol1:
                    if group.is_open:
                        st.success("Group is OPEN - students can vote")
                    else:
                        st.warning("Group is CLOSED")
                with gcol2:
                    btn_label = "Close Group" if group.is_open else "Open Group"
                    btn_type = "secondary" if group.is_open else "primary"
                    if st.button(btn_label, key=f"toggle_group_{group_id}", type=btn_type):
                        toggle_poll_group(group_id)
                        st.rerun()

                st.divider()

                # Show questions in the group
                st.markdown("**Questions in this group:**")
                for i, pid in enumerate(group.poll_ids):
                    p = get_poll(pid)
                    if p:
                        st.markdown(f"{i+1}. {p.question}")

                col1, col2 = st.columns([1, 2])
                with col1:
                    # QR Code for group
                    group_url = get_group_url(group_id, base_url)
                    qr_image = generate_qr_code(group_url)
                    st.image(qr_image, caption="Scan to vote", width=200)

                    qr_download = generate_qr_code(group_url)
                    st.download_button(
                        "Download QR Code",
                        data=qr_download,
                        file_name=f"group_{group_id}_qr.png",
                        mime="image/png",
                        key=f"dl_group_{group_id}"
                    )
                    st.code(group_url, language=None)

                with col2:
                    # Combined results preview
                    st.markdown("**Results preview:**")
                    results_url = get_group_results_url(group_id, base_url)
                    st.markdown(f"**Full-screen results:** `{results_url}`")

    # Reset button
    st.divider()
    if st.button("Clear All Polls", type="secondary"):
        clear_all_polls()
        st.success("All polls cleared!")
        st.rerun()


def render_student_voting(poll_id: str):
    """Render the student voting interface."""
    poll = get_poll(poll_id)
    session_id = get_session_id()

    if not poll:
        st.error("Poll not found. Please check the link and try again.")
        st.markdown("[Go to teacher dashboard](?)")
        return

    st.title("Vote")
    st.markdown(f"### {poll.question}")

    # Check if poll is open
    if not poll.is_open:
        st.info("Poll is not yet open. Please wait for your instructor to open voting.")
        st.markdown("---")
        st.markdown("**Answer options:**")
        for option in poll.options:
            st.markdown(f"- {option}")
        # Auto-refresh to check when poll opens
        time.sleep(3)
        st.rerun()
        return

    # Check if already voted
    if has_voted(poll_id, session_id):
        st.success("Thank you for voting!")
        st.markdown("---")
        st.markdown("**Current Results:**")
        total = sum(poll.votes.values())
        for opt, count in poll.votes.items():
            pct = (count / total * 100) if total > 0 else 0
            st.markdown(f"**{opt}**: {count} votes ({pct:.1f}%)")

        # Auto-refresh to show updated results
        time.sleep(3)
        st.rerun()
        return

    # Voting buttons
    st.markdown("**Select your answer:**")

    for option in poll.options:
        if st.button(option, key=f"vote_{option}", use_container_width=True):
            success = cast_vote(poll_id, option, session_id)
            if success:
                st.success("Vote recorded!")
                time.sleep(1)
                st.rerun()
            else:
                st.warning("You have already voted on this poll.")
                st.rerun()


def render_results_display(poll_id: str):
    """Render full-screen results for projector display."""
    poll = get_poll(poll_id)

    if not poll:
        st.error("Poll not found.")
        return

    # Full-screen style
    st.markdown("""
        <style>
        .block-container { padding-top: 2rem; }
        h1 { font-size: 2.5rem !important; }
        </style>
    """, unsafe_allow_html=True)

    st.title(poll.question)

    total_votes = sum(poll.votes.values())
    st.markdown(f"### Total votes: {total_votes}")

    if total_votes > 0:
        # Large bar chart
        chart_data = {opt: votes for opt, votes in poll.votes.items()}
        st.bar_chart(chart_data, height=400)

        # Also show percentages
        st.markdown("---")
        cols = st.columns(len(poll.options))
        for i, (opt, count) in enumerate(poll.votes.items()):
            pct = count / total_votes * 100
            with cols[i]:
                st.metric(opt.split('.')[0], f"{pct:.1f}%", f"{count} votes")
    else:
        st.info("Waiting for votes...")

    # Auto-refresh every 2 seconds
    time.sleep(2)
    st.rerun()


def render_group_voting(group_id: str):
    """Render the student voting interface for a poll group (multi-question)."""
    group = get_poll_group(group_id)
    session_id = get_session_id()

    if not group:
        st.error("Poll group not found. Please check the link and try again.")
        return

    # Check if group is open
    if not group.is_open:
        st.title(group.name)
        st.info("This poll is not yet open. Please wait for your instructor.")
        time.sleep(3)
        st.rerun()
        return

    # Find the first unanswered question
    current_poll_idx = None
    for i, poll_id in enumerate(group.poll_ids):
        if not has_voted(poll_id, session_id):
            current_poll_idx = i
            break

    # If all questions answered
    if current_poll_idx is None:
        st.title("Thank you!")
        st.success(f"You have completed all {len(group.poll_ids)} questions in **{group.name}**.")
        st.balloons()
        return

    # Show current question
    current_poll_id = group.poll_ids[current_poll_idx]
    poll = get_poll(current_poll_id)

    if not poll:
        st.error("Poll not found.")
        return

    st.title(f"{group.name}")
    st.markdown(f"**Question {current_poll_idx + 1} of {len(group.poll_ids)}**")
    st.progress((current_poll_idx) / len(group.poll_ids))

    st.markdown(f"### {poll.question}")

    # Voting buttons
    st.markdown("**Select your answer:**")

    for option in poll.options:
        if st.button(option, key=f"vote_group_{option}", use_container_width=True):
            success = cast_vote(current_poll_id, option, session_id)
            if success:
                st.success("Vote recorded!")
                time.sleep(1)
                st.rerun()
            else:
                st.warning("You have already voted on this question.")
                st.rerun()


def render_group_results(group_id: str):
    """Render side-by-side results for a poll group."""
    group = get_poll_group(group_id)

    if not group:
        st.error("Poll group not found.")
        return

    # Full-screen style
    st.markdown("""
        <style>
        .block-container { padding-top: 2rem; }
        h1 { font-size: 2.5rem !important; }
        </style>
    """, unsafe_allow_html=True)

    st.title(group.name)

    # Create columns for side-by-side display
    cols = st.columns(len(group.poll_ids))

    for i, (col, poll_id) in enumerate(zip(cols, group.poll_ids)):
        poll = get_poll(poll_id)
        if not poll:
            continue

        with col:
            st.markdown(f"**Q{i+1}: {poll.question}**")

            total_votes = sum(poll.votes.values())
            st.markdown(f"Votes: {total_votes}")

            if total_votes > 0:
                chart_data = {opt.split('. ')[1] if '. ' in opt else opt: votes
                             for opt, votes in poll.votes.items()}
                st.bar_chart(chart_data, height=300)

                # Show percentages
                for opt, count in poll.votes.items():
                    pct = count / total_votes * 100
                    label = opt.split('. ')[0] if '. ' in opt else opt
                    st.markdown(f"{label}: **{pct:.1f}%** ({count})")
            else:
                st.info("No votes yet")

    # Auto-refresh
    time.sleep(2)
    st.rerun()


# =============================================================================
# Main App
# =============================================================================

def main():
    st.set_page_config(
        page_title="Classroom Polling",
        layout="wide"
    )

    # Get query parameters
    params = st.query_params.to_dict()
    poll_id = params.get("poll")
    group_id = params.get("group")
    show_results = params.get("results")

    # Route to appropriate view
    if group_id and show_results:
        render_group_results(group_id)
    elif group_id:
        render_group_voting(group_id)
    elif poll_id and show_results:
        render_results_display(poll_id)
    elif poll_id:
        render_student_voting(poll_id)
    else:
        # Teacher dashboard requires password
        if check_password():
            render_teacher_dashboard()


if __name__ == "__main__":
    main()
