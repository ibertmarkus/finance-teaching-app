import streamlit as st
import numpy as np
import matplotlib.pyplot as plt

# Set page configuration
st.set_page_config(page_title="Perpetuity Formula", layout="wide")

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
st.title("Perpetuity Formula")
st.write("Calculate the present value of receiving C dollars at the end of each period forever")

# Display the formula prominently
st.markdown("### Formula")
st.latex(r"PV = \frac{C}{r}")
st.write("where C = cash flow per period, r = interest rate per period")

# Create two main columns: inputs on left, plot on right
left_col, right_col = st.columns([1, 2])

with left_col:
    st.subheader("Parameters")
    cash_flow = st.number_input(
        "Cash Flow per Period ($)",
        min_value=0.0,
        max_value=100000.0,
        value=100.0,
        step=10.0,
        format="%.2f"
    )

    interest_rate = st.number_input(
        "Interest Rate per Period (%)",
        min_value=0.01,
        max_value=100.0,
        value=5.0,
        step=0.5,
        format="%.2f"
    )

    max_periods = st.number_input(
        "Periods to Display (for visualization)",
        min_value=10,
        max_value=200,
        value=50,
        step=10,
        help="Shows how the cumulative PV approaches the perpetuity value"
    )

    # Convert interest rate from percentage to decimal
    r = interest_rate / 100

    # Calculate present value using the perpetuity formula
    pv_perpetuity = cash_flow / r

    st.markdown("---")
    st.metric("Present Value of Perpetuity", f"${pv_perpetuity:,.2f}")

with right_col:
    # Show how cumulative PV approaches the perpetuity value
    period_numbers = np.arange(1, max_periods + 1)

    # Calculate present value of each individual cash flow
    pv_each_cashflow = cash_flow / (1 + r)**period_numbers

    # Calculate cumulative present value
    cumulative_pv = np.cumsum(pv_each_cashflow)

    # Create the plot
    fig, ax = plt.subplots(figsize=(7, 4))

    # Plot cumulative PV approaching perpetuity value
    ax.plot(period_numbers, cumulative_pv, linewidth=1.5, color='#ff7f0e', marker='o', markersize=2)

    # Add a horizontal line showing the perpetuity value
    ax.axhline(y=pv_perpetuity, color='red', linestyle='--', linewidth=1.5,
               label=f'Perpetuity Value = ${pv_perpetuity:,.2f}', alpha=0.7)

    # Formatting
    ax.set_xlabel('Number of Periods', fontsize=9, fontweight='bold')
    ax.set_ylabel('Cumulative Present Value ($)', fontsize=9, fontweight='bold')
    ax.set_title(f'Cumulative PV Approaching Perpetuity Value',
                 fontsize=10, fontweight='bold')
    ax.grid(True, alpha=0.3)
    ax.set_xlim(0, max_periods)

    # Use MaxNLocator to prevent x-axis label overlap
    from matplotlib.ticker import MaxNLocator
    ax.xaxis.set_major_locator(MaxNLocator(integer=True, nbins=15))

    ax.tick_params(axis='both', which='major', labelsize=8)
    ax.legend(fontsize=8)

    # Format y-axis to show dollar signs
    ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))

    # Display the plot
    st.pyplot(fig)

# Show the calculation
st.markdown("### Calculation")
st.latex(f"PV = \\frac{{{cash_flow:,.2f}}}{{{r:.4f}}}")
st.latex(f"PV = \\frac{{{cash_flow:,.2f}}}{{(1+{r:.4f})}} + \\frac{{{cash_flow:,.2f}}}{{(1+{r:.4f})^2}} + \\frac{{{cash_flow:,.2f}}}{{(1+{r:.4f})^3}} + \\cdots")
st.latex(f"PV = \\${pv_perpetuity:,.2f}")

# Show detailed breakdown
with st.expander("View Period-by-Period Breakdown"):
    import pandas as pd

    display_periods = min(50, max_periods)  # Limit table to first 50 periods
    period_numbers_table = np.arange(1, display_periods + 1)
    pv_each = cash_flow / (1 + r)**period_numbers_table
    cumulative_pv_table = np.cumsum(pv_each)
    remaining_pv = pv_perpetuity - cumulative_pv_table
    percent_of_total = (cumulative_pv_table / pv_perpetuity) * 100

    df = pd.DataFrame({
        'Period': period_numbers_table,
        'PV of This Payment': [f'${pv:,.2f}' for pv in pv_each],
        'Cumulative PV': [f'${cpv:,.2f}' for cpv in cumulative_pv_table],
        'Remaining PV': [f'${rpv:,.2f}' for rpv in remaining_pv],
        '% of Perpetuity': [f'{pct:.2f}%' for pct in percent_of_total]
    })
    st.dataframe(df, width='stretch', hide_index=True)

    if max_periods > display_periods:
        st.write(f"*Showing first {display_periods} periods only*")

# Derivation section
with st.expander("Mathematical Derivation (Limit of Annuity Formula)"):
    st.markdown("### Derivation of the Perpetuity Formula")

    st.write("A perpetuity is simply an annuity that lasts forever (t → ∞). Starting with the annuity formula:")
    st.latex(r"PV_{annuity} = C \times \left(\frac{1}{r} - \frac{1}{r(1+r)^t}\right)")

    st.write("Take the limit as t approaches infinity:")
    st.latex(r"\lim_{t \to \infty} PV_{annuity} = C \times \left(\frac{1}{r} - \lim_{t \to \infty}\frac{1}{r(1+r)^t}\right)")

    st.write("Since (1+r) > 1 when r > 0, as t → ∞, the term (1+r)^t → ∞, which means:")
    st.latex(r"\lim_{t \to \infty}\frac{1}{r(1+r)^t} = 0")

    st.write("Therefore:")
    st.latex(r"PV_{perpetuity} = C \times \left(\frac{1}{r} - 0\right) = \frac{C}{r}")

    st.markdown("**This is our perpetuity formula!**")

    st.write("**Intuition:** Each additional payment gets discounted more and more, so even though there are infinite payments, they sum to a finite present value.")
