# Validation Summary: How to Create Calculated Fields and Custom Metrics in Looker Studio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Looker Studio calculated fields
- Looker Studio aggregation, conditional, date, text, and regex functions
- Looker Studio comparison metrics and running calculations
- BigQuery SQL views

## Sources Consulted
- Google Cloud Looker Studio calculated fields overview: https://cloud.google.com/looker/docs/studio/about-calculated-fields
- Google Cloud Looker Studio add/edit/troubleshoot calculated fields: https://cloud.google.com/looker/docs/studio/add-edit-and-troubleshoot-calculated-fields
- Google Cloud Looker Studio function list: https://cloud.google.com/looker/docs/studio/function-list
- Google Cloud Looker Studio `WEEKDAY` function: https://cloud.google.com/looker/docs/studio/weekday
- Google Cloud Looker Studio `DATE_DIFF` function: https://cloud.google.com/looker/docs/studio/datediff
- Google Cloud Looker Studio `DATETIME_DIFF` function: https://cloud.google.com/looker/docs/studio/datetimediff
- Google Cloud Looker Studio `FORMAT_DATETIME` function: https://cloud.google.com/looker/docs/studio/formatdatetime
- Google Cloud Looker Studio `CAST` function: https://cloud.google.com/looker/docs/studio/cast
- Google Cloud Looker Studio `LEFT_TEXT` function: https://cloud.google.com/looker/docs/studio/lefttext
- Google Cloud Looker Studio `SUM` function: https://cloud.google.com/looker/docs/studio/sum
- Google Cloud Looker Studio `REGEXP_MATCH` function: https://cloud.google.com/looker/docs/studio/regexpmatch
- Google Cloud Looker Studio `REGEXP_EXTRACT` function: https://cloud.google.com/looker/docs/studio/regexpextract
- Google Cloud Looker Studio regular expressions: https://cloud.google.com/looker/docs/studio/regular-expressions-in-looker-studio
- Google Cloud Looker Studio comparison metrics and running totals: https://cloud.google.com/looker/docs/studio/add-comparison-metrics-and-running-totals
- GoogleSQL `DATE_DIFF` reference for BigQuery: https://cloud.google.com/bigquery/docs/reference/standard-sql/date_functions#date_diff

## Issues Found
- Replaced `DATE_DIFF(CURRENT_DATE(), last_order_date)` with `DATETIME_DIFF(CURRENT_DATE(), last_order_date, DAY)`. Looker Studio documents `DATE_DIFF` as compatibility-mode only and recommends `DATETIME_DIFF` for current Date and Date & Time fields.
- Replaced the year-month label formula using unsupported `LPAD` with `FORMAT_DATETIME("%Y-%m", order_date)`, which is a supported Looker Studio date formatting function.
- Replaced `LEFT(city, 1)` with `LEFT_TEXT(city, 1)` because Looker Studio documents `LEFT_TEXT`, not `LEFT`, as the supported text function.
- Updated `REGEXP_MATCH` examples that intended substring or prefix matching. Looker Studio documents `REGEXP_MATCH` as matching the target value against the pattern, so the patterns now include `.*` or complete prefix patterns where needed.
- Updated the Chrome version extraction regex to match the full `user_agent` value while extracting the Chrome version group.
- Adjusted the performance wording from "run in the reporting layer, not in BigQuery" to "defined in the reporting layer, not in your BigQuery schema" to avoid implying exact execution placement that Looker Studio documentation does not state.

## Review Notes
The formulas are illustrative and assume fields such as `revenue`, `order_total`, and `request_id` are modeled with compatible numeric, date, or text types. For production dashboards, ratio fields should also consider divide-by-zero handling where denominators can be zero or null.
