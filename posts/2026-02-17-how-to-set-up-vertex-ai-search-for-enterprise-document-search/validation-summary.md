# Validation Summary: How to Set Up Vertex AI Search for Enterprise Document Search

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud
- Vertex AI Search / Agent Search
- Discovery Engine API
- Cloud Storage
- Cloud Scheduler
- Python client library for Discovery Engine
- Search widget HTML integration

## Sources Consulted
- Google Cloud Vertex AI Search / Agent Search overview: https://docs.cloud.google.com/generative-ai-app-builder/docs
- Create a data store Python sample: https://docs.cloud.google.com/generative-ai-app-builder/docs/samples/genappbuilder-create-data-store
- Import documents from Cloud Storage Python sample: https://docs.cloud.google.com/generative-ai-app-builder/docs/samples/genappbuilder-import-documents-gcs
- Create a search app Python sample: https://docs.cloud.google.com/generative-ai-app-builder/docs/samples/genappbuilder-create-engine
- Get search results documentation and Python sample: https://docs.cloud.google.com/generative-ai-app-builder/docs/preview-search-results
- Get snippets and extracted content documentation: https://docs.cloud.google.com/generative-ai-app-builder/docs/snippets
- Get search summaries documentation: https://docs.cloud.google.com/generative-ai-app-builder/docs/get-search-summaries
- Answer generation model versions and lifecycle: https://docs.cloud.google.com/generative-ai-app-builder/docs/answer-generation-models
- Add the search widget to a web page: https://docs.cloud.google.com/generative-ai-app-builder/docs/add-widget
- gcloud services enable reference: https://cloud.google.com/sdk/gcloud/reference/services/enable
- gcloud scheduler jobs create http reference: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http

## Issues Found
- The prerequisites described the API as "Vertex AI Search API enabled (previously Discovery Engine API)" and enabled `aiplatform.googleapis.com`. Current Google documentation describes Vertex AI Search as using the Discovery Engine API behind the scenes and the setup docs refer to enabling Vertex AI Search (Discovery Engine). I changed the prerequisite to "Vertex AI Search (Discovery Engine) API and Cloud Storage API enabled" and changed the second enable command to `storage.googleapis.com`, which matches the Cloud Storage document import flow.
- The summary example specified `gemini-1.5-flash-001/answer_gen/v1`. Current answer-generation model documentation lists `stable`, `preview`, `gemini-2.5-flash/answer_gen/v1`, and `gemini-2.0-flash-001/answer_gen/v1`; the 1.5 model is no longer listed. I changed the example to `stable` so it follows the documented default selector and avoids pinning a discontinued or unsupported version.

## Review Notes
- Google is renaming Vertex AI Search to Agent Search in current documentation, but the Discovery Engine API endpoint and Python client names remain valid.
- Some official Python samples use `ClientOptions(api_endpoint=...)` for non-global locations. The post's examples use `location="global"`, so the snippets remain technically valid for the shown configuration.
