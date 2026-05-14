# Validation Summary: How to Configure HelmRelease Uninstall Action in Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux Helm Controller
- Kubernetes
- Helm
- HelmRelease custom resources
- GitOps

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux `flux suspend helmrelease` CLI documentation: https://fluxcd.io/flux/cmd/flux_suspend_helmrelease/
- Helm `helm uninstall` command documentation: https://helm.sh/docs/helm/helm_uninstall/
- Helm `helm history` command documentation: https://helm.sh/docs/helm/helm_history/
- Kubernetes garbage collection documentation: https://kubernetes.io/docs/concepts/architecture/garbage-collection/

## Issues Found
- The post stated that uninstall remediation happens when the upgrade remediation strategy is set to `uninstall` and all retries are exhausted. Flux documents upgrade remediation as running the configured strategy between retry attempts, with last-failure remediation controlled by defaults and `remediateLastFailure`. Updated the wording to say uninstall can happen after an upgrade failure during upgrade remediation.
- The post omitted install remediation from the list of common uninstall scenarios, even though Flux documents `.spec.uninstall` as applying to install remediation. Added install remediation to the list.
- Updated the remediation example comment so it no longer implies uninstall only happens after retries are exhausted.

## Review Notes
The HelmRelease API version, uninstall field names, accepted `deletionPropagation` values, and Flux and Helm CLI commands shown in the post match the current official documentation. The examples use the current `helm.toolkit.fluxcd.io/v2` API.
