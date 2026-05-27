# Validation Summary: How to Use the Cloud Data Fusion Wrangler for Data Cleansing and Transformation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Data Fusion
- Cloud Data Fusion Wrangler
- Wrangler CLI directives
- BigQuery
- Cloud Storage
- ETL pipelines

## Sources Consulted
- Google Cloud Data Fusion Wrangler overview: https://docs.cloud.google.com/data-fusion/docs/concepts/wrangler-overview
- Google Cloud Data Fusion Wrangler command-line directives: https://docs.cloud.google.com/data-fusion/docs/concepts/wrangler-cli-directives
- Google Cloud Data Fusion filter data in Wrangler: https://docs.cloud.google.com/data-fusion/docs/how-to/wrangler-filter-data
- Google Cloud Data Fusion fill null or empty cells in Wrangler: https://docs.cloud.google.com/data-fusion/docs/how-to/wrangler-fill-null-or-empty-cells
- Google Cloud Data Fusion extract data from fields in Wrangler: https://docs.cloud.google.com/data-fusion/docs/how-to/wrangler-extract-fields
- Google Cloud Data Fusion export and import pipelines: https://docs.cloud.google.com/data-fusion/docs/how-to/exporting-pipelines
- CDAP Wrangler directive migration reference: https://cdap.atlassian.net/wiki/spaces/DOCS/pages/559677521/Directive+migration
- CDAP Wrangler Parse as Datetime directive: https://cdap.atlassian.net/wiki/spaces/DOCS/pages/1128988735/Parse+as+Datetime+directive
- CDAP Wrangler Split to Columns directive: https://cdap.atlassian.net/wiki/spaces/DOCS/pages/382042365/Split+to+Columns
- CDAP Wrangler Trimming Spaces directive: https://cdap.atlassian.net/wiki/spaces/DOCS/pages/382042441/Trimming+Spaces

## Issues Found
- Corrected Wrangler CLI examples to use current directive syntax with `:column` references and removed inline `//` comments from directive snippets, because those comments are not Wrangler recipe directives.
- Replaced the missing-value filter example with `filter-rows-on empty-or-null-columns :customer_id`, which matches the supported `filter-rows-on` form for removing null or empty rows.
- Changed the date parsing example from `parse-as-datetime` with a date-only pattern to `parse-as-simple-date`, because `parse-as-datetime` requires both date and time components.
- Updated the Wrangler navigation wording to reflect that users open Cloud Data Fusion Studio from the Google Cloud console before selecting Wrangler.
- Updated the data loading wording to emphasize Wrangler connections to sources such as Cloud Storage, BigQuery, and databases, rather than implying direct arbitrary file upload in the current Cloud Data Fusion Wrangler workflow.
- Clarified that the null-fill example applies before converting the field to a numeric type, since `fill-null-or-empty` uses a string replacement value.
- Corrected the preview sample wording to say Wrangler typically previews 1,000 rows, matching the current Google Cloud documentation.
- Replaced the claim that pipeline YAML is generated with the accurate statement that exported Cloud Data Fusion pipeline configurations are JSON.

## Review Notes
The post is technically relevant and remains a practical Wrangler tutorial after the corrections. Some UI labels can vary by Cloud Data Fusion version, but the corrected workflow and directive examples align with current official documentation.
