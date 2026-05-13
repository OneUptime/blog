# Validation Summary: Execute Calico CNI Chaining with Cilium

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Cilium
- Calico
- Kubernetes
- CNI chaining
- CiliumNetworkPolicy
- Hubble
- Helm

## Sources Consulted
- Cilium Calico CNI chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-calico/
- Cilium generic veth chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-generic-veth/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium CNI configuration documentation: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium connectivity test command reference: https://docs.cilium.io/en/stable/cmdref/cilium_connectivity_test/
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Calico `calicoctl node status` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status

## Issues Found
- The post claimed Cilium has no Calico chaining path and installed Cilium with only `cni.chainingMode=generic-veth`. Cilium documents a Calico chaining guide that uses `generic-veth` plus a custom chained CNI ConfigMap. Added the required `cni-configuration` ConfigMap and the documented `cni.customConf=true` / `cni.configMap=cni-configuration` Helm values.
- The Cilium version was pinned to `1.15.0`, which is outdated for a 2026 guide. Updated the example to `1.19.3`, matching the current stable documentation consulted during review.
- The Helm example included older or unsupported values for the current chart, including `hostServices.enabled`, `externalIPs.enabled`, `hostPort.enabled`, and `enableIdentityMark`. Removed those values and kept the current documented values needed for chaining.
- The `kubectl debug node` example listed `/etc/cni/net.d/`, but Kubernetes mounts the node filesystem under `/host` in the debug pod. Updated the command to list `/host/etc/cni/net.d/`.
- The policy verification example used `cilium policy get`, which is not the current Cilium CLI workflow. Replaced it with `kubectl get ciliumnetworkpolicies -n production`.
- The Hubble example used `cilium hubble observe`, but flow observation is done with the Hubble CLI. Changed it to `hubble observe --verdict DROPPED` and noted that Hubble must be enabled.
- The post presented L7 policy in chaining mode too definitively. Cilium documents that advanced features, including L7 policy, can be limited in CNI chaining mode. Added a validation caveat while preserving the L7 CiliumNetworkPolicy example syntax.
- The post omitted the documented requirement that the new chained CNI configuration does not apply to already-running pods. Added a best-practice note to restart workload pods after installing the chained configuration.

## Review Notes
- The Calico CNI ConfigMap is a template and must be adjusted to match the cluster's existing Calico CNI configuration, especially MTU and kubeconfig path.
- Calico and Cilium policy interactions should still be tested in a non-production cluster because existing Calico policy providers and Cilium policy enforcement can create environment-specific behavior.
