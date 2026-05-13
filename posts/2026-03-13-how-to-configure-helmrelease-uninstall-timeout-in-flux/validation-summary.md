# Validation Summary: How to Configure HelmRelease Uninstall Timeout in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease API
- Helm
- Kubernetes
- kubectl
- GitOps

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide: https://fluxcd.io/flux/components/helm/helmreleases/
- Helm uninstall command reference: https://docs.helm.sh/docs/helm/helm_uninstall/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/

## Issues Found
- The post described `spec.uninstall.timeout` as the maximum total time for the whole uninstall operation. Flux documents this field as the time to wait for individual Kubernetes operations during a Helm uninstall action, defaulting to `spec.timeout`. Updated the introduction, "How Uninstall Timeout Works", basic configuration explanation, and global timeout wording to reflect the documented behavior.
- The post implied that uninstall timeout prevents indefinite blocking by a single hung operation. Flux documents failed uninstalls as retried during subsequent reconciliations until they succeed. Updated the introduction and retry description to say failures are surfaced and retried rather than implying retries stop.

## Review Notes
- The `spec.uninstall.timeout`, `disableHooks`, `disableWait`, and `keepHistory` fields are valid for Flux HelmRelease v2.
- The `kubectl events --for ... --watch` command matches the current Kubernetes kubectl events reference, but it requires a kubectl version that includes the `events` subcommand.
