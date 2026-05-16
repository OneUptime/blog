# Validation Summary: How to Troubleshoot OOMKilled Pods on Talos Linux

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Talos Linux
- Kubernetes pods and container resource management
- Kubernetes OOMKilled container termination
- Kubernetes node pressure and QoS classes
- Kubernetes Vertical Pod Autoscaler
- kubectl
- talosctl
- JVM and Node.js memory limit examples

## Sources Consulted
- Kubernetes documentation: Assign Memory Resources to Containers and Pods - https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/
- Kubernetes documentation: Pod Quality of Service Classes - https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes kubectl reference: top command - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes documentation: Reserve Compute Resources for System Daemons - https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Kubernetes kubelet command reference - https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes documentation: Vertical Pod Autoscaling - https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Sidero Labs Talos documentation: Logging - https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/logging-and-telemetry/logging
- Sidero Labs Talos documentation: talosctl reference - https://docs.siderolabs.com/talos/v1.12/reference/cli
- Sidero Labs Talos documentation: MachineConfig reference - https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config

## Issues Found
- The opening and summary stated that OOMKilled pods are caused by exceeding configured memory limits. Updated both to also account for node-level out-of-memory conditions, which the post later discusses.
- The post described exit code 137 as the standard indicator of an OOM kill. Updated it to clarify that 137 means SIGKILL, and it indicates OOM specifically when paired with the Kubernetes `OOMKilled` reason.
- The Talos process inspection command manually sorted the output with `sort -k4`, which is unreliable because Talos output columns can vary and the CLI provides a supported RSS sort option. Replaced it with `talosctl -n <node-ip> processes --sort rss | head -20`.
- The kubelet reservation example used command-line flag names under `extraArgs`. Updated it to use current kubelet configuration fields under Talos `machine.kubelet.extraConfig`.
- The VPA example used `updateMode: Auto`, which is deprecated in VPA 1.4.0 and later. Replaced it with `updateMode: Recreate`.
- The VPA explanation said VPA automatically adjusts memory requests and limits. Updated it to clarify that limits depend on policy.

## Review Notes
The remaining commands and snippets are consistent with the referenced documentation. `kubectl top` requires Metrics Server or another metrics pipeline, which the post assumes but does not explicitly state.
