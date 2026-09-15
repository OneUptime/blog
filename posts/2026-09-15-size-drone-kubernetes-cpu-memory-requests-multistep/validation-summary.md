# Validation Summary: How to Set CPU and Memory Requests for Multi-Step Drone Kubernetes Pipelines

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Drone Kubernetes runner
- Kubernetes CPU and memory resource requests and limits
- Kubernetes scheduling, CPU throttling, and memory OOM behavior
- kubectl pod inspection and Metrics API usage
- Go container images and Go build tooling

## Sources Consulted
- Drone Kubernetes runner resource configuration: https://docs.drone.io/runner/kubernetes/configuration/resources/
- Drone Kubernetes runner compiler implementation: https://github.com/drone-runners/drone-runner-kube/blob/master/engine/compiler/compiler.go
- Kubernetes resource management for Pods and containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Docker Official Image for Go: https://hub.docker.com/_/golang

## Issues Found
No technical issues found.

## Review Notes
The Drone runner documentation and current compiler implementation confirm that pipeline-level requests are divided among compiled steps, including the clone step when enabled and service containers. The implementation also confirms the stated policy precedence, minimum-request behavior, per-step limit capping, integer millicore CPU representation, and supported memory units. The Kubernetes resource and kubectl claims are consistent with the current official documentation. The `golang:1.25` image tag is valid; as an unpinned minor-version tag, it can resolve to newer patch releases within that Go release line.
