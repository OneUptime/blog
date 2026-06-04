# Validation Summary: How to Use Cluster Autoscaler Expander Strategies for Node Pool Selection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Cluster Autoscaler
- Cluster Autoscaler expander strategies
- Kubernetes Deployments, ConfigMaps, Services, and CronJobs
- kubectl
- Prometheus metrics and PromQL
- gRPC

## Sources Consulted
- Kubernetes Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Cluster Autoscaler priority expander documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/expander/priority/readme.md
- Cluster Autoscaler gRPC expander documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/expander/grpcplugin/README.md
- Cluster Autoscaler flags source: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/config/flags/flags.go
- Cluster Autoscaler expander source: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/expander/expander.go
- Cluster Autoscaler metrics source: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/metrics/metrics.go
- Cluster Autoscaler price expander proposal: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/proposals/pricing.md
- Kubernetes Autoscaler releases: https://github.com/kubernetes/autoscaler/releases

## Issues Found
- The post said the `random` expander is the default. Updated it to state that `least-waste` is the default, matching the current Cluster Autoscaler flag default.
- The `price` expander description implied broad cloud-provider support. Updated it to note that it is limited to providers with pricing support, such as GCE/GKE and Equinix Metal.
- The Cluster Autoscaler image example used `v1.28.2`, which is outdated as of the validation date. Updated it to `v1.35.0`, and operators should still match the Cluster Autoscaler minor version to their Kubernetes cluster minor version.
- The priority ConfigMap section and time-based script implied a restart was needed to load ConfigMap changes. Updated the post to state that Cluster Autoscaler watches the ConfigMap and loads changes automatically.
- The Most-Pods section used an incomplete `apps/v1` Deployment manifest that would not be directly valid. Replaced it with a `kubectl patch` command.
- The gRPC expander example omitted the required gRPC certificate flag and used a shorter service DNS name. Added `--grpc-expander-cert`, a Secret volume mount, and the full `SERVICE.NAMESPACE.svc.cluster.local:PORT` form.
- The Prometheus per-node-group metric examples used incorrect metric names. Updated them to the current `cluster_autoscaler_node_group_min_count`, `cluster_autoscaler_node_group_max_count`, and `cluster_autoscaler_node_group_target_count` names and noted that they require `--emit-per-nodegroup-metrics=true`.

## Review Notes
- The manifest examples are illustrative and still omit production-specific Cluster Autoscaler settings such as node group discovery flags, RBAC, and provider-specific permissions.
- The `price` expander remains provider-specific; for AWS spot/on-demand preference, the priority expander examples are the appropriate pattern.
