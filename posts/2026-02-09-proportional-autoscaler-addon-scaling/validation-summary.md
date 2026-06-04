# Validation Summary: How to Configure Proportional Autoscaler for Cluster Addon Scaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- cluster-proportional-autoscaler
- Kubernetes Deployments
- Kubernetes RBAC
- Kubernetes ConfigMaps
- CoreDNS
- metrics-server

## Sources Consulted
- Kubernetes SIGs cluster-proportional-autoscaler documentation: https://kubernetes-sigs.github.io/cluster-proportional-autoscaler/
- Kubernetes SIGs cluster-proportional-autoscaler examples and RBAC configuration: https://kubernetes-sigs.github.io/cluster-proportional-autoscaler/examples/
- Kubernetes SIGs cluster-proportional-autoscaler GitHub releases: https://github.com/kubernetes-sigs/cluster-proportional-autoscaler/releases
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes SIGs metrics-server documentation: https://kubernetes-sigs.github.io/metrics-server/

## Issues Found
- The deployment examples used `registry.k8s.io/cpa/cluster-proportional-autoscaler:v1.8.9`, while the current upstream release is `v1.10.3`. Updated both examples to use `registry.k8s.io/cpa/cluster-proportional-autoscaler:v1.10.3`.
- The linear scaling formula applied `min` before `max`, while the upstream documentation applies `max` first and then `min`. Updated the formula order to match the official documentation.
- The description of `preventSinglePointFailure` said it always ensures at least 2 replicas. Upstream documentation specifies this applies when there is more than one node. Updated the parameter description and best practice note.
- The troubleshooting section said JSON parsing errors fail silently and use default parameters. Updated this to advise checking autoscaler logs for JSON parsing errors, which is more accurate for the controller behavior.

## Review Notes
- The manifest structure, RBAC resources, ConfigMap keys (`linear` and `ladder`), scaling flags, target format, and poll interval matched the official cluster-proportional-autoscaler documentation.
- `kubectl` was not installed in the local environment, so command behavior was verified against official Kubernetes and upstream project documentation rather than local CLI help output.
