# Validation Summary: How to Fix Calico Node Pod Eviction

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- Kubernetes DaemonSets
- Kubernetes node-pressure eviction
- Kubernetes PriorityClass
- FelixConfiguration
- kubectl
- Docker CLI
- crictl
- systemd journalctl

## Sources Consulted
- Kubernetes node-pressure eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes critical add-on pod scheduling documentation: https://kubernetes.io/docs/tasks/administer-cluster/guaranteed-scheduling-critical-addon-pods/
- Kubernetes pod priority and preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Docker system prune reference: https://docs.docker.com/reference/cli/docker/system/prune/
- Docker pruning guide: https://docs.docker.com/engine/manage-resources/pruning/
- Kubernetes SIGs cri-tools crictl documentation: https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md

## Issues Found
- The post claimed that setting `system-node-critical` prevents future calico-node evictions. Kubernetes documentation says marking a non-static pod as critical is not meant to prevent evictions entirely; it improves priority and ensures critical add-on pods are rescheduled. I changed the wording to say it improves eviction priority and rescheduling and reduces, rather than eliminates, re-eviction risk.
- The root cause phrasing implied that lacking `system-node-critical` directly causes eviction. Kubernetes eviction order also depends on resource usage versus requests and resource pressure type, so I changed the text to say the missing priority class makes calico-node lower priority during eviction decisions.
- The cleanup command comment described `journalctl --vacuum-size=500M` as cleaning Docker/container runtime logs. That command vacuums systemd journal files, so I corrected the comment.
- The Docker cleanup comment said it cleaned old container images, but `docker system prune -f` removes unused Docker data and dangling images by default, while `crictl rmi --prune` removes unused images. I changed the comment to describe unused container runtime data/images.
- The resource patch used JSON Patch `replace` on `/spec/template/spec/containers/0/resources`, which can fail if the field is absent and can target the wrong container if the container order differs. I changed it to a Kubernetes strategic merge patch keyed by the documented container merge key `name: calico-node`.
- The verification step expected "no pressure conditions" from `kubectl describe node`, but Kubernetes reports pressure condition rows with statuses such as `False`. I changed the expected result to `DiskPressure` and `MemoryPressure` being `False`.

## Review Notes
The guide is technically relevant and valid after edits. Resource requests and limits should be tuned for the specific Calico version, enabled dataplane features, node size, and workload; memory limits that are too low can cause calico-node restarts. The local environment did not have `kubectl` installed, so kubectl command validation was performed against official Kubernetes CLI documentation rather than local `--help` output.
