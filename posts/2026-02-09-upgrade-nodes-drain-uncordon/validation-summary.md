# Validation Summary: How to Upgrade Kubernetes Cluster Nodes One at a Time with Drain and Uncordon

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubeadm
- kubectl
- Linux package management with apt
- PodDisruptionBudgets
- Kubernetes node drain and uncordon workflows

## Sources Consulted
- Kubernetes documentation: Upgrading kubeadm clusters - https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/
- Kubernetes documentation: Upgrading Linux nodes - https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/upgrading-linux-nodes/
- Kubernetes kubectl reference: kubectl drain - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kubectl reference: kubectl version - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes API reference: ComponentStatus - https://kubernetes.io/docs/reference/kubernetes-api/core/component-status-v1/
- Kubernetes API health endpoints - https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes blog: pkgs.k8s.io package repositories - https://kubernetes.io/blog/2023/08/15/pkgs-k8s-io-introduction/
- Kubernetes documentation: Pod disruptions and PodDisruptionBudgets - https://kubernetes.io/docs/concepts/workloads/pods/disruptions/

## Issues Found
- The post described the workflow as guaranteeing zero downtime. This was changed to "minimize downtime" and "helping service continuity" because Kubernetes drain and uncordon respect availability mechanisms such as PodDisruptionBudgets, but application availability still depends on workload replicas, budgets, storage, topology, and traffic routing.
- The drain explanation said it evicts all pods. This was changed to "eligible pods" because `kubectl drain` does not delete mirror pods, requires `--ignore-daemonsets` for DaemonSet-managed pods, and may require `--force` for unmanaged pods.
- The examples used `kubectl version --short`. This was changed to `kubectl version` because the current generated kubectl reference documents `kubectl version` with `--client` and `-o`, but no `--short` option.
- The apt package examples used legacy package revisions such as `1.28.0-00` and `1.27.0-00`. These were changed to current wildcard package selectors such as `1.28.x-*` and script usage with `${VERSION}-*`, matching the Kubernetes package repository format where the old `-00` revision format is no longer used.
- The monitoring examples used `kubectl get componentstatuses`. This was replaced with `kubectl get --raw='/readyz?verbose'` because the ComponentStatus API is deprecated in Kubernetes v1.19+ and API server readiness endpoints are the documented replacement for health checks.
- The dashboard script labeled `.status.conditions[-1].type` as node status. This was changed to query the `Ready` condition's `.status` value explicitly.

## Review Notes
- The post remains version-specific around Kubernetes 1.28. Kubernetes 1.28 is no longer a current supported minor release as of the validation date, so readers should substitute the target supported minor version and latest patch release for their environment.
- The examples assume Debian/Ubuntu-style apt package management and a kubeadm-created cluster. Other distributions, managed Kubernetes services, and non-kubeadm clusters require different upgrade procedures.
