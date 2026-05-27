# Validation Summary: How to Set Up Skaffold Profiles for Development Staging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Skaffold
- Kustomize
- Kubernetes Deployments, Services, readiness probes, affinity, and HorizontalPodAutoscaler
- Google Kubernetes Engine
- Google Cloud Build
- Artifact Registry image repository handling
- Docker
- Go and Air live reload

## Sources Consulted
- Skaffold Kustomize renderer documentation: https://skaffold.dev/docs/renderers/kustomize/
- Skaffold skaffold.yaml v4beta6 JSON schema: https://raw.githubusercontent.com/GoogleContainerTools/skaffold/main/docs-v2/content/en/schemas/v4beta6.json
- Skaffold CLI reference: https://skaffold.dev/docs/references/cli/
- Skaffold Google Cloud Build builder documentation: https://skaffold.dev/docs/builders/build-environments/cloud-build/
- Skaffold image repository handling documentation: https://skaffold.dev/docs/environment/image-registries/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- Kubernetes kubectl kustomize reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Google Cloud Build machine type documentation: https://docs.cloud.google.com/build/docs/optimize-builds/increase-vcpu-for-builds
- Google Cloud Build GKE deployment documentation: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-gke
- gcloud container clusters get-credentials reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/get-credentials
- Air official repository and installation documentation: https://github.com/air-verse/air

## Issues Found
- The Skaffold example used `deploy.kustomize.paths` with `apiVersion: skaffold/v4beta6`. In the v4 schema, Kustomize rendering belongs under `manifests.kustomize.paths`, while deployment should use a deployer such as `deploy.kubectl`. Updated the default and profile configurations accordingly.
- The development `portForward` entry used lowercase `service` and omitted the `development` namespace, even though Kustomize adds `namespace: development`. Updated it to `resourceType: Service` and added `namespace: development`.
- The staging and production Skaffold artifacts used fully qualified Artifact Registry image names while the Kubernetes Deployment used `image: my-service`. This can prevent Skaffold from replacing the manifest image consistently. Updated the profile artifacts to keep `image: my-service` and added `--default-repo=us-central1-docker.pkg.dev/...` to the staging, production, and CI/CD commands.
- The development Dockerfile installed Air from the old `github.com/cosmtrek/air` module path and used an older Go base image. Updated it to `github.com/air-verse/air@latest` and `golang:1.25-alpine`, matching the current Air documentation.
- The Cloud Build pipeline used `--kube-context` without first creating a kubeconfig for the GKE clusters. Added staging and production `gcloud container clusters get-credentials` steps and a shared `KUBECONFIG` path for the Skaffold and kubectl steps.

## Review Notes
Validated the updated Skaffold configuration against the official `skaffold/v4beta6` JSON schema. The Cloud Build YAML parses successfully. The Kubernetes and Kustomize snippets are syntactically valid and use current API versions for the resources shown.
