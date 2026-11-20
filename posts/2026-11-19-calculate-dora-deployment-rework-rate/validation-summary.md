# Validation Summary: Compute DORA Deployment Rework Rate from Deployment, Incident, and Hotfix Events

## Status

validated

## Post Type

Technical guide with a worked metric calculation and executable SQLite query.

## Technologies Covered

- DORA deployment rework rate and change failure rate
- DevOps deployment, incident, hotfix, and rollback event classification
- SQLite SQL: common table expressions, correlated EXISTS, aggregate FILTER, CASE, ROUND, and NULLIF
- Deployment identity deduplication and UTC timestamp reporting windows
- OneUptime incident identifiers as warehouse mapping keys

## Sources Consulted

- [DORA software delivery performance metrics](https://dora.dev/guides/dora-metrics/) — metric definitions, application/service scope, and interpretation alongside other metrics.
- [DORA metric history](https://dora.dev/insights/dora-metrics-history/) — introduction of deployment rework rate in 2024.
- [SQLite CREATE TABLE and primary keys](https://www.sqlite.org/lang_createtable.html#the_primary_key) — explicit NOT NULL constraints for ordinary text primary keys and default collation.
- [SQLite date and time documentation](https://www.sqlite.org/lang_datefunc.html) — text timestamp storage and UTC representations.
- [SQLite expressions](https://www.sqlite.org/lang_expr.html#the_exists_operator) — EXISTS, correlated subqueries, Boolean expressions, and CASE.
- [SQLite aggregate functions](https://www.sqlite.org/lang_aggfunc.html) — COUNT and FILTER behavior.
- [SQLite scalar functions](https://sqlite.org/lang_corefunc.html) — ROUND and NULLIF.
- [SQLite 3.30.0 release notes](https://sqlite.org/releaselog/3_30_0.html) — aggregate FILTER support introduced on October 4, 2019.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified the author link resolves to the intended profile.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. The post contains technical implementation details and qualifies for technical validation.
- The rework numerator is distinct from the failure numerator. The stated calculations, 3/6 = 50% and 1/6 = 16.67% rounded, are correct.
- The rollback, configuration release, progressive rollout, and publication policies are explicitly identified as implementation choices. They are not presented as a universal DORA event specification.
- Extracted the SQL directly from README.md and executed it against an in-memory SQLite 3.54.1 database, using tables matching the documented model and flag constraints. All nine checks passed: empty cohort; six-deployment example; duplicate/multiple incident links and planned repair exclusion; pending rework classification; pending provisional planned classification; window/service/environment exclusions; unconfirmed repair exclusion; staging incident exclusion; and a fully reviewed cohort with no qualifying repairs.
- The worked example returned (6, 3, 0, 50.0). An empty cohort returned (0, 0, 0, NULL). Pending classifications suppressed the percentage as described. Duplicate links did not multiply deployment counts.
- Boundary checks included a deployment exactly at the inclusive November 1 start, an excluded deployment immediately before the start, and an excluded deployment exactly at the November 8 end. Uniform fixed-width UTC text preserves chronological ordering for these comparisons.
- The query requires SQLite 3.30.0 or later because it uses aggregate FILTER. No deprecated SQL constructs were identified. The compact schema is clearly presented as a model, not executable CREATE TABLE statements.
- The null-key warning is appropriate for the ordinary SQLite tables described; INTEGER PRIMARY KEY, STRICT, and WITHOUT ROWID tables have different implicit non-null behavior.
- Classification completeness depends on the ingestion/review process keeping rework_review_complete at 0 until evidence is sufficient. The query correctly applies this documented contract; it cannot independently establish incident causality or evidence completeness.
- All external links in the post resolved to the intended resources. The OneUptime reference describes an identifier mapping, not a product-specific API or automatic integration claim. There are no terminal commands or configuration snippets to validate.
