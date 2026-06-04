# Validation Summary: How to Write a Custom Kubernetes Scheduler from Scratch in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes scheduler and custom scheduler selection
- Kubernetes Pods, Nodes, taints, tolerations, node selectors, and Binding subresource
- Kubernetes resource requests and node allocatable resources
- Kubernetes events.k8s.io/v1 Events
- Go and Kubernetes client-go
- Docker and Kubernetes Deployment/RBAC manifests

## Sources Consulted
- Kubernetes Scheduler documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/
- Kubernetes Configure Multiple Schedulers documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/
- Kubernetes Resource Management for Pods and Containers documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes events.k8s.io/v1 Event API reference: https://kubernetes.io/docs/reference/kubernetes-api/events/event-v1/
- Kubernetes Deprecated API Migration Guide for Event API changes: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- client-go package documentation: https://pkg.go.dev/k8s.io/client-go
- client-go typed core/v1 package documentation: https://pkg.go.dev/k8s.io/client-go/kubernetes/typed/core/v1
- client-go repository README and compatibility guidance: https://github.com/kubernetes/client-go
- client-go master go.mod for current Go toolchain requirement: https://raw.githubusercontent.com/kubernetes/client-go/master/go.mod

## Issues Found
- The Go snippets were split into separate files but later snippets omitted `package main` and required imports, while `main.go` imported packages it did not use. I added the missing package/import blocks and removed unused imports so the examples are structurally compilable as separate files.
- The scheduler loop listed every pod with an empty `spec.nodeName` and then filtered by scheduler name in memory. I changed it to use Kubernetes-supported field selectors for `spec.nodeName`, `spec.schedulerName`, and `status.phase=Pending`.
- The resource filter compared the incoming pod's requests only against node allocatable CPU and memory, ignoring resources already requested by pods on that node. I updated filtering and resource scoring to subtract existing scheduled pod requests and to account for init container requests and pod overhead.
- The event creation example used the older core/v1 Event shape with `InvolvedObject`, `Message`, `Source`, and timestamp fields. I updated it to create an `events.k8s.io/v1` Event using `Regarding`, `Note`, `EventTime`, `Action`, `ReportingController`, and `ReportingInstance`.
- The Dockerfile used `golang:1.21` while the dependency commands use `k8s.io/client-go@latest`; current client-go development requires a newer Go toolchain. I updated the builder image to `golang:1.26`.

## Review Notes
The tutorial remains a simplified polling scheduler. A production scheduler would normally use informers/workqueues, retries/backoff, conflict handling, leader election for multiple replicas, richer predicates such as affinity/topology/volume constraints, and more granular RBAC than binding directly to `system:kube-scheduler`. Local compilation was not run because the workspace does not have the `go` binary installed.
