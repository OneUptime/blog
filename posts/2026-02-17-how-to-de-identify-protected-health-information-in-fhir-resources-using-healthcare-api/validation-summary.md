# Validation Summary: How to De-Identify Protected Health Information in FHIR Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Healthcare API
- FHIR R4 stores
- FHIR store de-identification
- Google Cloud CLI
- REST API requests with curl
- Python Cloud Healthcare client library
- HIPAA/PHI de-identification concepts

## Sources Consulted
- Google Cloud Healthcare API: De-identifying FHIR data: https://docs.cloud.google.com/healthcare-api/docs/how-tos/fhir-deidentify
- Google Cloud Healthcare API REST reference: fhirStores.deidentify: https://docs.cloud.google.com/healthcare-api/docs/reference/rest/v1/projects.locations.datasets.fhirStores/deidentify
- Google Cloud Healthcare API REST reference: DeidentifyConfig: https://docs.cloud.google.com/healthcare-api/docs/reference/rest/v1beta1/DeidentifyConfig
- Google Cloud Healthcare API RPC reference: google.cloud.healthcare.v1.deidentify: https://docs.cloud.google.com/healthcare-api/docs/reference/rpc/google.cloud.healthcare.v1/deidentify
- Google Cloud CLI reference: gcloud healthcare fhir-stores create: https://docs.cloud.google.com/sdk/gcloud/reference/healthcare/fhir-stores/create
- Google Cloud CLI reference: gcloud healthcare operations describe: https://docs.cloud.google.com/sdk/gcloud/reference/healthcare/operations/describe

## Issues Found
- The destination FHIR store creation command omitted `--enable-update-create`, which is required for writing de-identified FHIR output to the destination store. Added the flag and normalized the version value to `r4`, matching the Google Cloud CLI examples.
- The prerequisites only mentioned `healthcare.fhirStores.deidentify`. Added the required `healthcare.fhirResources.update` permission on the destination store.
- The first configuration snippet claimed to shift dates and hash identifiers, but it only configured FHIR defaults and text redaction. Updated the explanation to match the snippet.
- The detailed configuration placed `dateShiftConfig` at the wrong level and nested `cryptoHashConfig` incorrectly. Moved date shifting and hashing into `text.transformations`, which is where `DateShiftConfig` and `CryptoHashConfig` belong.
- The detailed FHIR paths used field names that were less aligned with the Healthcare API examples. Updated them to use supported FHIR type/path forms such as `Patient.HumanName`, `Patient.Address`, `Patient.ContactPoint`, and `Patient.Identifier`.
- The curl de-identification command mixed `-d @deidentify-config.json` with a separate `--data` body and tried to interpolate JSON in a way that would not produce a valid request body. Replaced it with a proper `deidentify-request.json` wrapper containing `destinationStore` and `config`, then used `--data @deidentify-request.json`.
- The Python example accepted `config_file` but never loaded it or attached it to the request. Added JSON loading and `google.protobuf.json_format.ParseDict` to build a `DeidentifyConfig` and pass it to `DeidentifyFhirStoreRequest`.
- The crypto-key section described the key as only for date shifting and as suitable for a crypto hash config. Updated it to explain consistent date shifting and crypto hashing, and noted that Cloud KMS wrapped keys are recommended for production while raw base64 AES keys are still supported.

## Review Notes
Google's documentation states that de-identification uses rules-based and heuristic methods and is not guaranteed to satisfy a specific legal or regulatory requirement by itself. The post already advises verification and broader compliance controls, which is appropriate.
