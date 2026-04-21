# Validation Summary: How to Deploy Tekton Pipelines with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Tekton Pipelines
- Tekton Dashboard
- Tekton Chains
- Kubernetes
- Kubernetes Terraform/OpenTofu provider
- Helm Terraform/OpenTofu provider
- CDF Tekton Helm chart
- Kaniko

## Sources Consulted
- Tekton Pipelines installation docs: https://tekton.dev/vault/pipelines-main/install/
- Tekton Dashboard installation docs: https://tekton.dev/vault/dashboard-v0.60.x-lts/install/
- Tekton Pipeline API docs: https://tekton.dev/vault/pipelines-main/pipeline-api/
- Tekton Git resolver docs: https://tekton.dev/docs/pipelines/git-resolver/
- Tekton Hub resolver docs and deprecation notice: https://tekton.dev/docs/pipelines/hub-resolver/
- Tekton Chains docs: https://tekton.dev/docs/chains/
- Tekton Chains configuration docs: https://tekton.dev/docs/chains/config/
- OpenTofu `terraform_data` docs: https://opentofu.org/docs/language/resources/tf-data/
- OpenTofu provisioners without a resource docs: https://opentofu.org/docs/language/resources/provisioners/null_resource/
- Kubernetes provider `kubernetes_manifest` docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- Helm provider docs and `helm_release` resource docs: https://registry.terraform.io/providers/hashicorp/helm/latest/docs
- Helm provider v3 release notes: https://github.com/hashicorp/terraform-provider-helm/releases
- Kubernetes provider releases: https://github.com/hashicorp/terraform-provider-kubernetes/releases
- CDF Tekton Helm chart repository: https://cdfoundation.github.io/tekton-helm-chart/
- CDF Tekton Helm chart values: https://github.com/cdfoundation/tekton-helm-chart/tree/main/charts/tekton-pipeline

## Issues Found
- The Tekton Pipelines install URL used the older Google Cloud Storage path. Updated it to the current official `infra.tekton.dev` release URL.
- The OpenTofu install snippet used `null_resource` for standalone provisioners. Replaced it with the built-in `terraform_data` resource, which OpenTofu documents for provisioners without another managed resource.
- The Helm provider snippet used older provider constraints and omitted Helm provider configuration. Updated the provider constraints and added the current Helm provider v3 `kubernetes = { ... }` configuration.
- The Helm chart example used `https://charts.tekton.dev`, which does not resolve, and included unsupported chart values. Updated it to the CDF Tekton Helm chart repository and valid namespace values.
- The Helm chart example created the namespace separately while the chart also creates it by default. Added `namespace.create = false` and matching namespace labels to avoid ownership conflicts.
- The Pipeline referenced a local `git-clone` Task that Tekton Pipelines does not install by default. Updated the task reference to use the built-in Git resolver against the Tekton catalog `git-clone` Task.
- Added a note that Tekton CRDs must exist before planning `kubernetes_manifest` resources, because the Kubernetes provider discovers custom-resource schemas during planning.
- Updated the Tekton Hub recommendation because the current Tekton resolver docs mark Tekton Hub as deprecated and recommend Artifact Hub for discovery.
- Clarified the Tekton Chains best-practice bullet: Chains signs results, OCI images, and provenance when configured with keys and storage backends; it is not automatic without configuration.

## Review Notes
- The `local-exec` examples still rely on the local `kubectl` context; the post now calls out that it must target the same cluster as the configured providers.
- I could not run `tofu validate` or `terraform validate` in this environment because neither CLI is installed. The snippets were reviewed statically against official documentation.
