import streamlit as st
import numpy as np
import matplotlib.pyplot as plt

# Set page configuration
st.set_page_config(page_title="Annuity Formula", layout="wide")

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
st.title("Annuity Formula")
st.write("Calculate the present value of receiving C dollars at the end of each period for t periods")

# Display the formula prominently
st.markdown("### Formula")
st.latex(r"PV = C \times \left(\frac{1}{r} - \frac{1}{r(1+r)^t}\right)")
st.write("where C = cash flow per period, r = interest rate per period, t = number of periods")

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

    periods = st.number_input(
        "Number of Periods",
        min_value=1,
        max_value=100,
        value=10,
        step=1
    )

    # Convert interest rate from percentage to decimal
    r = interest_rate / 100

    # Calculate present value using the annuity formula
    pv_annuity = cash_flow * (1/r - 1/(r * (1 + r)**periods))

    st.markdown("---")
    st.metric("Present Value of Annuity", f"${pv_annuity:,.2f}")

with right_col:
    # Create timeline showing cash flows and their present values
    period_numbers = np.arange(1, periods + 1)

    # Calculate present value of each individual cash flow
    pv_each_cashflow = cash_flow / (1 + r)**period_numbers

    # Create the plot
    fig, ax = plt.subplots(figsize=(7, 4))

    # Plot bars for each cash flow's present value
    ax.bar(period_numbers, pv_each_cashflow, alpha=0.7, color='#2ca02c', edgecolor='black', linewidth=0.5)

    # Add a horizontal line showing the cash flow amount
    ax.axhline(y=cash_flow, color='red', linestyle='--', linewidth=1.5, label=f'Cash Flow = ${cash_flow:,.2f}', alpha=0.7)

    # Formatting
    ax.set_xlabel('Period', fontsize=9, fontweight='bold')
    ax.set_ylabel('Present Value ($)', fontsize=9, fontweight='bold')
    ax.set_title(f'Present Value of Each ${cash_flow:,.2f} Payment',
                 fontsize=10, fontweight='bold')
    ax.grid(True, alpha=0.3, axis='y')
    ax.set_xlim(0, periods + 1)

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
st.latex(f"PV = {cash_flow:,.2f} \\times \\left(\\frac{{1}}{{{r:.4f}}} - \\frac{{1}}{{{r:.4f} \\times (1+{r:.4f})^{{{periods}}}}}\\right)")
st.latex(f"PV = \\frac{{{cash_flow:,.2f}}}{{(1+{r:.4f})}} + \\frac{{{cash_flow:,.2f}}}{{(1+{r:.4f})^2}} + \\cdots + \\frac{{{cash_flow:,.2f}}}{{(1+{r:.4f})^{{{periods}}}}}")
st.latex(f"PV = \\${pv_annuity:,.2f}")

# Show detailed breakdown
with st.expander("View Period-by-Period Breakdown"):
    import pandas as pd

    period_numbers = np.arange(1, periods + 1)
    pv_each = cash_flow / (1 + r)**period_numbers
    cumulative_pv = np.cumsum(pv_each)

    df = pd.DataFrame({
        'Period': period_numbers,
        'Cash Flow': [f'${cash_flow:,.2f}'] * periods,
        'PV of This Payment': [f'${pv:,.2f}' for pv in pv_each],
        'Cumulative PV': [f'${cpv:,.2f}' for cpv in cumulative_pv]
    })
    st.dataframe(df, width='stretch', hide_index=True)

# Derivation section
with st.expander("Mathematical Derivation (Geometric Series)"):
    st.markdown("### Derivation of the Annuity Formula")

    st.write("The present value of an annuity is the sum of the present values of each individual payment:")
    st.write("**Equation (1):**")
    st.latex(r"PV = \frac{C}{1+r} + \frac{C}{(1+r)^2} + \frac{C}{(1+r)^3} + \cdots + \frac{C}{(1+r)^t}")

    st.write("Now multiply both sides by $(1+r)$:")
    st.write("**Equation (2):**")
    st.latex(r"PV(1+r) = C + \frac{C}{1+r} + \frac{C}{(1+r)^2} + \cdots + \frac{C}{(1+r)^{t-1}}")

    st.write("Subtract Equation (1) from Equation (2). Notice that most terms cancel:")
    st.latex(r"PV(1+r) - PV = C - \frac{C}{(1+r)^t}")

    st.write("Factor out PV on the left side:")
    st.latex(r"PV \cdot r = C - \frac{C}{(1+r)^t}")

    st.write("Factor out C on the right side:")
    st.latex(r"PV \cdot r = C\left(1 - \frac{1}{(1+r)^t}\right)")

    st.write("Divide both sides by r:")
    st.latex(r"PV = \frac{C}{r}\left(1 - \frac{1}{(1+r)^t}\right)")

    st.write("Distribute the division by r:")
    st.latex(r"PV = C \times \left(\frac{1}{r} - \frac{1}{r(1+r)^t}\right)")

    st.markdown("**This is our annuity formula!**")
