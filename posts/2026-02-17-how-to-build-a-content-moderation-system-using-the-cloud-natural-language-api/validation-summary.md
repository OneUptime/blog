# Validation Summary: How to Build a Content Moderation System Using the Cloud Natural Language API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Natural Language API
- Cloud Natural Language API text moderation, sentiment analysis, content classification, and entity sentiment analysis
- Google Cloud Run
- Google Cloud Firestore
- Python
- Flask
- Docker
- gcloud CLI

## Sources Consulted
- Google Cloud Natural Language API: Moderate text: https://docs.cloud.google.com/natural-language/docs/moderating-text
- Google Cloud Natural Language API REST reference: documents.moderateText: https://docs.cloud.google.com/natural-language/docs/reference/rest/v1/documents/moderateText
- Google Cloud Natural Language API: Classifying content: https://docs.cloud.google.com/natural-language/docs/classifying-text
- Google Cloud Natural Language API: Content categories: https://docs.cloud.google.com/natural-language/docs/categories
- Google Cloud Python client reference: LanguageServiceClient: https://docs.cloud.google.com/python/docs/reference/language/latest/google.cloud.language_v1.services.language_service.LanguageServiceClient
- Google Cloud Run: Deploy services from source code: https://docs.cloud.google.com/run/docs/deploying-source-code
- Google Cloud SDK reference: gcloud run deploy: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Firestore query documentation: https://cloud.google.com/firestore/docs/query-data/queries
- Google Cloud Python client reference: Firestore FieldFilter: https://docs.cloud.google.com/python/docs/reference/firestore/latest/google.cloud.firestore_v1.base_query.FieldFilter

## Issues Found
- The post described a moderation system but did not use the Cloud Natural Language API's dedicated `moderate_text` method. I added text moderation to the feature description, the Flask analysis pipeline, and the moderation decision logic so harmful and sensitive category scores are used directly.
- The setup command installed only `google-cloud-language` and `flask`, but later snippets use Firestore and Requests. I updated the install command to include `google-cloud-firestore` and `requests`.
- The content classification note said the 20-token minimum was unconditional. I clarified that the documented minimum applies to the V1 classification model.
- The Flask endpoint assumed `request.get_json()` always returned a dictionary. I changed it to `request.get_json(silent=True) or {}` so malformed or missing JSON returns the intended 400 response instead of raising an exception.
- The Firestore snippet used positional `where()` arguments. I updated it to the current documented `where(filter=FieldFilter(...))` form.
- The limitations section said the Natural Language API is not a dedicated moderation tool. I revised that wording because the API now has text moderation; the corrected note says moderation results are one signal and still need evaluation and human review.
- The conclusion omitted text moderation from the list of combined signals. I updated it to match the corrected implementation.

## Review Notes
- The Python snippets were syntax-checked locally with `python3 compile()`. Runtime API calls were not executed because this environment does not have Google Cloud credentials or the Google client libraries installed.
- The local environment does not have `gcloud` installed, so Cloud Run command validation was performed against official Google Cloud SDK documentation.
