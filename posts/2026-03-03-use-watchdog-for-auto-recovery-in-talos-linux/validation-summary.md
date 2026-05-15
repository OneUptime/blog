# Validation Summary: How to Use Watchdog for Auto-Recovery in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux machine configuration
- Talos Linux WatchdogTimerConfig
- Linux kernel watchdog and panic sysctls
- Kubernetes controller manager and API server configuration
- Kubernetes kubelet configuration and eviction settings
- Kubernetes Pod Disruption Budgets
- Kubernetes Deployments and topology spread constraints
- PrometheusRule alerting
- kubectl and talosctl commands

## Sources Consulted
- Talos Linux Watchdog Timers documentation: https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/cluster-operations-and-maintenance/watchdog
- Talos Linux WatchdogTimerConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/runtime/watchdogtimerconfig
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Kubernetes kube-controller-manager reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kubelet configuration reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes disruptions and PodDisruptionBudget documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Pod topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Linux kernel sysctl documentation: https://docs.kernel.org/admin-guide/sysctl/kernel.html

## Issues Found
- The Talos watchdog example configured hardware watchdog behavior through kernel/module arguments instead of the current Talos `WatchdogTimerConfig` document. Replaced it with `WatchdogTimerConfig` and kept kernel watchdog/panic behavior under Talos sysctls.
- The Kubernetes controller-manager example used `pod-eviction-timeout`, which is not a current kube-controller-manager flag. Replaced it with API server default not-ready and unreachable toleration settings for taint-based eviction timing.
- The kubelet examples used deprecated command-line flags for node status and eviction settings. Replaced them with `machine.kubelet.extraConfig` using current `KubeletConfiguration` fields.
- The PDB section claimed PDBs ensure availability during unplanned reboots. Corrected the explanation because PDBs protect voluntary disruptions and only account for involuntary disruptions after they occur.
- The `apps/v1` Deployment manifest was missing the required `spec.selector`. Added a selector matching the pod template labels.
- The text described anti-affinity while the manifest used topology spread constraints. Updated the wording to match the manifest.
- The boot optimization example relied on kernel command-line changes and overstated the effect of log verbosity on recovery time. Replaced it with accurate guidance about boot-time factors.
- The monitoring DaemonSet attempted to run `dmesg` without elevated privileges. Added a privileged security context so the example can read the kernel ring buffer where allowed by node policy.
- The testing section described `talosctl reboot` as a watchdog-triggered reboot. Corrected the wording to describe it as a Talos-triggered controlled simulation.
- The best-practices section recommended `nowayout=1` as the production watchdog setting. Replaced it with guidance to configure Talos `WatchdogTimerConfig` and verify the device per hardware platform.

## Review Notes
The post is technically relevant and implementation-focused. The examples are now aligned with current Talos v1.12 and Kubernetes v1.36 documentation, but production values such as watchdog timeout, node monitor grace period, and default pod toleration seconds should still be load-tested in a staging cluster before rollout.
