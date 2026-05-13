# Validation Summary: HelmRelease Upgrade Remediation with Uninstall on Failure in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Helm Controller
- HelmRelease custom resources
- Helm
- Kubernetes
- kubectl
- Persistent volumes and persistent volume claims

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Helm chart CRD documentation: https://helm.sh/docs/topics/charts/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
- Corrected the explanation of upgrade remediation timing. Flux performs remediation using the configured strategy between retry attempts, and after an uninstall remediation the controller attempts to reinstall the release. The original wording implied uninstall only happened after all retries were exhausted and only on the next interval.
- Corrected the `retries: 3` explanation. Flux defines retries as retry attempts after failures before bailing, not simply "three failed upgrade attempts."
- Clarified final failure remediation. Flux upgrade remediation defaults `remediateLastFailure` to true when retries are greater than zero, so the last failed attempt is also remediated.
- Updated the downtime wording so it refers to the period between uninstall and the next successful retry or install, rather than specifically the next reconciliation interval.
- Removed the implication that Helm uninstall provides a clean slate for CRDs installed from a chart's `crds/` directory. Helm does not delete those CRDs on uninstall, so their lifecycle must be managed separately.
- Corrected the persistent storage warning. Helm uninstall may delete Helm-managed PVCs, while the persistent volume reclaim policy determines what happens to the backing PV and storage asset after a PVC is deleted.

## Review Notes
The HelmRelease API version and fields used in the examples are current for Flux Helm Controller v2. The `kubectl events --for ... --watch` command is valid according to the Kubernetes kubectl reference, though clusters with older kubectl versions may still rely on `kubectl get events --watch`.
