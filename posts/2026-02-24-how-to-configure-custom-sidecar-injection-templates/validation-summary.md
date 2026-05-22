# Validation Summary: How to Configure Custom Sidecar Injection Templates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Kubernetes
- Istio sidecar injection
- IstioOperator
- Envoy sidecar proxy
- kubectl
- istioctl
- Go templates

## Sources Consulted
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-discovery command reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio component logging documentation: https://istio.io/latest/docs/ops/diagnostic-tools/component-logging/
- Kubernetes kubectl diff reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_diff/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The command for viewing the injector template used `.data.templates`, but current Istio documentation stores the injector configuration in `.data.config` on the `istio-sidecar-injector` ConfigMap. Changed the jsonpath to `.data.config`.
- The post described IstioOperator custom injection templates as the recommended way to customize injection. Istio's official documentation marks custom templates as experimental, so the wording was changed to say they are defined at installation time and should be reviewed carefully during upgrades.
- The testing command used `istioctl kube-inject -o yaml`, but for `kube-inject`, `-o` is an output filename, not an output format. Removed `-o yaml` so the injected manifest is written to stdout and can be piped to `kubectl diff -f -`.
- The debug logging command used `injection:debug`, but `injection` is not listed as a current `pilot-discovery` logging scope. Changed it to `all:debug`, which is a supported scope for enabling debug logging broadly on istiod.

## Review Notes
Custom injection templates are still documented by Istio as experimental in the current Istio 1.30 documentation, so future Istio upgrades should re-check template behavior and compatibility.
