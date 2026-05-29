# Validation Summary: How to Build a Content Moderation System with Vertex AI and Cloud Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud
- Cloud Functions / Cloud Run functions Gen 2
- Pub/Sub
- Eventarc
- Vertex AI Gemini
- Google Gen AI SDK for Python
- Firestore
- Python Functions Framework
- gcloud CLI

## Sources Consulted
- Google Cloud Functions / Cloud Run functions Pub/Sub CloudEvent sample: https://docs.cloud.google.com/functions/docs/samples/functions-cloudevent-pubsub
- Google Cloud Run functions deployment prerequisites: https://docs.cloud.google.com/run/docs/deploy-functions
- Google Cloud SDK `gcloud functions deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Vertex AI SDK migration guide for Google Gen AI SDK: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk
- Vertex AI structured output documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output
- Gemini 2.5 Flash model documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash
- Google Gen AI Python SDK reference: https://googleapis.github.io/python-genai/genai.html
- Vertex AI generative AI pricing: https://cloud.google.com/vertex-ai/generative-ai/pricing

## Issues Found
- The prerequisites did not enable several services required for Gen 2 / Cloud Run functions and Pub/Sub event triggers. Added `run.googleapis.com`, `eventarc.googleapis.com`, `artifactregistry.googleapis.com`, and `logging.googleapis.com`.
- The moderation example used `vertexai.generative_models.GenerativeModel`, which is deprecated and scheduled for removal after June 24, 2026. Updated the snippet to use the current Google Gen AI SDK with `genai.Client(vertexai=True, ...)`.
- The moderation code asked Gemini for JSON but parsed free-form text directly with `json.loads(response.text)`. Updated the call to request `application/json` with a response schema before parsing.
- The architecture and introduction mentioned image moderation, but the implementation only handles text and skips non-text content. Narrowed the post language and diagram to text content moderation.
- The storage function was described as listening to moderation decisions, but no deployment commands were provided for the decision topics. Added deployment commands for the approved, blocked, and review-needed topics.
- The performance section included precise throughput and latency numbers that could not be verified from official documentation and would vary by quota, concurrency, cold starts, and model behavior. Reworded those claims to describe the variables involved.

## Review Notes
Python code snippets were checked for syntax with `ast.parse`. The local environment did not have `gcloud` installed, so CLI validation was performed against the official Google Cloud SDK documentation instead of local `--help` output.
