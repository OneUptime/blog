# Validation Summary: How to Build a Supply Chain Analytics Dashboard with Supply Chain Twin

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Supply Chain Twin
- BigQuery SQL
- BigQuery views and materialized views
- Looker
- LookML views, models, dashboards, and derived tables
- Looker API 4.0 Python SDK scheduled plans

## Sources Consulted
- Google Cloud Supply Chain and Logistics solutions: https://cloud.google.com/solutions/supply-chain-twin
- BigQuery materialized view creation documentation: https://cloud.google.com/bigquery/docs/materialized-views-create
- Looker LookML dashboard parameters documentation: https://cloud.google.com/looker/docs/reference/param-lookml-dashboard
- Looker derived_table parameter documentation: https://cloud.google.com/looker/docs/reference/param-view-derived-table
- Looker datagroup parameter documentation: https://cloud.google.com/looker/docs/reference/param-model-datagroup
- Looker datagroup_trigger parameter documentation: https://cloud.google.com/looker/docs/reference/param-view-datagroup-trigger
- Looker API WriteScheduledPlan reference: https://cloud.google.com/looker/docs/reference/looker-api/latest/types/WriteScheduledPlan
- Looker API create_scheduled_plan reference: https://cloud.google.com/looker/docs/reference/looker-api/latest/methods/ScheduledPlan/create_scheduled_plan
- Looker SDK codegen repository: https://github.com/looker-open-source/sdk-codegen

## Issues Found
- The current inventory SQL used `CREATE MATERIALIZED VIEW` for a non-aggregated joined row-level view. Changed it to `CREATE OR REPLACE VIEW` and updated the LookML `sql_table_name` reference, because the example is modeling current inventory rows rather than a BigQuery materialized aggregate.
- The dashboard filters were defined but not wired to any dashboard elements. Added `model`, `explore`, and `field` metadata to the filters and added `listen` mappings to each element so the filters affect the relevant inventory and shipment queries.
- The dashboard used a date filter against inventory data without an inventory time field in the LookML view. Added a `last_updated` dimension group to make `inventory.last_updated_date` available.
- The shipment average measures averaged already aggregated averages, which can produce incorrect rollups. Changed them to weighted averages using `total_shipments`.
- The derived table referenced `datagroup_trigger: daily_refresh` without defining the datagroup in the model snippet. Added a `daily_refresh` datagroup with `interval_trigger: "24 hours"`.
- The Looker API scheduled plan used a numeric `dashboard_id`, while the API reference defines `dashboard_id` as a string. Changed the example value to `"123"`.
- The wrap-up referred only to materialized views after changing the inventory example to a standard view. Updated the sentence to refer to views and materialized views.

## Review Notes
The table and field names remain illustrative because Supply Chain Twin deployments commonly adapt their BigQuery schema to source systems and business processes. The Looker API example still assumes the user has configured SDK credentials and has scheduling permissions on the Looker instance.
