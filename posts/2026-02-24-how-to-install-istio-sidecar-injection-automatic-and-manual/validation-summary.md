# Validation Summary: How to Install Istio Sidecar Injection (Automatic and Manual)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecar proxy
- Mutating admission webhooks
- `istioctl`
- Kubernetes labels, annotations, and pod specs

## Sources Consulted
- Istio official documentation: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio official command reference: `istioctl kube-inject` and `istioctl experimental check-inject` - https://istio.io/latest/docs/reference/commands/istioctl/
- Istio official diagnostic documentation: Verifying Istio Sidecar Injection with Istioctl Check-Inject - https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Istio official reference: Resource Annotations - https://istio.io/latest/docs/reference/config/annotations/
- Istio official reference: Resource Labels - https://istio.io/latest/docs/reference/config/labels/
- Kubernetes official documentation: Admission Controllers - https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/

## Issues Found
- The post said Istio always adds an Envoy sidecar plus an init container. Updated this to say Istio adds the sidecar plus any required init or validation containers, because current Istio behavior depends on CNI and injection configuration.
- The post described `sidecar.istio.io/inject` as a pod annotation for excluding pods. Updated the example and wording to use the `sidecar.istio.io/inject` label, because the annotation is deprecated in current Istio documentation.
- The post said `istio-injection` and `istio.io/rev` are mutually exclusive. Adjusted the wording to reflect current Istio behavior: Istio warns when both are present, and `istio-injection` takes precedence.
- The "Excluding Specific Containers" section actually showed annotations for excluding traffic interception by port. Renamed and reworded it to "Excluding Specific Ports."
- The `istioctl kube-inject` example used `--meshConfigMapName=istio`, which is not present in the current official `istioctl kube-inject` command reference. Replaced it with `istioctl kube-inject -f my-deployment.yaml`, which prints the injected manifest without applying it.
- The summary said pod annotations can override namespace-level injection. Updated this to pod labels to match the current documented injection controls.

## Review Notes
The remaining commands and configuration snippets match current Istio documentation at the time of review. Some annotation-based customizations in the post are documented as alpha features, so future readers should verify them against the Istio version they run.
