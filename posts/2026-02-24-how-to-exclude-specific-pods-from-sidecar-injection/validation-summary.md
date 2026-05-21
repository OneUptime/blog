# Validation Summary: How to Exclude Specific Pods from Sidecar Injection

## Status
validated

## Post Type
Technical guide / Kubernetes and Istio tutorial

## Technologies Covered
- Istio sidecar injection
- Kubernetes Pods, Deployments, DaemonSets, Jobs, and CronJobs
- Kubernetes labels, annotations, and selectors
- Kubernetes admission webhooks
- Istio traffic interception annotations
- Istio mTLS and PeerAuthentication

## Sources Consulted
- Istio Installing the Sidecar: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Resource Labels: https://istio.io/latest/docs/reference/config/labels/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Sidecar Injection Problems: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio Kubernetes Native Sidecars in Istio: https://istio.io/latest/blog/2023/native-sidecars/
- Kubernetes Labels and Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Annotations: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/
- Kubernetes Init Containers: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The post presented the `sidecar.istio.io/inject` annotation as the primary current method. Istio now documents the `sidecar.istio.io/inject` label as the per-pod injection control and marks the annotation as deprecated, so the first two methods were updated to recommend the label and describe the annotation as legacy.
- The Deployment and DaemonSet examples were missing required `spec.selector` fields and matching pod template labels. Added selectors and matching `app` labels so the examples are valid Kubernetes workload specs.
- The namespace exclusion section implied that removing `istio-injection` is always equivalent to disabling injection. Istio can inject namespaces by default when configured that way, so the text now limits label removal to the standard opt-in configuration and recommends `istio-injection=disabled` as the explicit safe option.
- The Job section said `EXIT_ON_ZERO_ACTIVE_CONNECTIONS` would make the sidecar exit after the main container finishes. That setting only applies during proxy draining and does not by itself solve completed Jobs with classic sidecars. Replaced that option with Kubernetes native sidecar support and kept the manual `/quitquitquit` option.
- The init container section assumed all Istio sidecars start after user-defined init containers. That is accurate for classic sidecar injection but version-dependent with Kubernetes native sidecars, so the section now states the classic behavior and adds a version caveat.
- The common pitfalls and summary sections referred only to annotations. Updated them to reflect the recommended label-based configuration while still acknowledging annotations where relevant.

## Review Notes
The webhook-level `MutatingWebhookConfiguration` example is a partial configuration snippet, not a complete replacement manifest. Future revisions could clarify that users should patch the existing webhook carefully rather than applying the snippet as a standalone object.
