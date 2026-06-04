# Validation Summary: How to implement DaemonSet with custom scheduler for advanced placement

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes DaemonSets
- Kubernetes scheduler profiles and multiple schedulers
- kube-scheduler configuration
- Scheduler extenders
- Node selectors, node affinity, tolerations, and priority classes
- kubectl troubleshooting commands
- Node Feature Discovery labels

## Sources Consulted
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes scheduler configuration documentation: https://kubernetes.io/docs/reference/scheduling/config/
- Kubernetes kube-scheduler configuration v1 API reference: https://kubernetes.io/docs/reference/config-api/kube-scheduler-config.v1/
- Kubernetes multiple schedulers task: https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Node Feature Discovery feature labels documentation: https://kubernetes-sigs.github.io/node-feature-discovery/v0.18/usage/features.html

## Issues Found
- The original post claimed custom schedulers let DaemonSets go beyond the one-pod-per-node placement model. Updated the explanation to clarify that the DaemonSet controller creates one pod per eligible node and adds node affinity targeting that node; a custom scheduler can bind and evaluate those pods but does not choose freely among all cluster nodes.
- The scheduler example described a custom implementation but only showed kube-scheduler profile configuration. Updated the example to use the official `kube-scheduler` image and binary with a custom profile, and revised the explanation to describe scheduler profiles and built-in scoring plugins accurately.
- The post implied scheduler scoring could select optimal nodes for DaemonSet pods. Updated the text to explain that scoring has limited impact because each DaemonSet pod is constrained to a target node chosen by the DaemonSet controller.
- The NUMA example exposed an annotation through the Downward API without showing how that annotation would be set. Removed the unset environment variable from the manifest and added a note that a webhook or controller should annotate the pod before exposing that value.
- The AVX-512 node selector used a non-standard label key. Updated it to the Node Feature Discovery label format `feature.node.kubernetes.io/cpu-cpuid.AVX512F`.
- The cost-optimized example used preferred affinity, which would not reduce DaemonSet pods because preferred affinity does not define DaemonSet eligibility. Changed it to required node affinity and updated the explanation.
- The scheduler extender explanation implied full placement freedom. Updated it to note that DaemonSet pods remain constrained to target nodes selected by the DaemonSet controller.

## Review Notes
The embedded YAML examples parse successfully with PyYAML. Local `kubectl` was not installed in the workspace, so kubectl command syntax was checked against official Kubernetes command reference pages rather than local `--help` output.
