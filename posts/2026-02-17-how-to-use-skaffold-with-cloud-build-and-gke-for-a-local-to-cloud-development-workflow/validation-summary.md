# Validation Summary: Use Skaffold with Cloud Build and GKE for a Local-to-Cloud Development Workflow

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Skaffold
- Google Cloud Build
- Google Kubernetes Engine
- Kubernetes manifests
- Artifact Registry
- Docker
- Go

## Sources Consulted
- Skaffold configuration documentation: https://skaffold.dev/docs/design/config/
- Skaffold Google Cloud Build builder documentation: https://skaffold.dev/docs/builders/build-environments/cloud-build/
- Skaffold image repository handling documentation: https://skaffold.dev/docs/environment/image-registries/
- Skaffold file sync documentation: https://skaffold.dev/docs/filesync/
- Skaffold debugging documentation: https://skaffold.dev/docs/workflows/debug/
- Skaffold skaffold.yaml v4beta13 reference: https://skaffold.dev/docs/references/yaml/?version=v4beta13
- Google Cloud Artifact Registry Docker authentication documentation: https://cloud.google.com/artifact-registry/docs/docker/authentication
- Google Cloud Build deploy to GKE documentation: https://cloud.google.com/build/docs/deploying-builds/deploy-gke
- Google Cloud Build IAM roles documentation: https://cloud.google.com/iam/docs/roles-permissions/cloudbuild
- Go release history and support policy: https://go.dev/doc/devel/release

## Issues Found
- The Skaffold examples used `apiVersion: skaffold/v4beta6`, while the current documented Skaffold API version is `skaffold/v4beta13`. Updated all Skaffold snippets to `skaffold/v4beta13`.
- The Kubernetes manifest used `image: my-app`, but the Skaffold artifact examples used the fully qualified Artifact Registry image. Skaffold image substitution expects the manifest image to match the artifact name before `--default-repo` rewriting. Updated the artifact image names to `my-app` and kept `--default-repo` where Artifact Registry publishing is needed.
- The Dockerfile used `golang:1.21`, which is outside the currently supported Go release window. Updated it to `golang:1.26` based on the current Go release history.
- The Cloud Build trigger example relied on `CLOUDSDK_COMPUTE_REGION` and `CLOUDSDK_CONTAINER_CLUSTER` environment variables in the Skaffold step, but the Skaffold container still needs a Kubernetes context. Added an explicit `gcloud container clusters get-credentials` step and shared `KUBECONFIG` with the Skaffold step.
- The debugging section said Skaffold "installs and configures Delve" for Go. Skaffold documentation says recognized Go images are configured to run under Delve. Updated the wording to avoid overstating automatic installation behavior.

## Review Notes
The tutorial remains a valid local-to-cloud Skaffold workflow. A production version should also mention enabling the required Google Cloud APIs, creating the Artifact Registry repository before pushing, and using `.dockerignore` because Skaffold's Cloud Build integration stages dependencies rather than honoring `.gitignore` or `.gcloudignore`.
