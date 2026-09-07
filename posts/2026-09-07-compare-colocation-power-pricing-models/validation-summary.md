# Validation Summary: How to Compare Colocation Power Pricing Models

## Status
validated

## Post Type
Technical guide. The post includes electrical capacity formulas, energy calculations, metering boundaries, and cost-model implementation details, so it qualifies for technical review despite containing no executable software code.

## Technologies Covered
- Colocation power pricing: reserved amperage, metered energy, and flat-rate capacity
- Single-phase and balanced three-phase AC power, true power factor, kW, and kVA
- Redundant A/B circuits, continuous loading, and contractual draw caps
- Energy metering, rack PDUs, and power usage effectiveness (PUE)
- Interval load data, demand charges, utilization, and cost modeling

## Sources Consulted
- Schneider Electric, transformer kVA formulas: https://www.se.com/us/en/faqs/FA101600/ — checked single-phase and three-phase calculations and the kW/power-factor relationship.
- Equinix, Power: https://docs.equinix.com/colocation/about/colo-power/ — checked draw caps, regional circuit allowances, power factor, and redundant circuit capacity.
- U.S. Department of Energy, Evaluating Your Utility Rate Options: https://www.energy.gov/cmei/femp/evaluating-your-utility-rate-options — checked interval data, fixed charges, energy charges, demand charges, and time-varying rates.
- ENERGY STAR Portfolio Manager glossary: https://portfoliomanager.energystar.gov/pm/glossary — checked IT energy units, measurement locations, and PUE definitions.
- ENERGY STAR, Data Center Metrics Task Force Recommendations V2: https://www.energystar.gov/ia/partners/prod_development/downloads/Data_Center_Metrics_Task_Force_Recommendations_V2.pdf — checked metering boundaries and distribution-loss distinctions.
- Schneider Electric, Guidance for Calculation of Efficiency (PUE) in Data Centers: https://www.apc.com/us/en/download/document/SPD_SNIS-7E6LKL_EN/ — verified the document landing page and its redirect to Schneider Electric; PUE substance was cross-checked against ENERGY STAR guidance.
- ENERGY STAR, Select a Sustainable Colocation Facility: https://www.energystar.gov/products/data_center_equipment/16-more-ways-cut-energy-waste-data-center/select-sustainable — checked facility services, efficiency, and cooling considerations.
- Author profile: https://www.github.com/nawazdhandala — verified that the link resolves to the named GitHub profile.

## Issues Found
1. The break-even instruction compared only the metered plan's variable bill with the fixed alternative. This excludes the capacity or cabinet charges acknowledged earlier in the post and can misstate the crossover. Changed it to compare total bills, including fixed and applicable demand or overage charges, for the same period and load scenario.
2. The annual cost formula implicitly assumed unchanged monthly charges and one energy rate. That is insufficient for time-of-use, seasonal, or changing rates. Qualified the formula for constant charges and a single rate, and added the required summation of applicable fixed charges and interval energy costs when rates vary. Retained the existing escalator guidance.

## Review Notes
- Confirmed the arithmetic: 4.0 kW multiplied by 730 hours equals 2,920 kWh. The example uses an illustrative month length; the preceding formula correctly specifies actual billing-month hours.
- Electrical equations are correct with the stated balanced three-phase and true-power-factor assumptions. Circuit loading and A/B capacity depend on the provider's allowance and failover requirements, as the post explains.
- Published PUE describes facility efficiency and does not independently establish a tenant billing multiplier. Meter boundaries and contractual billing terms remain essential.
- Pricing preferences are conditional comparisons, not universal claims that a particular model is cheapest. Actual contract terms determine minimums, enforcement, redundancy billing, and upgrade costs.
- All cited URLs resolved to relevant resources, including normal redirects. The older metering guidance remains applicable to the definitions used here; no current market-price or historical market-growth claims were adopted from it.
- No executable code, CLI commands, configurations, or software-version claims required runtime tests. Reviewed the formulas dimensionally and checked the numerical example directly.
