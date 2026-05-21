# Validation Summary: How to Use Fortio for Istio Load Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Fortio
- Istio service mesh
- Kubernetes
- kubectl
- Docker
- gRPC
- HTTP load testing

## Sources Consulted
- Fortio official README and command documentation: https://github.com/fortio/fortio
- Fortio v1.75.1 CLI help from the official `fortio/fortio:latest` Docker image
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/

## Issues Found
- The "Key Fortio Flags" command used inline comments after trailing backslashes. In bash, that prevents proper line continuation and would cause the command to be parsed incorrectly. I removed the inline comments from the command and added the explanations in prose immediately after it.
- The gRPC section described `-grpc -ping` as "gRPC health check pinging." Fortio's CLI help says `-grpc` uses health checks by default and `-ping` switches to Fortio's gRPC ping service. I updated the wording to distinguish health checks from Fortio ping.
- The output analysis said any non-200 code indicates an issue. That is too narrow because valid APIs may return other 2xx success codes such as 201. I changed it to "non-2xx or unexpected status codes."

## Review Notes
- The examples use `fortio/fortio:latest`, which is valid but less reproducible than a pinned image tag. This is not technically incorrect, but pinning a version would make future benchmark runs easier to compare.
- The `kubectl cp` examples are syntactically correct, but Kubernetes notes that `kubectl cp` requires `tar` in the container image.
