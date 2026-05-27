# Validation Summary: How to Run Batch Translation Jobs Using Cloud Translation Advanced

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Translation Advanced API v3
- Cloud Translation batch text translation
- Cloud Storage
- Google Cloud CLI and gsutil
- Python
- google-cloud-translate Python client library
- google-cloud-storage Python client library

## Sources Consulted
- Google Cloud Translation batch requests documentation: https://docs.cloud.google.com/translate/docs/advanced/batch-translation
- Cloud Translation batchTranslateText REST reference: https://docs.cloud.google.com/translate/docs/reference/rest/v3/projects.locations/batchTranslateText
- Cloud Translation supported formats documentation: https://cloud.google.com/translate/docs/supported-formats
- Google Cloud Translation Python client reference for TranslationServiceClient: https://docs.cloud.google.com/python/docs/reference/translate/latest/google.cloud.translate_v3.services.translation_service.TranslationServiceClient
- Google Cloud Translation Python client library overview: https://cloud.google.com/translate/docs/reference/libraries/v3/python

## Issues Found
- The post incorrectly stated that each input file can be up to 10MB. Updated the limit to match Cloud Translation batch text documentation: up to 100 files, up to 10 target languages, up to 100M Unicode codepoints total, with UTF-8 input.
- The prerequisite commands did not include Application Default Credentials setup, which the Python client libraries require in a local environment. Added `gcloud auth application-default login`.
- The basic batch translation code built unused per-language output configurations and described them as per-target output destinations. Cloud Translation batch text accepts a single `output_config`. Removed the unused code and passed `target_languages` directly.
- The basic text example used a wildcard that could match HTML files while specifying `mime_type="text/plain"`. Updated the example input URI to target `.txt` files.
- The result-download example assumed translated files would appear under a target-language prefix such as `es/`. Cloud Translation writes an `index.csv` and target-language-specific output file names under the configured output prefix. Updated the downloader to skip index/error files and filter by target language in generated file names.
- The downloader could fail when downloading a file directly under the prefix because `os.path.dirname(local_path)` can be an empty string. Updated the directory creation logic to handle that case.
- The localization pipeline uploaded both `.txt` and `.html` files but submitted a single `text/plain` input configuration. Cloud Translation requires `.html` files to use `text/html` or an empty MIME type. Updated the pipeline to upload text and HTML files under separate prefixes and submit separate input configs with the correct MIME types.

## Review Notes
The examples were syntax-checked locally by parsing all Python code blocks. Live API execution was not performed because the local environment does not have Google Cloud credentials or the Google Cloud client libraries installed.
