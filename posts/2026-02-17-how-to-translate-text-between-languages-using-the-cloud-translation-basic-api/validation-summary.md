# Validation Summary: How to Translate Text Between Languages Using the Cloud Translation Basic API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Translation Basic API (v2)
- Google Cloud Translation Advanced API (v3)
- Google Cloud CLI
- Python
- google-cloud-translate Python client library
- google.api_core exceptions

## Sources Consulted
- Google Cloud Translation Basic text translation documentation: https://docs.cloud.google.com/translate/docs/translate-text
- Google Cloud Translation Python client reference: https://docs.cloud.google.com/python/docs/reference/translate/latest/client
- Google Cloud Translation supported languages documentation: https://docs.cloud.google.com/translate/docs/list-supported-languages
- Google Cloud Translation pricing documentation: https://cloud.google.com/translate/pricing
- Google Cloud Translation quotas and limits documentation: https://docs.cloud.google.com/translate/quotas
- google-api-core exceptions reference: https://googleapis.dev/python/google-api-core/latest/_modules/google/api_core/exceptions.html

## Issues Found
- The quota section said the default quota is 600,000 characters per minute. Google Cloud's current quotas documentation lists 6,000,000 characters per minute for the general model, so the post was updated to use the current value.
- The error-handling example only handled `ResourceExhausted` for quota errors. Google Cloud Translation quotas documentation states quota exceedance returns a 403 response, and google-api-core maps 403 responses to `Forbidden`, so the example now also catches `exceptions.Forbidden`.

## Review Notes
The Python client methods used in the examples (`translate`, `detect_language`, and `get_languages`) match the current `google.cloud.translate_v2.Client` reference. The `format_="html"` argument is also current for specifying HTML input. Pricing remains accurate for Cloud Translation Basic at $20 per million characters after the monthly free credit tier. The middleware imports `lru_cache` but does not use it; this is harmless but could be cleaned up in a future style pass.
