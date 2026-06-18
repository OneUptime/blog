# Validation Summary: How to Create Coverage SLOs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Site Reliability Engineering
- Service Level Indicators and Service Level Objectives
- Error budgets and burn-rate alerting
- Python
- SQL-style source/destination reconciliation
- Search indexing and search retrieval validation
- Mermaid flowcharts

## Sources Consulted
- Google SRE Workbook, "Implementing SLOs": https://sre.google/workbook/implementing-slos/
- Google SRE Workbook, "Alerting on SLOs": https://sre.google/workbook/alerting-on-slos/
- Google SRE Book, "Service Level Objectives": https://sre.google/sre-book/service-level-objectives/
- Python documentation, `random.sample`: https://docs.python.org/3/library/random.html#random.sample
- Python documentation, `datetime` and `timedelta`: https://docs.python.org/3/library/datetime.html
- Python documentation, `sqlite3` parameter substitution: https://docs.python.org/3/library/sqlite3.html
- Mermaid flowchart syntax documentation: https://mermaid.ai/open-source/syntax/flowchart.html

## Issues Found
- The watermark tracking example used `datetime.now()` without importing `datetime`. Added `from datetime import datetime`.
- The watermark tracking example advanced `expected_sequence` to `sequence_number + 1` for every event, which could move the pointer backward if a duplicate or out-of-order event arrived. Changed the update to use `max(self.expected_sequence, sequence_number + 1)`.
- The sampling validation example could divide by zero when `source_ids` was empty, and `random.sample` requires a sequence in current Python versions. Converted `source_ids` to a list and returned 100% coverage for the no-items-expected case.
- The index coverage, error budget, and burn-rate examples used `datetime` or `timedelta` without imports. Added the relevant imports to those snippets.
- The search coverage example could divide by zero when there were no active products in the sample query. Changed the calculation to return 100% coverage when no products are expected.
- The error budget example calculated consumed budget only as the gap below the SLO target, which undercounted consumed budget when coverage was above the target but below 100%. Changed consumed budget to use actual incompleteness: `100 - avg_coverage`.
- The error budget example could report negative remaining budget and negative budget health after overspending. Capped remaining budget at zero.
- The index coverage examples counted all active indexed products even though the expected set excluded products newer than the freshness cutoff. Added a matching destination-side source timestamp filter, capped coverage at 100%, and prevented negative gap values.
- The burn-rate example hardcoded a 30-day budget window even though the `CoverageErrorBudget` class accepts a configurable window. Changed the calculation to use the configured window and skip non-degrading measurements.
- The practical implementation section described itself as a complete standalone example while referencing helper classes defined earlier in the post. Adjusted the wording to make that dependency explicit.
- The practical implementation emitted `remaining_percent` as `coverage.error_budget_remaining`, even though the log message and metric name imply remaining budget health. Updated the metric to emit `budget_health`.

## Review Notes
The examples use generic database, search, storage, and metrics clients, so API-specific method signatures cannot be validated against one concrete vendor SDK. The snippets are syntactically valid Python and now handle the main edge cases that would otherwise produce misleading SLI or error-budget results.
