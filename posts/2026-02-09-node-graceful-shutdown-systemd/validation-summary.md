# Validation Summary: How to Configure Kubernetes Node Graceful Shutdown for Systemd Integration

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Kubernetes kubelet graceful node shutdown
- Kubernetes KubeletConfiguration v1beta1
- Kubernetes PriorityClass and pod lifecycle hooks
- systemd inhibitor locks and logind configuration
- kubectl and journalctl troubleshooting commands
- Prometheus alerting configuration

## Sources Consulted
- Kubernetes Node Shutdowns documentation: https://kubernetes.io/docs/concepts/cluster-administration/node-shutdown/
- Kubernetes KubeletConfiguration v1beta1 API reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes Pod Priority and Preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Guaranteed Scheduling For Critical Add-On Pods: https://kubernetes.io/docs/tasks/administer-cluster/guaranteed-scheduling-critical-addon-pods/
- Kubernetes Pod Lifecycle documentation: https://v1-34.docs.kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes cgroup driver documentation: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/configure-cgroup-driver/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- systemd-inhibit manual: https://www.freedesktop.org/software/systemd/man/latest/systemd-inhibit.html
- systemd logind.conf manual: https://www.freedesktop.org/software/systemd/man/latest/logind.conf.html

## Issues Found
- The post described the two-phase graceful node shutdown order backwards. Kubernetes terminates regular pods first and critical pods last. Updated the phase explanation, grace-period example, and testing expectation.
- The post attempted to define `system-cluster-critical` and `system-node-critical` PriorityClasses manually. Kubernetes already ships these built-in classes, `system-` prefixes are reserved, and custom PriorityClass values must be no greater than 1,000,000,000. Removed those definitions and kept only custom application PriorityClasses.
- The example application pod used a built-in critical PriorityClass for a database workload. Changed the example to a generic critical cluster add-on so the built-in system-critical class is used in the intended context.
- The `shutdownGracePeriodByPodPriority` example combined that field with `shutdownGracePeriod` and `shutdownGracePeriodCriticalPods`, but the kubelet config API requires `shutdownGracePeriodByPodPriority` to be empty if either of the other two fields is set. Removed the mutually exclusive fields from that example.
- The troubleshooting command checked `InhibitDelayMaxSec` on `kubelet.service`, but it is a logind setting. Replaced it with checks for active kubelet inhibitor locks and logind configuration.
- The monitoring command filtered Kubernetes events for a `NodeShutdown` reason that is not what the official node shutdown docs show for terminated pods. Replaced it with a command that looks for the documented shutdown termination message in pod descriptions.
- The kubelet service drop-in instructions were too broad for all installation methods. Clarified that the `KUBELET_CONFIG_ARGS` example applies to kubeadm-managed nodes.

## Review Notes
All YAML snippets were syntax-checked with PyYAML after the fixes. The `GracefulNodeShutdown` feature gate is enabled by default on Linux in Kubernetes v1.21 and later, and `GracefulNodeShutdownBasedOnPodPriority` is beta and enabled by default in current Kubernetes documentation, but explicitly setting the gates remains understandable for version-aware configuration examples.
