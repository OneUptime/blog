# Validation Summary: How to Configure gRPC in Kubernetes with IPv4 ClusterIP Services

## Status
validated

## Post Type
Guide

## Technologies Covered
- gRPC
- gRPC-Go
- Kubernetes Services
- Kubernetes Ingress
- ingress-nginx
- Kubernetes health probes
- grpcurl

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx gRPC example: https://kubernetes.github.io/ingress-nginx/examples/grpc/
- Kubernetes probe configuration: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- gRPC-Go package reference: https://pkg.go.dev/google.golang.org/grpc
- gRPC-Go load balancing example: https://pkg.go.dev/google.golang.org/grpc/examples/features/load_balancing
- gRPC health checking guide: https://grpc.io/docs/guides/health-checking/
- gRPC graceful shutdown guide: https://grpc.io/docs/guides/server-graceful-stop/

## Issues Found
- The ingress example used the deprecated `kubernetes.io/ingress.class` annotation. I replaced it with `spec.ingressClassName: nginx` because current Kubernetes documents `ingressClassName` as the replacement.
- The Deployment manifest used `exec` probes that call `/bin/grpc_health_probe`, but the manifest did not install that binary into the container image. I replaced those probes with native Kubernetes `grpc` probes, which are the current built-in mechanism for services that implement the gRPC Health Checking Protocol.
- The section titled "Verify from Inside the Cluster" used `kubectl port-forward`, which is a local workstation workflow rather than an in-cluster check. I renamed the section accordingly.
- The `grpcurl` verification commands implicitly depended on server reflection. I added that assumption so the commands are accurate as written.
- The conclusion overstated the behavior of ClusterIP services and used the ambiguous phrase "gRPC grace period". I clarified that the limitation is per-RPC load balancing over long-lived HTTP/2 connections, and that `terminationGracePeriodSeconds` should exceed the application's graceful shutdown timeout.

## Review Notes
- The updated probe example assumes a Kubernetes version that supports native gRPC probes, which are stable in Kubernetes v1.27 and later.
- Native gRPC probes, like `grpc_health_probe`, require the application to implement the standard gRPC Health Checking Protocol.
- The headless-service + `dns:///` + `round_robin` client example is consistent with current gRPC-Go behavior and Kubernetes headless Service DNS behavior.
