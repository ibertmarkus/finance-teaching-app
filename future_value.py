import streamlit as st
import numpy as np
import matplotlib.pyplot as plt

# Set page configuration
st.set_page_config(page_title="Future Value", layout="wide")

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
st.title("Future Value: FV = PV × (1+r)^t")
st.write("If I invest PV dollars today at an interest rate r, how many dollars will I have after t years?")

# Create two main columns: inputs on left, plot on right
left_col, right_col = st.columns([1, 2])

with left_col:
    st.subheader("Parameters")

    # Scenario 1
    st.markdown("**Scenario 1**")
    principal_1 = st.number_input("Initial Investment ($)", min_value=0.0, max_value=1000000.0, value=100.0, step=10.0, format="%.2f", key="p1")
    interest_rate_1 = st.number_input("Annual Interest Rate (%)", min_value=0.0, max_value=100.0, value=5.0, step=0.5, format="%.2f", key="r1")
    time_period_1 = st.number_input("Investment Period (years)", min_value=1, max_value=100, value=15, step=1, key="t1")

    r1 = interest_rate_1 / 100
    final_value_1 = principal_1 * (1 + r1) ** time_period_1
    st.metric("Future Value", f"${final_value_1:,.2f}")

    # Scenario 2
    st.markdown("---")
    st.markdown("**Scenario 2 (Optional)**")
    principal_2 = st.number_input("Initial Investment ($)", min_value=0.0, max_value=1000000.0, value=0.0, step=10.0, format="%.2f", key="p2")
    interest_rate_2 = st.number_input("Annual Interest Rate (%)", min_value=0.0, max_value=100.0, value=7.0, step=0.5, format="%.2f", key="r2")
    time_period_2 = st.number_input("Investment Period (years)", min_value=1, max_value=100, value=15, step=1, key="t2")

    if principal_2 > 0:
        r2 = interest_rate_2 / 100
        final_value_2 = principal_2 * (1 + r2) ** time_period_2
        st.metric("Future Value", f"${final_value_2:,.2f}")

    # Scenario 3
    st.markdown("---")
    st.markdown("**Scenario 3 (Optional)**")
    principal_3 = st.number_input("Initial Investment ($)", min_value=0.0, max_value=1000000.0, value=0.0, step=10.0, format="%.2f", key="p3")
    interest_rate_3 = st.number_input("Annual Interest Rate (%)", min_value=0.0, max_value=100.0, value=10.0, step=0.5, format="%.2f", key="r3")
    time_period_3 = st.number_input("Investment Period (years)", min_value=1, max_value=100, value=15, step=1, key="t3")

    if principal_3 > 0:
        r3 = interest_rate_3 / 100
        final_value_3 = principal_3 * (1 + r3) ** time_period_3
        st.metric("Future Value", f"${final_value_3:,.2f}")

with right_col:
    # Determine max time period for x-axis
    max_time = max(time_period_1, time_period_2 if principal_2 > 0 else 0, time_period_3 if principal_3 > 0 else 0)
    years_all = np.arange(0, max_time + 1)

    # Create the plot
    fig, ax = plt.subplots(figsize=(7, 4))
    colors = ['#1f77b4', '#ff7f0e', '#2ca02c']

    # Plot Scenario 1
    years_1 = np.arange(0, time_period_1 + 1)
    future_values_1 = principal_1 * (1 + r1) ** years_1
    ax.plot(years_1, future_values_1, linewidth=1.5, color=colors[0], marker='o', markersize=3,
            label=f'Scenario 1: ${principal_1:,.0f} @ {interest_rate_1}%')

    # Plot Scenario 2 if active
    if principal_2 > 0:
        years_2 = np.arange(0, time_period_2 + 1)
        future_values_2 = principal_2 * (1 + r2) ** years_2
        ax.plot(years_2, future_values_2, linewidth=1.5, color=colors[1], marker='o', markersize=3,
                label=f'Scenario 2: ${principal_2:,.0f} @ {interest_rate_2}%')

    # Plot Scenario 3 if active
    if principal_3 > 0:
        years_3 = np.arange(0, time_period_3 + 1)
        future_values_3 = principal_3 * (1 + r3) ** years_3
        ax.plot(years_3, future_values_3, linewidth=1.5, color=colors[2], marker='o', markersize=3,
                label=f'Scenario 3: ${principal_3:,.0f} @ {interest_rate_3}%')

    # Formatting
    ax.set_xlabel('Time (years)', fontsize=9, fontweight='bold')
    ax.set_ylabel('Future Value ($)', fontsize=9, fontweight='bold')
    ax.set_title('Future Value Growth Comparison', fontsize=10, fontweight='bold')
    ax.grid(True, alpha=0.3)
    ax.set_xlim(0, max_time)

    # Use MaxNLocator to prevent x-axis label overlap
    from matplotlib.ticker import MaxNLocator
    ax.xaxis.set_major_locator(MaxNLocator(integer=True, nbins=15))

    ax.tick_params(axis='both', which='major', labelsize=8)
    ax.legend(fontsize=7, loc='best')

    # Format y-axis to show dollar signs
    ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))

    # Display the plot
    st.pyplot(fig)

# Optional: Show the data table (Scenario 1 only)
with st.expander("View Year-by-Year Details (Scenario 1)"):
    import pandas as pd

    # Calculate components for each year
    simple_interest_principal = principal_1 * r1
    growth_from_prev = [0] + [future_values_1[i] - future_values_1[i-1] for i in range(1, len(future_values_1))]
    simple_interest = [0] + [simple_interest_principal] * (len(years_1) - 1)
    interest_on_interest = [growth_from_prev[i] - simple_interest[i] for i in range(len(years_1))]

    df = pd.DataFrame({
        'Year': years_1,
        'Future Value': [f'${fv:,.2f}' for fv in future_values_1],
        'Growth from Previous Year': [f'${g:,.2f}' for g in growth_from_prev],
        'Simple Interest': [f'${si:,.2f}' for si in simple_interest],
        'Interest on Previous Interest': [f'${ii:,.2f}' for ii in interest_on_interest]
    })
    st.dataframe(df, width='stretch', hide_index=True)
