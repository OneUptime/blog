# Validation Summary: How to Detect the Language of Text Using the Cloud Translation API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Translation API
- Cloud Translation Basic (v2)
- Cloud Translation Advanced (v3)
- Python
- Google Cloud Python client library

## Sources Consulted
- Google Cloud Translation language detection guide: https://cloud.google.com/translate/docs/detect-language
- Google Cloud Translation v2 detect REST reference: https://cloud.google.com/translate/docs/reference/rest/v2/detect
- Google Cloud Translation Python v2 Client reference: https://cloud.google.com/python/docs/reference/translate/latest/google.cloud.translate_v2.client.Client
- Google Cloud Translation language support documentation: https://cloud.google.com/translate/docs/languages

## Issues Found
- The post stated broadly that the API returns a confidence score. Updated this to clarify that v3 returns confidence, while v2 may include a deprecated confidence field that should not be used for routing or filtering decisions.
- The post described language codes as ISO 639-1, but Google documents that most codes conform to ISO 639 and some use BCP-47-style variants such as `zh-CN`. Updated the wording to "ISO 639 code".
- The v2 examples accessed `result["confidence"]` directly. The Python client documentation says the `confidence` key may not always be present, so the examples now check for the key before printing or returning it.
- The v2 router, filter, and distribution examples used confidence thresholds. Google recommends not basing decisions or thresholds on v2 `confidence`, so those threshold-based decisions were removed.
- The v3 Python sample was updated to match current official client-library style by importing `translate` from `google.cloud`, calling `detect_language` with keyword arguments, and using the documented `global` location.

## Review Notes
All Python code blocks were parsed with `ast.parse` using Python 3 after the edits. The examples still require normal Google Cloud setup, enabled Cloud Translation API, installed `google-cloud-translate`, and Application Default Credentials to run against the live service.
