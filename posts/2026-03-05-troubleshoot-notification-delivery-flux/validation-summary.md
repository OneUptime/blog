# Validation Summary: How to Troubleshoot Notification Delivery Failures in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD notification-controller
- Flux Alert and Provider custom resources
- Flux CLI
- Kubernetes
- kubectl
- Slack and generic webhook notification endpoints

## Sources Consulted
- Flux Notification Controller documentation: https://fluxcd.io/flux/components/notification/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux `reconcile kustomization` command reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The in-cluster `kubectl run` examples used `curlimages/curl` with `-- curl ...`, which passes `curl` as an argument unless `--command` is set. Updated the examples to use `--command -- curl ...`.
- The same one-shot curl examples omitted `--restart=Never`. Since `kubectl run --rm` is intended for attached, exiting pods and the default restart policy is `Always`, added `--restart=Never` to make cleanup and command completion behave correctly.

## Review Notes
- The Alert fields `providerRef`, `eventSources`, `eventSeverity`, `exclusionList`, and `suspend` match the current Flux notification API.
- The Provider secret keys discussed in the post, including `address` and token-style credentials, match the current Flux Provider documentation.
- Local `kubectl` and `flux` binaries were not installed in the review environment, so command verification used official documentation rather than local `--help` output.
