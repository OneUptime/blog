# Validation Summary: How to Use the google-cloud-translate Python Library to Build a Translation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Translation API
- google-cloud-translate Python client library
- FastAPI
- Pydantic
- Docker
- Cloud Build
- Artifact Registry
- Cloud Run
- Google Cloud CLI

## Sources Consulted
- Google Cloud Translation setup documentation: https://docs.cloud.google.com/translate/docs/setup
- Google Cloud Translation Basic text translation documentation: https://docs.cloud.google.com/translate/docs/basic/translating-text
- Google Cloud Translation language support documentation: https://docs.cloud.google.com/translate/docs/languages
- google-cloud-translate v2 Python Client reference: https://docs.cloud.google.com/python/docs/reference/translate/latest/google.cloud.translate_v2.client.Client
- google-cloud-translate v3 glossary documentation: https://cloud.google.com/translate/docs/advanced/glossary
- TranslateTextGlossaryConfig Python reference: https://docs.cloud.google.com/python/docs/reference/translate/latest/google.cloud.translate_v3.types.TranslateTextGlossaryConfig
- FastAPI request body documentation: https://fastapi.tiangolo.com/tutorial/body/
- Pydantic field documentation: https://docs.pydantic.dev/2.11/api/fields/
- Cloud Build gcloud builds submit reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/submit
- Artifact Registry repository creation documentation: https://docs.cloud.google.com/artifact-registry/docs/repositories/create-repos
- Artifact Registry transition from Container Registry documentation: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Cloud Run gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Cloud Run maximum instances documentation: https://cloud.google.com/run/docs/configuring/max-instances
- Cloud Run memory limits documentation: https://cloud.google.com/run/docs/configuring/services/memory-limits

## Issues Found
- The basic translation example showed an unaccented Spanish output. Updated the sample output to a more plausible Cloud Translation-style translation with inverted punctuation and accents.
- The FastAPI `/detect` endpoint used `Field` directly for a standalone request body parameter. Updated it to use `Body`, which is the FastAPI helper documented for non-model request body parameters.
- The V3 glossary translation example omitted `source_language_code`. Added a `source_language` parameter and passed it in the request so the glossary language pair is explicit, matching the official glossary sample.
- The deploy commands used a `gcr.io` image path. Container Registry is deprecated and writing to Container Registry is unavailable, so the example now creates an Artifact Registry Docker repository and builds/deploys a `pkg.dev` image path.
- The Cloud Run deploy command used `--max-instances`, which sets a revision-level maximum. Updated it to `--max` to match current Cloud Run service-level maximum instance guidance.
- Removed unused `os` and `lru_cache` imports from the snippets.

## Review Notes
The post remains technically valid as a concise tutorial. In a production version, the service should also document authentication, IAM roles for Cloud Translation and Artifact Registry, API error mapping, request size limits, and a shared cache such as Redis or Memorystore for multi-instance Cloud Run deployments.
