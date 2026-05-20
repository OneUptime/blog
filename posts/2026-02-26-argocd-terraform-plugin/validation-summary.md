# Validation Summary: How to Create a Plugin for Terraform with ArgoCD

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Argo CD Config Management Plugins
- GitOps
- Kubernetes Applications and ConfigMaps
- Terraform CLI
- Terraform providers, outputs, local files, and provider caching
- Docker / Alpine container images
- jq

## Sources Consulted
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Terraform `init` command documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `apply` command documentation: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform automation guidance: https://developer.hashicorp.com/terraform/tutorials/automation/automate-terraform
- Terraform `output` command documentation: https://developer.hashicorp.com/terraform/cli/commands/output
- Terraform `yamlencode` function documentation: https://developer.hashicorp.com/terraform/language/functions/yamlencode
- Terraform CLI configuration and provider cache documentation: https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform local provider `local_file` resource documentation: https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/file
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/

## Issues Found
- The Application example used `plugin.name: terraform-manifests` while the CMP declares `spec.version: v1.0`. Argo CD requires explicit plugin names to include the version suffix when `spec.version` is set, so this was changed to `terraform-manifests-v1.0`.
- The Application example set `TF_VAR_replicas` and `TF_VAR_image_tag`, but Argo CD prefixes user-supplied plugin environment variables with `ARGOCD_ENV_` before running CMP commands. The plugin command now passes `ARGOCD_ENV_TF_VAR_replicas` and `ARGOCD_ENV_TF_VAR_image_tag` to Terraform with `-var`.
- The plugin commands used `set -euo pipefail` with `sh`. Since the Dockerfile installs Bash and `pipefail` is not portable POSIX `sh`, the CMP command examples now use `bash -c`.
- The Dockerfile did not install `jq`, but the Terraform state-reader plugin uses `jq`. Added `jq` to the Alpine package install line.
- The Dockerfile entrypoint copied and invoked `argocd-cmp-server` from `/usr/local/bin`, while Argo CD's CMP sidecar documentation specifies `/var/run/argocd/argocd-cmp-server` as the sidecar entrypoint. Updated the copy destination and entrypoint.
- The state-reader ConfigMap generation quoted Terraform output values unsafely and did not force values to strings. Updated the `jq` expression to stringify values and JSON-quote them for valid YAML string values.
- The provider caching example described a filesystem mirror but used `TF_PLUGIN_CACHE_DIR`, which is a provider plugin cache setting. Updated the snippet and wording to describe and populate a plugin cache directory accurately.
- The security guidance said never to use local state in CMP plugins, which conflicted with the template-only `local_file` example using ephemeral local state. Clarified that local state should not be used for durable infrastructure management, while ephemeral local state can be acceptable for template-only generation.
- Added a warning that `terraform output -json` includes sensitive outputs in plain text, so the state-reader pattern should not generate ConfigMaps from secret values.

## Review Notes
- Terraform was not installed in the local workspace, so the Terraform snippets were reviewed statically against official Terraform documentation rather than executed locally.
- The examples remain version-specific around Argo CD v2.10-era sidecar CMP behavior. The current Argo CD documentation still supports the same core configuration shape.
