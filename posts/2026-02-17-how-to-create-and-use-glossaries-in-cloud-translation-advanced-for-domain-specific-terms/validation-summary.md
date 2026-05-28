# Validation Summary: How to Create and Use Glossaries in Cloud Translation Advanced for

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Translation Advanced API v3
- Cloud Translation glossaries
- Google Cloud Storage
- Google Cloud CLI and gsutil
- Python client library for Cloud Translation

## Sources Consulted
- Google Cloud Translation documentation: Creating and using glossaries (Advanced): https://docs.cloud.google.com/translate/docs/advanced/glossary
- Cloud Translation REST reference for glossary resources: https://docs.cloud.google.com/translate/docs/reference/rest/v3/projects.locations.glossaries
- Cloud Translation REST reference for glossary patch/update: https://docs.cloud.google.com/translate/docs/reference/rest/v3/projects.locations.glossaries/patch
- Cloud Translation Python client reference for TranslationServiceClient: https://docs.cloud.google.com/python/docs/reference/translate/latest/google.cloud.translate_v3.services.translation_service.TranslationServiceClient
- Cloud Translation Python client reference for TranslateTextGlossaryConfig: https://docs.cloud.google.com/python/docs/reference/translate/latest/google.cloud.translate_v3.types.TranslateTextGlossaryConfig
- Google Cloud sample: Translate text with a glossary: https://docs.cloud.google.com/translate/docs/samples/translate-v3-translate-text-with-glossary
- Google Cloud SDK reference for gcloud services enable: https://docs.cloud.google.com/sdk/gcloud/reference/services/enable

## Issues Found
- The unidirectional CSV glossary example incorrectly included a header row (`en,es`). Google Cloud documentation specifies that unidirectional CSV and TSV glossary files must not include a header row; the language pair is provided when creating the glossary resource. Removed the header row.
- The file-format description said glossaries are defined in CSV or TSV files. Updated it to note that unidirectional glossaries can use CSV, TSV, or TMX, while equivalent term set glossaries use CSV.
- The "How Glossaries Work" section described the API as translating first and then replacing terms in the translated result. Adjusted the explanation to avoid asserting an internal post-processing algorithm and to match the documented behavior that Cloud Translation applies glossary terminology during translation.
- The update section claimed the API does not support in-place updates and required delete-and-recreate. Current Cloud Translation supports updating a glossary with `patch`/`update_glossary` to change the display name or replace the input file. Replaced the example with `client.update_glossary` and an `input_config` field mask.

## Review Notes
The remaining Python examples use current Cloud Translation v3 client APIs and match the documented resource naming pattern for glossaries. The post uses `gsutil`, which remains valid, though future updates could consider `gcloud storage` commands if the blog standardizes on the newer Google Cloud CLI storage surface.
