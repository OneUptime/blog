# Validation Summary: How to Import FHIR Bundles into Google Cloud Healthcare API from Cloud Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Healthcare API
- Healthcare API FHIR stores
- FHIR R4 resources and bundles
- Cloud Storage
- Google Cloud CLI
- Python
- google-api-python-client
- google-auth

## Sources Consulted
- Google Cloud Healthcare API: Import and export FHIR resources using Cloud Storage: https://docs.cloud.google.com/healthcare-api/docs/how-tos/fhir-import-export
- Google Cloud Healthcare API: Method `fhirStores.import`: https://docs.cloud.google.com/healthcare-api/docs/reference/rest/v1/projects.locations.datasets.fhirStores/import
- Google Cloud Healthcare API: FHIR import options: https://docs.cloud.google.com/healthcare-api/docs/concepts/fhir-import
- Google Cloud Healthcare API: Managing FHIR resources using FHIR bundles: https://docs.cloud.google.com/healthcare-api/docs/how-tos/fhir-bundles
- Google Cloud Healthcare API: Searching for FHIR resources: https://docs.cloud.google.com/healthcare-api/docs/how-tos/fhir-search
- Google Cloud Healthcare API: Viewing error logs in Cloud Logging: https://docs.cloud.google.com/healthcare-api/docs/how-tos/logging
- Google Cloud SDK reference: `gcloud healthcare fhir-stores import gcs`: https://docs.cloud.google.com/sdk/gcloud/reference/healthcare/fhir-stores/import/gcs
- Google API Python Client discovery document for Healthcare API v1: https://healthcare.googleapis.com/$discovery/rest?version=v1

## Issues Found
- The post said the API accepts three bulk import formats and described a single pretty-printed JSON bundle as `BUNDLE`. Updated the format list to include `BUNDLE_PRETTY` and `RESOURCE_PRETTY`, and corrected the single-file bundle import command to use `BUNDLE_PRETTY`.
- The generated import resources did not include client-supplied `id` values. Added stable synthetic Patient IDs because `fhirStores.import` requires resource IDs in the input.
- The bundle example claimed conditional create would prevent duplicates on re-import. Updated it because `fhirStores.import` ignores `Bundle.entry.request`; transaction and conditional semantics apply to `executeBundle`, not Cloud Storage import.
- The Python dependency command included `google-cloud-healthcare`, but the examples use the discovery-based Google API Python client and google-auth. Updated the install command accordingly.
- The import error handling section said failed resources are written to a GCS error location and read counters from `successCount` / `failureCount`. Updated it to use operation metadata `counter.success` / `counter.failure` and point to Cloud Logging via `logsUrl`.
- The FHIR search example passed `resourceType` in the request body. Updated it to pass `resourceType` as a query parameter with an empty POST body, matching the API method signature.
- The `executeBundle` Python example used the discovery client with a plain bundle object, but the API expects a FHIR JSON body at the FHIR store `/fhir` endpoint. Updated it to use an authorized HTTP session with `application/fhir+json`.
- The performance tips said to disable referential integrity during import and to import resources in dependency order. Updated those notes because `fhirStores.import` does not enforce referential integrity and treats bundles as collections of resources.
- The conclusion suggested FHIR store Pub/Sub notifications for bulk imports. Updated it because `fhirStores.import` does not send FHIR store Pub/Sub notifications.

## Review Notes
The Google Cloud CLI was not installed locally in the review environment, so CLI validation was performed against the official Google Cloud SDK reference instead of local `gcloud --help`. Python snippets were syntax-checked with `ast.parse`.
