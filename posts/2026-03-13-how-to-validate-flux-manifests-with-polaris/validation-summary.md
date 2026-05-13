# Validation Summary: How to Validate Flux Manifests with Polaris

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Fairwinds Polaris
- Kubernetes manifests
- Flux Kustomization resources
- Kustomize overlays
- Helm
- GitHub Actions
- Bash
- jq

## Sources Consulted
- Fairwinds Polaris CLI Options: https://polaris.docs.fairwinds.com/cli/
- Fairwinds Polaris Infrastructure as Code documentation: https://polaris.docs.fairwinds.com/infrastructure-as-code/
- Fairwinds Polaris Check Settings documentation: https://polaris.docs.fairwinds.com/customization/checks/
- Fairwinds Polaris Configuration documentation: https://polaris.docs.fairwinds.com/customization/configuration/
- Fairwinds Polaris Exemptions documentation: https://polaris.docs.fairwinds.com/customization/exemptions/
- Fairwinds Polaris Dashboard documentation: https://polaris.docs.fairwinds.com/dashboard/
- Fairwinds Polaris default configuration: https://github.com/FairwindsOps/polaris/blob/master/pkg/config/default.yaml
- Fairwinds Polaris latest release metadata: https://api.github.com/repos/FairwindsOps/polaris/releases/latest
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The Linux binary download URL used `polaris_linux_amd64.tar.gz`, which is not the current GitHub release asset name. Updated the install snippets to discover the latest version and download `polaris_${POLARIS_VERSION}_linux_amd64.tar.gz`.
- The "Run with only security checks" example did not restrict execution to security checks; it only used `--only-show-failed-tests`. Updated the comment to describe the command accurately.
- The check-category description placed CPU and memory request/limit checks under reliability. Updated the text and sample config to align with Polaris' current reliability and efficiency categories.
- The custom config used `cpuRequestsOverset` and `memoryRequestsOverset`, which are not valid Polaris 10.2.0 check IDs. Removed those invalid checks and kept supported CPU/memory request and limit checks.
- The jq command only listed container-level checks, missing controller-level and pod-level checks. Updated it to include `.Results`, `.PodResult.Results`, and container results.
- The kustomize process-substitution and `/dev/stdin` examples do not produce correct audit behavior with Polaris 10.2.0 in local verification. Replaced them with temporary-file examples.

## Review Notes
The Flux Kustomization API version and fields shown are current. The Helm dashboard install command matches the official Polaris dashboard installation pattern, with explicit values for dashboard and webhook enablement.
