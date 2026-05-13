# Validation Summary: How to Configure Flagger for Canary Deployments with gRPC Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger Canary custom resources
- Kubernetes Deployments, Services, readiness probes, and kubectl
- Istio traffic management, VirtualService routing, protocol selection, and telemetry
- Prometheus and PromQL MetricTemplates
- gRPC services and gRPC health checking

## Sources Consulted
- Flagger docs: How it works / Canary service, https://docs.flagger.app/usage/how-it-works
- Flagger docs: Metrics analysis and MetricTemplate variables, https://docs.flagger.app/main/usage/metrics
- Flagger FAQ: Istio routing and built-in metric behavior, https://docs.flagger.app/faq
- Istio docs: Protocol selection, https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio docs: Standard metrics, https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes docs: Liveness, readiness, and startup probes, https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes kubectl reference: kubectl set image, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- gRPC health checking protocol, https://github.com/grpc/grpc/blob/master/doc/health-checking.md

## Issues Found
- The post said Istio recognizes gRPC from a Deployment container port name with a `grpc-` prefix. Istio protocol selection is based on Kubernetes Service ports, and Flagger generates those Services from the Canary service spec. Updated the wording to point readers to the Canary service configuration instead.
- The Canary example set `appProtocol: grpc` but omitted `portName: grpc`. Flagger documents `service.portName` as the field to set for gRPC workloads, while `appProtocol` is optional and also useful for Istio. Added `portName: grpc`.
- The post stated Kubernetes v1.24+ supports native gRPC health checks without qualification. Kubernetes documents gRPC probes as stable in v1.27. Updated the prerequisite and health-checking text to v1.27+.
- The post described gRPC status codes as HTTP-mapped in Istio metrics. Istio documents `grpc_response_status` as the gRPC-specific metric label. Reworded the built-in metrics explanation and the custom metrics introduction.
- The streaming section said Istio metrics are per-stream, not per-message. Istio has request/duration metrics for HTTP, HTTP/2, and gRPC traffic and also separate gRPC request/response message counters. Updated the note to distinguish RPC-level metrics from message counters.
- The streaming section implied Istio handles new streams from existing connections independently in all cases. Reworded it to avoid overstating redistribution behavior for existing long-lived streams and to say new RPCs can follow current VirtualService weights.

## Review Notes
The YAML snippets are structurally consistent with the documented Kubernetes, Flagger, and Istio APIs. The `kubectl set image` command form matches the official kubectl reference, but `kubectl` is not installed in this workspace, so local CLI help could not be used for verification.
