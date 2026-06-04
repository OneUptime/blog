# Validation Summary: How to Tune kubelet evictionHard and evictionSoft Thresholds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubelet
- KubeletConfiguration v1beta1
- Node-pressure eviction
- kubectl
- Prometheus alerting and metrics

## Sources Consulted
- Kubernetes Node-pressure Eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes KubeletConfiguration v1beta1 reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes kubelet configuration file task: https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/
- Kubernetes Pod Quality of Service Classes documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics

## Issues Found
- The eviction signal list omitted `containerfs` signals. Added `containerfs.available` and `containerfs.inodesFree`, with the Kubernetes caveat that custom `containerfs` thresholds are not supported and are derived by kubelet.
- The soft eviction description said pod termination grace periods are honored. Corrected this to state that kubelet uses the configured maximum pod grace period, and clarified that the effective grace period is the lesser of the pod grace period and `evictionMaxPodGracePeriod`.
- The hard eviction example omitted `imagefs.inodesFree`, and later partial `evictionHard` examples could unintentionally set omitted hard thresholds to zero. Added `imagefs.inodesFree` in the full example and `mergeDefaultEvictionSettings: true` where examples intentionally provide partial hard thresholds.
- The pressure transition section said kubelet stops scheduling new pods. Corrected this to explain that kubelet reports the pressure condition and the control plane maps it to a taint.
- The heterogeneous-node section said to deploy kubelet config via DaemonSet, but the shown object was a ConfigMap and kubelet config is normally applied through node provisioning, kubeadm, or host-level automation. Updated the wording to avoid implying a ConfigMap alone updates kubelet configuration.
- The `kubectl get nodes -o custom-columns` command used fragile JSONPath quoting. Rewrote it with shell-safe quoting.
- The Prometheus examples used `kubelet_evictions_total`; the Kubernetes Metrics Reference lists the kubelet eviction counter as `kubelet_evictions`. Updated the query and alert expression, and changed the alert description to use the scrape `instance` label rather than assuming a metric-provided `node` label.
- The pod eviction order section described eviction as strict QoS-class ordering. Updated it to match Kubernetes documentation: kubelet ranks by whether usage exceeds requests, then pod priority, then usage relative to requests. Kept QoS as an estimate for likely memory-pressure eviction behavior.
- The Guaranteed pod example only specified memory requests and limits, which makes it Burstable rather than Guaranteed. Added equal CPU requests and limits.
- The `watch kubectl describe ... | grep ...` example piped `watch` output rather than running the full pipeline under `watch`. Quoted the command passed to `watch`.
- The reservation enforcement example included `system-reserved` and `kube-reserved` in `enforceNodeAllocatable` without the required cgroup fields. Added `systemReservedCgroup` and `kubeReservedCgroup` placeholders and a note to adjust them for the node's cgroup layout.

## Review Notes
The post is technically relevant and current after fixes. The memory threshold sizing formula is guidance rather than a Kubernetes-defined rule; it remains acceptable as a practical tuning heuristic.
