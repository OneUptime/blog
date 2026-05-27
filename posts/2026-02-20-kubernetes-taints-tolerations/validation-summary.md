# Validation Summary: How to Use Kubernetes Taints and Tolerations for Workload Isolation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes taints and tolerations
- Kubernetes scheduler behavior
- Kubernetes node affinity and node selectors
- Kubernetes Deployments, Pods, and DaemonSets
- kubectl node tainting, labeling, and debugging commands

## Sources Consulted
- Kubernetes documentation: Taints and Tolerations - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes kubectl reference: kubectl taint - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Kubernetes documentation: DaemonSet - https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes documentation: Node-pressure Eviction - https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes API reference: Pod v1 - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/

## Issues Found
- The GPU pod example described `requiredDuringSchedulingIgnoredDuringExecution` node affinity as preferring GPU nodes. This is a required scheduling rule, so the comment was changed to say it requires GPU nodes.
- The node-condition example said a `node.kubernetes.io/memory-pressure:NoSchedule` toleration means the pod will not be evicted. `NoSchedule` controls scheduling onto tainted nodes and does not prevent kubelet node-pressure eviction, so the comment was changed to say it allows scheduling onto nodes with memory pressure.
- The DaemonSet example implied that a broad toleration guarantees the DaemonSet runs on every node. Tolerations only remove taint-based scheduling blocks; other scheduling constraints and resource availability still apply. The comments were softened to say the DaemonSet can run on tainted nodes and that taints do not block it.

## Review Notes
The technical examples use current Kubernetes API fields and valid taint effects, toleration operators, node selectors, node affinity fields, resource requests, hostPath volumes, and kubectl taint syntax. The local environment did not have `kubectl` installed, so command validation was done against the official generated kubectl reference instead of local `kubectl --help` output.
