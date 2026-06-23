# Validation Summary: Understanding MTTR, MTTD, MTBF and the Complete Reliability Lexicon

## Status
validated

## Post Type
Reference / Guide — a glossary-style explainer of SRE reliability metrics with worked Python formula examples.

## Technologies Covered
- Site Reliability Engineering (SRE) metrics: MTTR, MTTD, MTTF, MTBF
- Error budgets and SLI/SLO/SLA concepts
- DORA metrics: Change Failure Rate, Deployment Frequency, Lead Time for Changes
- Recovery Rate
- Python (used only as pseudocode/illustrative formulas)

## Sources Consulted
- Google SRE Book — Service Level Objectives & Error Budgets (https://sre.google/sre-book/service-level-objectives/)
- Reliability engineering definitions of MTTR/MTTF/MTBF and availability (Availability = MTBF / (MTBF + MTTR); MTBF = MTTF + MTTR) — standard reliability theory
- DORA / Google Cloud "Four Keys" change failure rate guidance (https://cloud.google.com/blog/products/devops-sre/using-the-four-keys-to-measure-your-devops-performance)
- 2023/2024 DORA State of DevOps reporting on change failure rate distributions

## Issues Found
No technical issues found. All formulas and arithmetic were verified:
- MTTR: 170 / 5 = 34 min ✓
- MTTD: 25 / 4 = 6.25 min ✓
- MTBF: 720 / 3 = 240 hours ✓
- Availability: 240 / 241 = 0.99585 ≈ 99.59% ✓
- Error Budget: 43,200 × 0.001 = 43.2 min/month ✓
- Allowed failures: 10,000,000 × 0.001 = 10,000 ✓
- Change Failure Rate: 12 / 200 = 6% ✓
- Recovery Rate: 22 / 25 = 88% ✓

The core reliability relationships are all correct and consistent with standard reliability engineering: MTBF = MTTF + MTTR, Availability = MTBF / (MTBF + MTTR), Error Budget = 100% − SLO. The Python snippets are syntactically valid (correct use of `sum()`, integer/float arithmetic, `_` digit separators).

## Review Notes
- The DORA change failure rate buckets shown in the post (Elite 0–15%, High 16–30%, Medium 31–45%, Low >45%) are a simplified pedagogical representation. Published DORA reports cluster the numbers differently year-to-year (e.g., elite teams typically ~0–5%, "good" under ~15%, and low performers often in the 40–64% range, with tier distributions shifting between the 2022/2023/2024 reports). The post's own narrative claims — "high-performing teams below 15%" and "elite performers below 5%" — align well with real DORA guidance, so the simplified buckets are directionally reasonable rather than wrong. Left as-is to preserve author intent; worth revisiting if the post is updated to cite a specific DORA report year.
- MTTF is precisely defined for non-repairable systems; the post's phrasing ("applies to non-repairable systems or the time between repairs for repairable systems") is a common, acceptable simplification.
- The "Total incident duration = MTTD + MTTR (roughly)" note is correctly hedged with "roughly," which is appropriate since real incident timelines also include time-to-acknowledge and mitigation phases.
- MTTR benchmark buckets and "sub-5-minute" / "under 30 minutes" figures are presented as illustrative industry benchmarks rather than sourced absolutes, which is reasonable for a conceptual guide.
