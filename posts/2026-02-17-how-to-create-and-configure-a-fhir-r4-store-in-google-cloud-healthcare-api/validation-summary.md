# Validation Summary: How to Create and Configure a FHIR R4 Store in Google Cloud Healthcare API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Healthcare API
- FHIR R4
- Google Cloud CLI
- Google API Python client
- Google Auth
- Pub/Sub notifications
- IAM
- BigQuery export

## Sources Consulted
- Google Cloud Healthcare API: Creating and managing FHIR stores: https://docs.cloud.google.com/healthcare-api/docs/how-tos/fhir
- Google Cloud Healthcare API REST reference for FhirStore: https://docs.cloud.google.com/healthcare-api/docs/reference/rest/v1/projects.locations.datasets.fhirStores
- Google Cloud SDK reference for `gcloud healthcare fhir-stores create`: https://docs.cloud.google.com/sdk/gcloud/reference/healthcare/fhir-stores/create
- Google Cloud Healthcare API: Searching for FHIR resources: https://docs.cloud.google.com/healthcare-api/docs/how-tos/fhir-search
- Google Cloud Healthcare API REST reference for `projects.locations.datasets.fhirStores.fhir.search`: https://docs.cloud.google.com/healthcare-api/docs/reference/rest/v1/projects.locations.datasets.fhirStores.fhir/search
- Google Cloud Healthcare API sample: Create Encounter resource: https://docs.cloud.google.com/healthcare-api/docs/samples/healthcare-create-encounter
- Google Cloud Healthcare API: Batch export FHIR resources to BigQuery: https://docs.cloud.google.com/healthcare-api/docs/how-tos/fhir-export-bigquery
- Google Cloud Healthcare API: SMART on FHIR: https://docs.cloud.google.com/healthcare-api/docs/smart-on-fhir
- Cloud Healthcare API v1 discovery document: https://healthcare.googleapis.com/$discovery/rest?version=v1

## Issues Found
- The post described FHIR R4 as the current standard version. Google Cloud Healthcare API documentation now lists R5 as supported as well, so the wording was changed to describe R4 as a widely adopted stable version.
- The prerequisites installed `google-cloud-healthcare`, but the post's examples use the discovery-based Google API Python client. Updated the dependency command to install `google-api-python-client`, `google-auth`, and `requests`.
- The `gcloud healthcare fhir-stores create` example used `--disable-referential-integrity=false`, but the official CLI exposes `--disable-referential-integrity` as a presence-only flag. Removed the flag so referential integrity remains enabled by default.
- The Python FHIR store creation sample used a `google.cloud.healthcare_v1` GAPIC-style API surface that is not the documented Healthcare API Python pattern. Replaced it with the official discovery-client pattern and REST field names such as `enableUpdateCreate`, `notificationConfigs`, and `defaultSearchHandlingStrict`.
- The create-resource examples did not set the required `application/fhir+json` content type header. Added the header before executing Patient and Observation create requests.
- The search examples built search parameters but never sent them to the API. Reworked them to use authenticated HTTP GET requests with `family`, `given`, `subject`, and optional LOINC `code` query parameters.
- The prose said resources are validated against FHIR R4 profiles generally. Updated it to clarify that base FHIR rules apply and profile validation depends on configured profiles.
- The SMART on FHIR wording implied simple built-in authentication. Adjusted it to "SMART on FHIR access patterns" to avoid overstating the configuration required.

## Review Notes
- The environment did not have `gcloud` installed, so CLI validation was performed against the official Google Cloud SDK reference instead of local `--help` output.
- Python fenced code blocks were checked with `ast.parse` and all parsed successfully after edits.
