# Validation Summary: Does Showback Change Engineering Behavior? How to Measure Its Impact

## Status
validated

## Post Type
Technical guide and measurement methodology

## Technologies Covered
- Cloud showback and FinOps operating practices
- FinOps Practice Operations, Usage Optimization, Unit Economics, and Reporting & Analytics capabilities
- FinOps Open Cost and Usage Specification (FOCUS) cost data
- Cloud cost allocation, effective cost, billed cost, and unit-cost metrics
- Quasi-experimental measurement methods, including matched comparisons, difference-in-differences, staggered rollouts, and interrupted time series

## Sources Consulted
- [FinOps Foundation: FinOps Practice Operations](https://www.finops.org/framework/capabilities/finops-practice-operations/)
- [FinOps Foundation: Usage Optimization](https://www.finops.org/framework/capabilities/usage-optimization/)
- [FinOps Foundation: Unit Economics](https://www.finops.org/framework/capabilities/unit-economics/)
- [FinOps Foundation: Reporting & Analytics](https://www.finops.org/framework/capabilities/reporting-analytics/)
- [FOCUS Specification](https://focus.finops.org/focus-specification/)
- [FOCUS Specification v1.4](https://focus.finops.org/focus-specification/v1-4/)
- [World Bank: Revisiting the Difference-in-Differences Parallel Trends Assumption](https://blogs.worldbank.org/en/impactevaluations/revisiting-difference-differences-parallel-trends-assumption-part-i-pre-trend)
- [CDC: How Do You Know Which Health Care Effectiveness Research You Can Trust?](https://www.cdc.gov/pcd/issues/2015/15_0187.htm)

## Issues Found
No technical issues found.

## Review Notes
The post contains no executable code, CLI commands, or configuration snippets, but it provides substantive technical implementation guidance for measuring showback outcomes and therefore received a full technical review. The simple two-period difference-in-differences equation is correct as presented. More complex staggered, multi-period rollouts can require cohort-aware estimators when treatment effects vary, but the post appropriately labels its equation as simple, recommends checking pre-launch trends, and cautions against treating the result as proof. The FOCUS discussion is accurate for the current v1.4 specification: Effective Cost supports analysis after discounts and recognition or amortization of covering charges, while Billed Cost reflects invoiced charges and supports reconciliation.
