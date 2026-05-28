# Validation Summary: How to Extract Named Entities from Text Using the Cloud Natural Language API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Natural Language API
- Google Cloud CLI
- Python
- google-cloud-language Python client library
- Named Entity Recognition
- Entity sentiment analysis

## Sources Consulted
- Google Cloud Natural Language API: Analyzing Entities: https://docs.cloud.google.com/natural-language/docs/analyzing-entities
- Google Cloud Natural Language API REST v1 Entity reference: https://docs.cloud.google.com/natural-language/docs/reference/rest/v1/Entity
- Google Cloud Natural Language API REST v1 documents.analyzeEntities reference: https://docs.cloud.google.com/natural-language/docs/reference/rest/v1/documents/analyzeEntities
- Google Cloud Natural Language API REST v1 EncodingType reference: https://docs.cloud.google.com/natural-language/docs/reference/rest/v1/EncodingType
- Google Cloud Natural Language Python client LanguageServiceClient reference: https://docs.cloud.google.com/python/docs/reference/language/latest/google.cloud.language_v1.services.language_service.LanguageServiceClient
- Google Cloud SDK gcloud services enable reference: https://docs.cloud.google.com/sdk/gcloud/reference/services/enable

## Issues Found
- The code examples called `analyze_entities` and `analyze_entity_sentiment` without an `encoding_type`, while the post describes mention position offsets. Official EncodingType documentation states that when no encoding type is specified, encoding-dependent fields such as `beginOffset` are set to `-1`. Updated the API requests to pass `language_v1.EncodingType.UTF32`, which matches Python's native text encoding guidance in the official documentation.

## Review Notes
The examples use the supported `google.cloud.language_v1` Python client APIs and current `gcloud services enable language.googleapis.com` command. The current Google guide also shows `language_v2` examples, but the v1 client and REST references remain documented and valid.
