# Validation Summary: How to Use Cloud Build to Deploy to Google Kubernetes Engine with kubectl

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Google Kubernetes Engine
- Kubernetes
- kubectl
- gcloud CLI
- Artifact Registry
- Docker
- Cloud Build triggers

## Sources Consulted
- Google Cloud Build: Deploying to GKE: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-gke
- Google Cloud Build: Build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build: Substituting variable values: https://docs.cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud Build: Default Cloud Build service account: https://docs.cloud.google.com/build/docs/cloud-build-service-account
- Google Cloud SDK: gcloud builds triggers create github: https://docs.cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud Artifact Registry: Transition from Container Registry: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Google Cloud Artifact Registry: Access control with IAM: https://docs.cloud.google.com/artifact-registry/docs/access-control
- GoogleCloudPlatform cloud-builders repository: https://github.com/GoogleCloudPlatform/cloud-builders

## Issues Found
- The post treated Container Registry as a current registry option and used `gcr.io/$PROJECT_ID/...` for user images. Container Registry writes are shut down, so the examples now use Artifact Registry Docker image names in the `LOCATION-docker.pkg.dev/PROJECT_ID/REPOSITORY/IMAGE:TAG` format.
- The IAM section assumed Cloud Build always runs as the legacy `PROJECT_NUMBER@cloudbuild.gserviceaccount.com` service account. Cloud Build can also use the Compute Engine default service account or a user-specified service account, so the text and command now instruct readers to grant the role to the actual build or trigger service account.
- The main `cloudbuild.yaml` example used `gcr.io/cloud-builders/gke-deploy` as a shell step for `gcloud container clusters get-credentials`, then used the `kubectl` builder. The direct `kubectl` builder example should use the cluster and zone environment variables, so the redundant and misleading `gke-deploy` credential step was removed.
- The deployment manifest used an image ending in `:latest`, while the `kubectl apply` example attempted to replace a `SHORT_SHA` placeholder that did not exist. The manifest and sed replacements now use matching `LOCATION`, `PROJECT_ID`, `REPOSITORY`, and `SHORT_SHA` placeholders.
- The `ubuntu` sed step passed `bash` as an argument without setting the entrypoint. The snippet now sets `entrypoint: 'bash'`, which is the Cloud Build pattern for running a shell script in that image.
- The rollback snippet overrode the `kubectl` builder entrypoint with `bash`, which bypasses the builder's normal direct `kubectl` invocation pattern. It now uses the official Cloud SDK image, fetches GKE credentials inside the script, and then runs the rollout and rollback commands.
- The image pull troubleshooting note referred generically to a container registry. It now specifically references Artifact Registry and the GKE node service account that needs repository read access.

## Review Notes
The `gcloud` and `kubectl` binaries were not available in the local environment, so CLI syntax was checked against the official Google Cloud SDK and Cloud Build documentation instead of local `--help` output.
