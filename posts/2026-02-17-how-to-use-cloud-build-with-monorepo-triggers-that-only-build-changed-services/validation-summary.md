# Validation Summary: How to Use Cloud Build with Monorepo Triggers That Only Build Changed Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Cloud Build triggers
- gcloud CLI
- GitHub repository triggers
- Docker
- Artifact Registry
- Google Kubernetes Engine
- Kubernetes kubectl
- Terraform Google provider
- Node.js

## Sources Consulted
- Google Cloud Build: Create and manage build triggers: https://docs.cloud.google.com/build/docs/automating-builds/create-manage-triggers
- Google Cloud SDK: gcloud builds triggers create github: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud SDK: gcloud builds triggers run: https://docs.cloud.google.com/sdk/gcloud/reference/builds/triggers/run
- Google Cloud Build: Store artifacts in Artifact Registry: https://docs.cloud.google.com/build/docs/building/store-artifacts-in-artifact-registry
- Google Cloud Build: Deploying to GKE: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-gke
- Google Artifact Registry: Transition from Container Registry: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Terraform Registry: google_cloudbuild_trigger resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudbuild_trigger
- Node.js official release information and EOL status: https://nodejs.org/en/about/eol

## Issues Found
- The post stated that `includedFiles` takes precedence when a file matches both included and ignored file filters. Google Cloud Build documentation says ignored files take precedence, so I corrected the explanation.
- The trigger creation examples did not set trigger names, but the testing section manually ran `my-api-trigger`. I added explicit `--name` flags to the trigger creation commands so the later command refers to a trigger that actually exists.
- The image examples used `gcr.io/$PROJECT_ID/...` for user-built images. Container Registry is shut down for writes, and Google recommends Artifact Registry for container storage. I updated the user image references to `us-central1-docker.pkg.dev/$PROJECT_ID/services/api:$SHORT_SHA` while leaving official Cloud Build builder images under `gcr.io/cloud-builders/...`.
- The Cloud Build test step tried to run `npm test` inside the newly built runtime image while setting `dir: services/api`, which would run from the source checkout rather than the image's `/app` directory and would not have installed dependencies. I changed it to run tests with `node:24` in the service directory before building the runtime image.
- The Docker and shared build examples used `node:18`, which is end-of-life. I updated them to `node:24`.
- The Dockerfile used `npm ci --production`. I changed it to the current `npm ci --omit=dev` form.

## Review Notes
The Cloud Build trigger flags, `included_files` Terraform field, Cloud Build YAML structure, Docker build context usage, `kubectl` builder usage, and manual trigger run command were otherwise consistent with current official documentation. The examples assume that the Artifact Registry Docker repository named `services` exists in `us-central1`.
