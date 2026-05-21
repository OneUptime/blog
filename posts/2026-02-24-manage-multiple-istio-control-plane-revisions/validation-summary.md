# Validation Summary: How to Manage Multiple Istio Control Plane Revisions

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Istio
- Kubernetes
- istioctl
- kubectl
- Istio control plane revisions
- Sidecar injection
- Istio control plane metrics

## Sources Consulted
- Istio Canary Upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-discovery exported metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes labels documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The sample `MutatingWebhookConfiguration` output showed each revision webhook with `1` webhook. Current Istio canary upgrade documentation shows revision sidecar injector configurations with `2` webhooks, so the example output was corrected.
- The post said having both `istio-injection=enabled` and `istio.io/rev` can cause conflicts. Istio documents that `istio-injection` takes precedence over `istio.io/rev` for backward compatibility, so the explanation was updated.
- The post said namespaces without an `istio.io/rev` label will not have sidecar injection from any revision. That is only true for revision-based injection; namespaces can still be injected through `istio-injection=enabled` or a default revision tag, so the wording was corrected.
- The metrics list included `pilot_conflict_inbound_listener` and `pilot_xds_push_errors`, which are not current Istio control plane metrics in the exported metrics reference. They were replaced with current metrics: `pilot_total_rejected_configs`, `pilot_total_xds_internal_errors`, and `pilot_total_xds_rejects`.
- The best-practices section advised avoiding version numbers as revision names. Istio documentation says version-based revision names are appropriate in production when dots are replaced with hyphens, so the guidance was corrected.

## Review Notes
The core revision workflow is technically correct: installing revisioned control planes, labeling namespaces with `istio.io/rev`, restarting workloads for reinjection, checking `istioctl proxy-status`, and uninstalling old revisions match the official Istio canary upgrade process. The post could later mention revision tags for production migrations, but the omission is not a technical error.
