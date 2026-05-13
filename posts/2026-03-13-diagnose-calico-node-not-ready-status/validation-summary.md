# Validation Summary: How to Diagnose Calico Node Not Ready Status

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- Calico
- Kubernetes CNI plugins
- kubectl
- Felix
- Linux systemd journal logs

## Sources Consulted
- Kubernetes Network Plugins documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Kubernetes Node Status documentation: https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes Taints and Tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Calico component architecture documentation: https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico CNI plugin installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin
- Calico calico/node installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico Felix configuration documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The post described kubelet network plugin readiness as directly tied to Calico reporting itself ready. Updated this to reflect current Kubernetes behavior: kubelet gets network readiness from the container runtime, which loads CNI configuration and plugin binaries.
- The sample `kubectl describe node` symptom used the non-standard text `NetworkPlugin calico not ready`. Changed it to the more accurate `KubeletNotReady` with `NetworkPluginNotReady` or CNI initialization errors.
- The scheduling symptom said new pods cannot be scheduled on the affected node. Clarified that this applies to pods without matching tolerations, because Kubernetes uses taints such as `node.kubernetes.io/not-ready`.
- The Felix diagnostic command used `calico-node -felix-live`. Replaced it with `/bin/calico-node -felix-ready`, matching Calico's documented readiness probe.
- The root-cause wording about missing kernel modules was too narrow. Broadened it to required kernel modules or dataplane prerequisites.

## Review Notes
The remaining commands are reasonable diagnostic examples. `kubectl` was not installed in the local environment, so command syntax was checked against official Kubernetes documentation rather than local `--help` output.
