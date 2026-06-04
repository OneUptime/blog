# Validation Summary: How to Configure Resource-Constrained Kubernetes Nodes with K3s Memory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- K3s
- Kubelet resource reservations and eviction settings
- Kubernetes resource requests, limits, LimitRanges, and ResourceQuotas
- Kubernetes PriorityClasses and pod eviction behavior
- containerd configuration behavior in K3s
- Prometheus node_exporter

## Sources Consulted
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Advanced Options / containerd configuration: https://docs.k3s.io/advanced
- K3s Managing Packaged Components: https://docs.k3s.io/installation/packaged-components
- Kubernetes Reserve Compute Resources for System Daemons: https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Kubernetes Node-pressure Eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Images / serial and parallel image pulls: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes kubelet command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Prometheus node_exporter README: https://github.com/prometheus/node_exporter

## Issues Found
- Corrected the K3s minimum-memory claim. K3s supports agent nodes with 512MB RAM, but current K3s requirements list server nodes as needing more capacity.
- Corrected allocatable-resource math for a 2GB node by accounting for both reservations and the hard memory eviction margin.
- Removed `pods-per-core=5` from the example because it would cap a 2-core node at 10 pods, conflicting with the example `pods: "50"` allocatable output.
- Replaced the ineffective `NGINX_WORKER_PROCESSES` environment variable with an nginx command-line global directive that actually sets `worker_processes 1`.
- Reduced the ResourceQuota example so namespace limits do not exceed the constrained-node capacity shown earlier in the post.
- Updated K3s `--disable` examples to the documented `--disable=<component>` form.
- Replaced the incorrect containerd section. Editing K3s-generated `config.toml` directly is not persistent, and `SystemdCgroup = true` is not a memory limit. The post now explains kubelet serial image pulls and warns against direct edits to the generated containerd file.
- Fixed the node_exporter filesystem exclusion regex from `($$|/)` to `($|/)` for Kubernetes YAML, where dollar signs do not need Docker Compose-style escaping.
- Corrected the eviction-order explanation to match Kubernetes documentation: kubelet ranks pods by whether usage exceeds requests, pod priority, and usage relative to requests; it does not simply evict by QoS class alone.
- Changed the critical-pod example to use `system-cluster-critical` in `kube-system` and clarified that this is for critical add-ons and rescheduling priority, not an absolute eviction shield.
- Corrected the conclusion so it does not imply every K3s cluster role can run production workloads on 1GB RAM.

## Review Notes
The post is now technically accurate as a general K3s/Kubernetes resource-management guide. Kubelet CLI flags shown in the post are still accepted through K3s `--kubelet-arg`, but Kubernetes documentation increasingly recommends kubelet configuration files for many kubelet settings.
