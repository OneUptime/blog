# Validation Summary: How to Create a CI/CD Pipeline for Machine Learning Models on Google Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Cloud Build triggers
- Artifact Registry
- Vertex AI Custom Training
- Vertex AI Model Registry
- Vertex AI Endpoints
- Google Cloud Python client libraries
- Python
- Docker
- pytest
- flake8

## Sources Consulted
- Cloud Build build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Cloud Build GitHub trigger CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Cloud Build substitutions documentation: https://docs.cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Vertex AI `CustomContainerTrainingJob` Python SDK reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.CustomContainerTrainingJob
- Vertex AI `Model` Python SDK reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Vertex AI prebuilt prediction containers: https://docs.cloud.google.com/vertex-ai/docs/predictions/pre-built-containers

## Issues Found
- The Mermaid workflow showed a rollback after failed integration tests, but the sample Cloud Build pipeline did not implement rollback logic. Changed the failure path to fail the build.
- The project structure omitted the `scripts/` directory even though the Cloud Build configuration called scripts from that directory. Added the referenced script files to the structure.
- Several Cloud Build steps ran Python scripts in containers without installing the required Google Cloud client libraries. Changed those steps to run through `bash`, install dependencies, and then invoke the scripts.
- The production deployment guard only checked `$BRANCH_NAME`. Added a `$_PR_NUMBER` check so pull request builds do not deploy to production.
- The training job example mixed automatic Vertex AI model upload with a later registration step and passed an arbitrary output path. Updated the training example to produce artifacts and metrics, then register the model explicitly with `aiplatform.Model.upload` after evaluation.
- The post referenced the `sklearn-cpu.1-2` Vertex AI prediction container, which is past end of availability. Updated the serving image to `sklearn-cpu.1-6:latest`.
- The pull request trigger command did not specify `--comment-control`, so the default behavior would require a collaborator comment before running. Added `--comment-control=COMMENTS_DISABLED` to match the text that says the trigger runs on pull requests.

## Review Notes
The snippets are still illustrative and use placeholder project IDs, endpoint IDs, repository names, and model-specific feature/prediction schemas. The latency test threshold is example-specific and should be adjusted to the deployed model, region, and endpoint SLO.
