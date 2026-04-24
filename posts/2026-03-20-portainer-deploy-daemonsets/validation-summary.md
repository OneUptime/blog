# Validation Summary: How to Deploy DaemonSets in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- DaemonSets
- `kubectl`
- Prometheus Node Exporter
- Fluentd

## Sources Consulted
- Portainer Kubernetes Applications documentation: https://docs.portainer.io/user/kubernetes/applications
- Portainer "Add a new application using code": https://docs.portainer.io/sts/user/kubernetes/applications/manifest
- Portainer "Create an application from a Manifest": https://docs.portainer.io/sts/user/kubernetes/applications/manifest/create
- Portainer "Inspect an application": https://docs.portainer.io/sts/user/kubernetes/applications/inspect
- Portainer "Edit an application": https://docs.portainer.io/sts/user/kubernetes/applications/edit
- Kubernetes DaemonSet concept docs: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes "Running Pods on Only Some Nodes": https://kubernetes.io/docs/tasks/manage-daemon/pods-some-nodes/
- Kubernetes "Perform a Rolling Update on a DaemonSet": https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/
- Kubernetes `kubectl rollout` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes `kubectl rollout status` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes taints and tolerations docs: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes device plugins docs: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/
- Kubernetes GPU scheduling docs: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Prometheus `node_exporter` README: https://github.com/prometheus/node_exporter/blob/master/README.md?plain=1
- Prometheus `node_exporter` releases: https://github.com/prometheus/node_exporter/releases
- Fluentd Kubernetes DaemonSet README: https://github.com/fluent/fluentd-kubernetes-daemonset

## Issues Found
- The Portainer UI steps were outdated. Current Portainer docs use `Applications -> Create from code -> Manifest -> Web editor`, not `Add application` with a generic YAML editor. I updated the deployment steps to match the current UI.
- The examples used `monitoring` and `logging` namespaces without stating that they must already exist. I added that prerequisite so the manifests are not presented as copy-paste ready when the namespaces are missing.
- The tolerations for control-plane taints omitted `operator: Exists`. While the original can work in some cases, Kubernetes documentation and examples use `Exists` for these taints, so I updated both DaemonSet examples for clarity and correctness.
- The Node Exporter example used old image tags and the older `prom/node-exporter` registry path. I updated the example to the current upstream `quay.io/prometheus/node-exporter` image path and recent released versions.
- The Node Exporter manifest claimed root was needed for node metrics. That statement was too strong and not supported by the upstream `node_exporter` container guidance, so I removed the misleading root-only comment and setting.
- The Fluentd example omitted `FLUENT_UID=0`, which the upstream Fluentd Kubernetes DaemonSet docs call out for default `/var/log` access in Kubernetes. I added that environment variable.
- The Fluentd example mounted `/var/lib/docker/containers`, which is Docker-specific and misleading for modern Kubernetes clusters that commonly use containerd or CRI-O. I removed that mount and added a note that CRI-based runtimes need the CRI parser configured via ConfigMap.
- The subset-of-nodes section said "node selector or affinity" but showed both together, and its inline comment did not match the actual label example. I corrected the wording and comments so the behavior matches Kubernetes scheduling semantics.
- The "GPU drivers" use case was imprecise because the cited NVIDIA component is a device plugin, not the driver itself. I corrected that wording.

## Review Notes
- The post is technically relevant and suitable for publication after correction.
- The Fluentd tag `v1-debian-elasticsearch` is still a valid upstream alias, but it is a moving tag. Pinning an exact Fluentd image version would improve reproducibility in a future revision.
- The `kubectl` commands were checked against the official Kubernetes reference documentation. They were not executed locally because `kubectl` is not installed in this workspace.
