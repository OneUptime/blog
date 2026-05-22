# Validation Summary: How to Configure Health Check Rewriting in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar injection
- Istio probe rewriting
- Kubernetes liveness, readiness, and startup probes
- Kubernetes HTTP, TCP, gRPC, and exec probes
- IstioOperator configuration

## Sources Consulted
- Istio official documentation: Health Checking of Istio Services - https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio official documentation: Resource Annotations - https://istio.io/latest/docs/reference/config/annotations/
- Istio official documentation: IstioOperator Options - https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Kubernetes official documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes official documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
- The post used port 15021 for rewritten application probes. Istio's official health check documentation shows rewritten application probe paths on port 15020, so the examples and troubleshooting commands were updated to use 15020.
- The post said original probe data is stored in the `sidecar.istio.io/status` annotation. Istio stores the original probe mapping in the sidecar container's `ISTIO_KUBE_APP_PROBERS` environment variable, so the explanation and verification command were corrected.
- The global IstioOperator example used `meshConfig.defaultConfig.holdApplicationUntilProxyStarts`, which is unrelated to probe rewriting. It was replaced with `values.sidecarInjectorWebhook.rewriteAppHTTPProbe: true`.
- The post said TCP probes are not rewritten. Current Istio documentation says HTTP, TCP, and gRPC probes are rewritten by default, with TCP handled by the sidecar agent to avoid Envoy redirection making all captured ports appear open. The TCP section was corrected.
- The HTTPS probe section implied that only the rewritten probe's HTTP scheme mattered. It now clarifies that the agent preserves and uses the original `scheme: HTTPS` setting when connecting to the application.
- The sidecar injector ConfigMap check used `.data.config`, but the rewrite setting is part of the injector values. The command was updated to inspect `.data.values`.
- Troubleshooting text referred to checking annotations for probe forwarding. This was corrected to check `ISTIO_KUBE_APP_PROBERS`.

## Review Notes
- `kubectl` was not installed in the local environment, so command syntax was reviewed against official Kubernetes and Istio documentation instead of local CLI help.
- The `sidecar.istio.io/rewriteAppHTTPProbers` annotation is documented by Istio as Alpha and scoped to Pod resources. In a Deployment, it must be placed under `spec.template.metadata.annotations`, as shown in the post's examples.
