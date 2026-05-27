# Validation Summary: How to Set Up Dataplex Data Zones and Assets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Dataplex Universal Catalog
- Google Cloud CLI
- Cloud Storage
- BigQuery
- Google Cloud IAM
- Python Dataplex client library
- Dataplex REST API

## Sources Consulted
- Google Cloud CLI reference for `gcloud dataplex zones create`: https://docs.cloud.google.com/sdk/gcloud/reference/dataplex/zones/create
- Google Cloud CLI reference for `gcloud dataplex assets create`: https://docs.cloud.google.com/sdk/gcloud/reference/dataplex/assets/create
- Google Cloud CLI reference for `gcloud dataplex`: https://docs.cloud.google.com/sdk/gcloud/reference/dataplex
- Dataplex Universal Catalog RPC reference: https://docs.cloud.google.com/dataplex/docs/reference/rpc/google.cloud.dataplex.v1
- Dataplex entities REST API reference: https://cloud.google.com/dataplex/docs/reference/rest/v1/projects.locations.lakes.zones.entities/list
- Dataplex IAM roles documentation: https://docs.cloud.google.com/dataplex/docs/iam-roles
- Python Dataplex client reference for zone resource specifications: https://docs.cloud.google.com/python/docs/reference/dataplex/latest/google.cloud.dataplex_v1.types.Zone.ResourceSpec

## Issues Found
- Cloud Storage asset creation commands omitted the required `--resource-read-access-mode` flag. Added `--resource-read-access-mode=DIRECT` to both Cloud Storage asset examples.
- The post used `gcloud dataplex entities list`, but the current `gcloud dataplex` command groups do not include an `entities` group. Replaced the example with the official REST API endpoint for listing entities in a zone.
- The IAM example used `roles/dataplex.dataEditor`, which is not a Dataplex predefined data role. Replaced it with `roles/dataplex.dataOwner` to match the text describing full access.
- The Python asset creation example did not set `read_access_mode` for Cloud Storage assets. Added `dataplex_v1.Asset.ResourceSpec.AccessMode.DIRECT` for GCS assets.
- The curated-zone comment implied all curated resources enforce schema and format requirements. Adjusted it to match the Dataplex rule that curated structured Cloud Storage data must use supported formats and Hive-compatible layouts.

## Review Notes
The machine did not have `gcloud` installed, so CLI validation was performed against the current official Google Cloud CLI reference instead of local `--help` output.
