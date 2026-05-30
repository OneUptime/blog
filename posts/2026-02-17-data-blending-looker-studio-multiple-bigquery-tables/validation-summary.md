# Validation Summary: How to Set Up Data Blending in Looker Studio from Multiple BigQuery Tables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Looker Studio / Data Studio
- BigQuery
- Data blending
- SQL joins
- GoogleSQL

## Sources Consulted
- Google Cloud Looker Studio documentation: How blends work in Data Studio - https://docs.cloud.google.com/looker/docs/studio/how-blends-work-in-looker-studio
- Google Cloud Looker Studio documentation: Create, edit, and manage blends - https://docs.cloud.google.com/looker/docs/studio/create-edit-and-manage-blends
- Google Cloud Looker Studio documentation: Blending tips and advanced concepts - https://docs.cloud.google.com/looker/docs/studio/blending-tips-and-advanced-concepts
- Google Cloud Looker Studio documentation: Connect to Google BigQuery - https://docs.cloud.google.com/looker/docs/studio/connect-to-google-bigquery
- BigQuery GoogleSQL query syntax reference - https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax
- BigQuery GoogleSQL data definition language reference - https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- BigQuery GoogleSQL mathematical functions reference - https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/mathematical_functions

## Issues Found
- The post described Looker Studio blending as essentially a left join. Current official documentation states that blends support inner, left outer, right outer, full outer, and cross joins. Updated the explanation to say left outer joins are common for simple blends, but the configured join operator controls behavior.
- The post listed multi-column joins as unsupported. Official documentation says join conditions can be a field or fields, and only equality comparisons are supported. Updated the limitation to focus on non-equality and custom SQL join logic instead.
- The post implied join field names must match exactly. Official documentation allows different field names as long as the data matches. Updated the configuration guidance accordingly.
- The post said additional sources are left-joined to the first source. Official documentation describes ordered join configurations between neighboring tables. Updated the three-source explanation to describe left-to-right join configurations and left outer behavior only when that operator is selected.
- The post attributed inflated row counts mainly to forgotten join keys causing cross joins. Official documentation says cross joins are an explicit join operator that does not use a join condition, and many-to-many matches can also increase rows. Updated the pitfall wording.
- The post oversimplified filter behavior by saying chart-level filters affect both sources. Official documentation distinguishes pre-blend table filters, post-blend chart filters, and inherited filters that may apply pre- or post-blend depending on compatibility. Updated the filter explanation.

## Review Notes
The BigQuery SQL snippets use valid GoogleSQL patterns, including `CREATE OR REPLACE VIEW`, `LEFT JOIN`, `COALESCE`, and `SAFE_DIVIDE`. The example source-table `SELECT` statements are illustrative queries rather than complete `CREATE TABLE` statements.
