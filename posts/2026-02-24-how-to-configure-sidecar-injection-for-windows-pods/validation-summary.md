# Validation Summary: How to Configure Sidecar Injection for Windows Pods

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar injection
- Istio VirtualService, DestinationRule, and ServiceEntry resources
- Kubernetes Deployments and Windows Pods
- Envoy proxy
- Istio ambient mode

## Sources Consulted
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio gateway injection documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio ServiceEntry API reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio official istiod Helm values for sidecarInjectorWebhook selectors: https://artifacthub.io/packages/helm/istio-official/istiod
- Kubernetes Windows containers documentation: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes node selector documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Envoy Windows FAQ: https://www.envoyproxy.io/docs/envoy/latest/faq/windows/win_not_supported_features

## Issues Found
- The opening version-specific claim said native Windows sidecar injection was unsupported "as of version 1.22." This was outdated wording. Updated it to describe the current Istio sidecar data plane limitation without tying the statement to an old release.
- The Envoy Windows statement described Windows support as experimental. Envoy documentation says official Windows support ended on August 31, 2023. Updated the wording accordingly.
- The pod-level injection example called `sidecar.istio.io/inject` an annotation. Current Istio documentation describes this as a pod label for injection control. Updated the text and manifest to use labels.
- The Windows Deployment example was missing the required `spec.selector` and matching pod label. Added `spec.selector.matchLabels` and the corresponding `app` label.
- The Windows pod example did not set `.spec.os.name`. Kubernetes documentation recommends setting this to `windows` for Windows Pods. Added `os.name: windows`.
- The Linux proxy Deployment did not set `.spec.os.name`. Added `os.name: linux` to keep the scheduling intent explicit alongside the existing node selector.
- The VirtualService example used `fixedDelay: 0s`, but Istio requires `fixedDelay` to be at least `1ms`. Removed the no-op invalid fault injection block and updated the surrounding sentence to mention timeout and retry policies only.
- The ServiceEntry section described registering services outside a "typical mesh namespace." Kubernetes Services are discoverable across namespaces by DNS, so this was inaccurate. Updated the section to cover services outside the Kubernetes service registry and changed the example to a valid internal static endpoint.

## Review Notes
The examples are illustrative and still assume supporting resources exist, such as the referenced Kubernetes Services, Deployments, ConfigMaps, and an installed Istio control plane. YAML snippets were parsed successfully after the corrections.
