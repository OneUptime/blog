# Validation Summary: How to Configure Log Rotation for Dapr Sidecar

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes (kubelet log rotation configuration)
- Dapr (sidecar logging annotations)
- Azure Kubernetes Service (AKS) kubelet customization
- Amazon EKS (bootstrap script kubelet args)
- Prometheus / node_exporter (disk usage alerting)
- Fluent Bit (centralized log collection)

## Sources Consulted
- Kubernetes KubeletConfiguration v1beta1 reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes Logging Architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- AKS Custom Node Configuration: https://learn.microsoft.com/en-us/azure/aks/custom-node-configuration
- EKS bootstrap.sh source: https://github.com/awslabs/amazon-eks-ami
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Fluent Bit tail input plugin documentation and source code
- Prometheus node_exporter filesystem collector source code

## Issues Found
No technical issues found.

## Review Notes
- The EKS section uses kubelet CLI flags (`--container-log-max-size`, `--container-log-max-files`) passed via `--kubelet-extra-args`. These flags are deprecated in newer Kubernetes versions in favor of setting the values in a kubelet config file. The approach still works and is widely used, but future readers on newer EKS/Kubernetes versions should prefer the config-file approach.
- The `kubectl describe node | grep "Allocated resources"` command shows pod resource allocations (requests/limits) rather than actual node disk usage. It does include ephemeral-storage allocations, which is related but not the same as actual disk consumption. The `du` command and Prometheus alert that follow are more direct measures of actual disk usage.
- The Prometheus alert uses `$labels.node`, which requires relabeling rules to add a `node` label to node_exporter metrics (common in kube-prometheus-stack setups but not universal). In vanilla Prometheus setups, `$labels.instance` may be more appropriate.
