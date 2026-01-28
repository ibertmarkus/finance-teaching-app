import streamlit as st
import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import fsolve

# Set page configuration
st.set_page_config(page_title="Internal Rate of Return", layout="wide")

# Add section headings to sidebar using CSS
st.markdown("""
<style>
/* Add "Lecture 2" heading before first page */
[data-testid="stSidebarNav"] ul li:first-child::before {
    content: "Lecture 2: Time Value of Money";
    display: block;
    font-size: 1.2rem;
    font-weight: 600;
    padding: 1rem 1rem 0.5rem;
    margin-bottom: 0.5rem;
    margin-top: -1rem;
    border-bottom: 1px solid rgba(250, 250, 250, 0.2);
}

/* Add "Lecture 4" heading before 5th page (Internal Rate of Return) */
[data-testid="stSidebarNav"] ul li:nth-child(5)::before {
    content: "Lecture 4: Valuing Investment Opportunities";
    display: block;
    font-size: 1.2rem;
    font-weight: 600;
    padding: 1rem 1rem 0.5rem;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid rgba(250, 250, 250, 0.2);
}
</style>
""", unsafe_allow_html=True)

# Title
st.title("Internal Rate of Return (IRR)")
st.write("""
The **Internal Rate of Return (IRR)** is the discount rate that makes the Net Present Value (NPV)
of an investment equal to zero. In other words, it's the rate at which the present value of cash
inflows equals the present value of cash outflows.
""")

st.markdown("### Formula")
st.latex(r"NPV = \sum_{t=0}^{T} \frac{CF_t}{(1+r)^t} = 0")
st.write("where the IRR is the value of r that solves this equation")

# Create two main columns: inputs on left, plot on right
left_col, right_col = st.columns([1, 2])

with left_col:
    st.subheader("Cash Flows")

    # Number of periods
    num_periods = st.number_input(
        "Number of Periods (including t=0)",
        min_value=2,
        max_value=20,
        value=5,
        step=1,
        help="Total number of cash flow periods, including the initial investment at t=0"
    )

    # Dynamic cash flow inputs
    cash_flows = []
    for i in range(num_periods):
        if i == 0:
            default_val = -100.0
            label = f"Period {i} (Initial Investment)"
        else:
            default_val = 30.0
            label = f"Period {i}"

        cf = st.number_input(
            label,
            min_value=-1000000.0,
            max_value=1000000.0,
            value=default_val,
            step=10.0,
            format="%.2f",
            key=f"cf_{i}"
        )
        cash_flows.append(cf)

# Function to calculate NPV
def calculate_npv(rate, cash_flows):
    npv = 0
    for t, cf in enumerate(cash_flows):
        npv += cf / (1 + rate) ** t
    return npv

# Calculate IRR using numerical methods
def find_irr(cash_flows):
    # Try to find IRR using multiple initial guesses
    irr_solutions = []

    # Try different starting points
    for initial_guess in [0.1, 0.5, 1.0, -0.5]:
        try:
            irr = fsolve(lambda r: calculate_npv(r, cash_flows), initial_guess)[0]
            # Check if this is a valid solution (NPV very close to 0)
            if abs(calculate_npv(irr, cash_flows)) < 0.01:
                # Check if we already have this solution (avoid duplicates)
                is_duplicate = False
                for existing_irr in irr_solutions:
                    if abs(irr - existing_irr) < 0.001:
                        is_duplicate = True
                        break
                if not is_duplicate:
                    irr_solutions.append(irr)
        except:
            pass

    return irr_solutions

# Calculate IRR
irr_values = find_irr(cash_flows)

with left_col:
    st.markdown("---")
    st.markdown("### Results")

    if len(irr_values) > 0:
        for idx, irr in enumerate(irr_values):
            st.metric(f"IRR {idx+1}" if len(irr_values) > 1 else "IRR",
                     f"{irr*100:.2f}%")
    else:
        st.warning("No IRR found. The cash flows may not have a solution.")

with right_col:
    # Create range of discount rates for plotting
    rate_range = np.linspace(0, 0.35, 300)  # 0% to 35%
    npv_values = [calculate_npv(r, cash_flows) for r in rate_range]

    # Create the plot
    fig, ax = plt.subplots(figsize=(7, 4))

    # Plot NPV curve
    ax.plot(rate_range * 100, npv_values, linewidth=2, color='#1f77b4', label='NPV')

    # Add horizontal line at y=0
    ax.axhline(y=0, color='black', linestyle='--', linewidth=1, alpha=0.5)

    # Mark IRR points (where NPV = 0)
    if len(irr_values) > 0:
        for irr in irr_values:
            if 0 <= irr <= 0.35:  # Only plot if in visible range
                ax.plot(irr * 100, 0, 'ro', markersize=10,
                       label=f'IRR = {irr*100:.2f}%', zorder=5)

    # Formatting
    ax.set_xlabel('Discount Rate (%)', fontsize=9, fontweight='bold')
    ax.set_ylabel('Net Present Value ($)', fontsize=9, fontweight='bold')
    ax.set_title('NPV as a Function of Discount Rate', fontsize=10, fontweight='bold')
    ax.grid(True, alpha=0.3)
    ax.set_xlim(0, 35)
    ax.tick_params(axis='both', which='major', labelsize=8)
    ax.legend(fontsize=7, loc='best')

    # Format y-axis to show dollar signs
    ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))

    # Display the plot
    st.pyplot(fig)

# Explanation section
with st.expander("Understanding IRR"):
    st.markdown("""
    ### What is IRR?

    The Internal Rate of Return represents the "break-even" discount rate for an investment:
    - If your required rate of return is **less than the IRR**, the investment has **positive NPV** → Accept
    - If your required rate of return is **greater than the IRR**, the investment has **negative NPV** → Reject
    - At the IRR, you're indifferent (NPV = 0)

    ### Key Points:

    1. **Multiple IRRs**: Some cash flow patterns can have multiple IRRs (you'll see multiple dots where the curve crosses zero)
    2. **No IRR**: Some cash flows may not have an IRR at all
    3. **Decision Rule**: Generally, accept projects where IRR > required return

    ### Interpreting the Graph:

    - The curve shows how NPV changes as you vary the discount rate
    - Red dots mark where NPV = 0 (these are the IRR values)
    - When the curve is above zero, NPV is positive at that discount rate
    - When the curve is below zero, NPV is negative at that discount rate
    """)
