# Validation Summary: How to Perform Sentiment Analysis on Customer Reviews Using the Cloud Natural

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Natural Language API
- Google Cloud SDK / gcloud CLI
- Python
- google-cloud-language Python client library
- Sentiment analysis
- Entity sentiment analysis

## Sources Consulted
- Google Cloud Natural Language API: Analyzing Sentiment: https://docs.cloud.google.com/natural-language/docs/analyzing-sentiment
- Google Cloud Natural Language API Basics: https://docs.cloud.google.com/natural-language/docs/basics
- Google Cloud Natural Language API Language Support: https://docs.cloud.google.com/natural-language/docs/languages
- Google Cloud Natural Language API: Analyzing Entity Sentiment: https://docs.cloud.google.com/natural-language/docs/analyzing-entity-sentiment
- Google Cloud SDK `gcloud services enable` reference: https://docs.cloud.google.com/sdk/gcloud/reference/services/enable
- Google Cloud Natural Language Python client reference, `LanguageServiceClient`: https://docs.cloud.google.com/python/docs/reference/language/latest/google.cloud.language_v1.services.language_service.LanguageServiceClient
- Google Cloud Natural Language Python client installation docs: https://cloud.google.com/python/docs/reference/language/latest
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The introduction described the Natural Language API result as a "confidence score." The API returns a sentiment score and magnitude, not a confidence score. Changed the wording to "sentiment score."
- The batch processing print example formatted `r.get("score", "N/A")` with `:+.2f`, which would raise an error for records returned from the exception path. Added a `score_text` variable so error records print `N/A` safely.
- The dashboard example used `datetime.utcnow()`, which is deprecated in current Python. Replaced it with `datetime.now(timezone.utc).isoformat()` and imported `timezone`.

## Review Notes
- `python3` syntax validation passed for all six Python code snippets.
- The local environment did not have `gcloud` installed, so the CLI command was verified against the official Google Cloud SDK reference instead of local `--help` output.
- The post uses `language_v1`, which remains documented in the current Google Cloud Python client reference. Google Cloud's Natural Language examples increasingly show `language_v2`, but `language_v1` is still a valid API surface.
