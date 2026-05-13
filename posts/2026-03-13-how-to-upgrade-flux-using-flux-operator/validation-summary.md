# Validation Summary: How to Upgrade Flux Using Flux Operator

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Flux CD
- Flux Operator
- Kubernetes
- GitOps
- kubectl
- Flux notification-controller

## Sources Consulted
- Flux upgrade documentation: https://fluxcd.io/flux/installation/upgrade/
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux Operator FluxInstance CRD documentation: https://fluxoperator.dev/docs/crd/fluxinstance/
- Flux Operator monitoring and reporting documentation: https://fluxoperator.dev/docs/instance/monitoring/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux GitHub releases: https://github.com/fluxcd/flux2/releases
- Flux v2.8.6 install manifest: https://github.com/fluxcd/flux2/releases/download/v2.8.6/install.yaml
- Flux Operator FluxInstance CRD source: https://raw.githubusercontent.com/controlplaneio-fluxcd/flux-operator/main/config/crd/bases/fluxcd.controlplane.io_fluxinstances.yaml

## Issues Found
- The prerequisites did not mention updating the Flux Operator before upgrading Flux. The official Flux upgrade guide says to update the operator first, so this was added.
- The examples used Flux `2.5.0` and rollback version `2.4.0`, which are outdated for the current Flux release stream. These were updated to `2.8.x` for upgrade examples and `2.7.x` for the rollback example, matching the current semver-range style recommended by Flux Operator docs.
- The upgrade process claimed the operator performs rolling updates for all components, updates each controller deployment one at a time, and terminates old pods as new pods become ready. The official manifests use Kubernetes Deployment strategies, including `Recreate` for source-controller, so the wording was changed to describe applying generated manifests and waiting for health checks.
- The notification example used `notification.toolkit.fluxcd.io/v1`, but current Flux notification examples and docs use `notification.toolkit.fluxcd.io/v1beta3`. The API version was corrected.
- The Slack provider example combined a webhook-style secret name with a `channel` field. Flux Provider docs show legacy incoming webhooks using a secret containing the webhook address and no `channel`, so the provider snippet was corrected.

## Review Notes
The core FluxInstance fields in the post, including `spec.distribution.version`, `spec.distribution.registry`, `spec.components`, and `spec.cluster.networkPolicy`, match the current Flux Operator CRD. The `kubectl patch`, `kubectl get`, `kubectl describe`, and `kubectl logs` command forms are syntactically valid, but they require the relevant Flux CRDs and `kubectl` to be installed in the reader's environment.
