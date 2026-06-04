# Validation Summary: How to Implement Leader Election in Custom Kubernetes Controllers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes Lease API (`coordination.k8s.io/v1`)
- client-go leader election
- controller-runtime manager leader election
- Kubernetes RBAC
- Prometheus metrics
- kubectl

## Sources Consulted
- Kubernetes documentation: Leases - https://kubernetes.io/docs/concepts/architecture/leases/
- Kubernetes API reference: Lease `coordination.k8s.io/v1` - https://kubernetes.io/docs/reference/kubernetes-api/coordination/lease-v1/
- client-go `leaderelection` package documentation - https://pkg.go.dev/k8s.io/client-go/tools/leaderelection
- client-go `resourcelock` package documentation - https://pkg.go.dev/k8s.io/client-go/tools/leaderelection/resourcelock
- controller-runtime manager options documentation - https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/manager
- controller-runtime metrics package documentation and source - https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/metrics
- controller-runtime metrics server options documentation - https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/metrics/server
- controller-runtime webhook server documentation - https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/webhook

## Issues Found
- The post described leader election as guaranteeing exactly one active reconciler. client-go documents that its leader election implementation is not a fencing mechanism, so I softened the language to say leader election coordinates active reconciliation and added a note that reconcilers should remain idempotent and retry-safe.
- The controller-runtime example used outdated `ctrl.Options` fields: `MetricsBindAddress` and `Port`. Current controller-runtime uses `Metrics: metricsserver.Options{BindAddress: ...}` and `WebhookServer: webhook.NewServer(webhook.Options{Port: ...})`, so I updated the snippet and imports.
- The controller-runtime example imported `k8s.io/apimachinery/pkg/runtime` without using it and referenced an undefined `scheme` identifier. I changed the example to import `k8s.io/client-go/kubernetes/scheme` and use `scheme.Scheme`.
- The client-go example comment said the root context would be cancelled when leadership is lost. In client-go, the callback context passed to `OnStartedLeading` is cancelled when leadership stops; the root context controls the election loop. I corrected the comment.

## Review Notes
The RBAC snippet is sufficient for the shown `LeaseLock` operations against Lease objects (`get`, `create`, and `update`). Some generated controller projects grant broader permissions such as `list`, `watch`, `patch`, or event permissions depending on their scaffolding and recording behavior, but those broader permissions are not required by the specific minimal example shown.
