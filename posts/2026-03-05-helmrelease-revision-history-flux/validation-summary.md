# Validation Summary: How to View HelmRelease Revision History in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Helm Controller
- Kubernetes HelmRelease custom resources
- Helm CLI
- Kubernetes Secrets
- jq
- YAML configuration

## Sources Consulted
- Helm CLI documentation for `helm history`: https://helm.sh/docs/helm/helm_history/
- Helm CLI documentation for `helm get all`: https://helm.sh/docs/helm/helm_get_all/
- Helm CLI documentation for `helm get manifest`: https://helm.sh/docs/v3/helm/helm_get_manifest/
- Helm CLI documentation for `helm get values`: https://helm.sh/docs/v3/helm/helm_get_values/
- Helm CLI documentation for `helm get metadata`: https://helm.sh/docs/v3/helm/helm_get_metadata/
- Helm advanced documentation for storage backends: https://helm.sh/docs/topics/advanced/#storage-backends
- Flux HelmRelease guide: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/

## Issues Found
- The post used `spec.historyLimit`, but the current Flux HelmRelease v2 field is `spec.maxHistory`. Updated the configuration example, surrounding explanation, best practices, and conclusion to use `maxHistory`.
- The post referenced `.status.lastAppliedRevision`, which is not a current HelmRelease v2 status field. Replaced it with a `.status.history` example that selects the highest observed Helm release `version`.
- The post described `.status.lastAttemptedRevision` as a release revision. In Flux HelmRelease v2, it is the chart revision last attempted by the controller. Updated the surrounding text and command comment to make that distinction clear.
- The post stated that Helm release Secrets are stored in the release namespace. Helm stores release information in the release namespace by default, but Flux can use `spec.storageNamespace`; updated the wording to explain the Flux storage namespace behavior.

## Review Notes
- Helm and Flux commands could not be verified locally because `helm` and `kubectl` are not installed in the review environment, so command flags and fields were checked against official documentation instead.
- The examples assume the Helm release name and storage namespace match the HelmRelease name and namespace. This is correct for the simple default case shown, but users with `spec.releaseName` or `spec.storageNamespace` must use those values when running Helm and Kubernetes commands.
