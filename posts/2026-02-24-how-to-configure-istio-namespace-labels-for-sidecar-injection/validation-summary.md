# Validation Summary: How to Configure Istio Namespace Labels for Sidecar Injection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes namespaces
- Istio sidecar injection
- Istio control plane revisions
- Istio revision tags
- kubectl
- istioctl
- Kubernetes MutatingWebhookConfiguration

## Sources Consulted
- Istio documentation: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio documentation: Canary Upgrades - https://istio.io/latest/docs/setup/upgrade/canary/
- Istio documentation: Sidecar Injection Problems - https://istio.io/latest/docs/ops/common-problems/injection/
- Istio documentation: Verifying Istio Sidecar Injection with Istioctl Check-Inject - https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Istio command reference: istioctl tag - https://istio.io/latest/docs/reference/commands/istioctl/
- Istio configuration analysis: NamespaceMultipleInjectionLabels - https://istio.io/latest/docs/reference/config/analysis/ist0123/
- Istio configuration reference: Resource Labels - https://istio.io/latest/docs/reference/config/labels/
- Istio configuration reference: Resource Annotations - https://istio.io/latest/docs/reference/config/annotations/

## Issues Found
- The post said the `sidecar.istio.io/inject` label and annotation both work and that the label is checked first. The annotation is now documented as deprecated in favor of the label, so the wording was changed to mention the deprecation instead of implying both forms are equally current.
- The post implied that pod-level `sidecar.istio.io/inject: "true"` only depends on the webhook `objectSelector`. This was incomplete because the webhook must also be invoked for the namespace via its `namespaceSelector`. The text was updated to include both selector requirements.
- The selective-injection example showed only an `objectSelector`. This was incomplete for namespaces with no injection label, so the example now includes a matching `namespaceSelector` pattern as well.
- The migration strategy started with `istio-injection=disabled` and then attempted to test a single deployment using `sidecar.istio.io/inject: "true"`. Istio's documented injector logic gives disabled namespace labels priority, so that workflow would not inject. The migration step now starts by removing namespace injection labels before testing a single deployment.
- The removal example only removed `istio-injection`, which would not remove a namespace from the mesh if it used `istio.io/rev`. The command now removes both labels.

## Review Notes
Most commands and examples matched current Istio documentation. Future updates could mention that the exact webhook selector shape varies by installation mode, revision usage, and whether the mesh is configured as opt-in or opt-out.
