# Validation Summary: How to Configure HelmRelease Atomic Install in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease API
- Flux HelmRepository API
- Kubernetes
- Helm
- Bitnami NGINX Helm chart

## Sources Consulted
- Flux HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmChart source documentation: https://fluxcd.io/flux/components/source/helmcharts/
- Flux CLI `flux get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Helm `helm install` command documentation: https://helm.sh/docs/helm/helm_install/
- Bitnami NGINX chart values and metadata: https://github.com/bitnami/charts/tree/main/bitnami/nginx
- Artifact Hub package metadata for Bitnami NGINX: https://artifacthub.io/packages/helm/bitnami/nginx

## Issues Found
- The original post used unsupported `install.atomic` and `upgrade.atomic` fields. Current Flux HelmRelease `v2` does not expose Helm's `--atomic` flag. I replaced those fields with supported Flux remediation settings: `install.remediation.retries`, `upgrade.cleanupOnFail`, and `upgrade.remediation.strategy: rollback`.
- The original explanation said Flux directly supports atomic installs through HelmRelease. I corrected this to explain that Flux provides failure remediation: failed installs are uninstalled between retries, and failed upgrades can be rolled back.
- The examples pinned the Bitnami NGINX chart to `18.x`, which is stale and can fail as older Bitnami chart versions age out of the repository. I removed the version selector so Flux uses the latest available chart by default.
- The verification command used `flux get helmrelease nginx-atomic` without a namespace. I corrected it to the documented plural command, `flux get helmreleases nginx-remediated -n default`.
- The full example used `rollback.recreate: true`, but Flux documents this field as deprecated and no longer effective as of Flux v2.8. I removed it.
- Several comments and headings referred to atomic behavior after the examples were corrected. I updated those references to remediation terminology while preserving the tutorial structure.

## Review Notes
- Helm's CLI `--atomic` remains valid for direct Helm CLI installs and deletes an installation on failure, but this is not a Flux HelmRelease field.
- The local environment did not have `flux` or `helm` installed, so CLI command availability was verified against official documentation instead of local `--help` output.
