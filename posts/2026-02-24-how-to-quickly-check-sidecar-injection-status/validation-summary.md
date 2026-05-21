# Validation Summary: How to Quickly Check Sidecar Injection Status

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Istio sidecar injection
- Istio control plane revisions
- istioctl
- Kubernetes namespaces, pods, labels, annotations, and JSONPath
- Kubernetes MutatingWebhookConfiguration
- Bash and Python command-line scripting

## Sources Consulted
- Istio documentation: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio documentation: Sidecar Injection Problems - https://istio.io/latest/docs/ops/common-problems/injection/
- Istio documentation: Verifying Istio Sidecar Injection with Istioctl Check-Inject - https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Istio command reference: istioctl - https://istio.io/latest/docs/reference/commands/istioctl/
- Istio configuration reference: Resource Labels - https://istio.io/latest/docs/reference/config/labels/
- Istio configuration reference: Resource Annotations - https://istio.io/latest/docs/reference/config/annotations/
- Istio configuration analysis messages: IST0103 PodMissingProxy - https://istio.io/latest/docs/reference/config/analysis/
- Kubernetes documentation: kubectl get - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The opening paragraph implied that any pod without a sidecar cannot participate in Istio at all. This is inaccurate with Istio ambient mode, so it was narrowed to Istio sidecar mode and sidecar-based mesh features.
- The namespace-label section said namespaces without `istio-injection` do not have automatic injection enabled. This missed revision labels and opt-out injection policies, so the wording now calls out those caveats.
- The revision-label section did not mention precedence when both `istio-injection` and `istio.io/rev` are present. Added the documented precedence rule.
- The pod READY-column explanation assumed every app has one container. It now clarifies that `2/2` indicates the expected sidecar pattern for a single-container app.
- The `istioctl analyze` section presented `analyze` as the primary targeted injection check. Added `istioctl experimental check-inject`, which is the documented targeted diagnostic command, while keeping `istioctl analyze` for configuration analysis.
- The webhook check used a label selector that is not the official documented way to inspect the sidecar injector and can miss valid installations. Replaced it with the documented `istio-sidecar-injector` lookup and noted revisioned webhook configurations.
- The annotation-inspection command piped a JSONPath-rendered map to `python3 -m json.tool`, which would not reliably be valid JSON. Replaced it with a JSON-based Python command that handles missing `sidecar.istio.io/status`.
- The post referred to `sidecar.istio.io/inject` as an annotation for disabling injection. Current Istio documentation marks the annotation deprecated and documents the label, so the text and command now check pod-template labels.
- The host-networking reason said pods using `hostNetwork: true` cannot have sidecars. Updated it to the documented behavior: automatic injection is ignored because the sidecar iptables model assumes pod-local networking.
- The sidecar resource command piped JSONPath map output to `python3 -m json.tool`, which would not reliably be valid JSON. Replaced it with a JSON-based Python command that prints the `istio-proxy` resource configuration.

## Review Notes
The quick shell script still uses a simple container-name check, which is acceptable for a lightweight troubleshooting script but can produce false positives for intentionally uninjected pods, host-network pods, or non-sidecar Istio ambient workloads. Future improvements could add revision label checks and `istioctl experimental check-inject` output.
