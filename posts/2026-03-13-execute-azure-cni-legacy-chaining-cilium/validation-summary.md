# Validation Summary: Execute Azure CNI Legacy Chaining with Cilium

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- Kubernetes
- Azure Kubernetes Service (AKS)
- Azure CNI legacy / Azure CNI Node Subnet
- Helm
- Hubble
- eBPF
- CiliumNetworkPolicy

## Sources Consulted
- Cilium Azure CNI (Legacy) chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-azure-cni/
- Cilium CNI chaining overview: https://docs.cilium.io/en/stable/installation/cni-chaining/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Layer 3 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium Layer 4 policy documentation: https://docs.cilium.io/en/latest/security/policy/layer4/
- Cilium Hubble UI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-ui/
- Microsoft Learn AKS legacy CNI concepts: https://learn.microsoft.com/en-us/azure/aks/concepts-network-legacy-cni
- Microsoft Learn Azure CNI Powered by Cilium documentation: https://learn.microsoft.com/en-us/azure/aks/azure-cni-powered-by-cilium
- Kubernetes kubectl node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The Helm install command used `cni.chainingMode=azure-cni`, but the Cilium Azure CNI legacy chaining documentation uses `generic-veth` with a custom CNI ConfigMap. Added the `cni-configuration` ConfigMap and updated the Helm values to `cni.chainingMode=generic-veth`, `cni.customConf=true`, `nodeinit.enabled=true`, `cni.configMap=cni-configuration`, and `routingMode=native`.
- The post claimed chained Cilium provides L3/L4/L7 enforcement and transparent mTLS. Cilium documents limitations for advanced features such as L7 policy and transparent encryption in CNI chaining, so the claim was narrowed to L3/L4 policy and Hubble observability with a caveat.
- The kernel prerequisite said Linux 5.4+. Current Cilium system requirements state Linux kernel 5.10+ or equivalent, so the prerequisite and best-practice note were updated.
- The `kubectl debug node` command read `/etc/cni/net.d/...` from inside the debug container. Kubernetes mounts the node filesystem at `/host`, so the command now reads `/host/etc/cni/net.d/10-azure.conflist`.
- The validation step checked `cilium-config` for chained CNI plugins. The chain is defined in the custom `cni-configuration` ConfigMap, so the command now checks that ConfigMap for `azure-vnet`, `portmap`, and `cilium-cni`.
- The installation missed the documented restart of unmanaged non-host-network pods when the cluster was not created with the Cilium agent-not-ready taint. Added the documented restart command to validation.
- The verification command used `cilium policy get`, which maps to deprecated daemon-side policy inspection in current Cilium docs. Replaced it with `kubectl get ciliumnetworkpolicy`.
- The best-practice note about Azure API rate limiting was not applicable to this documented chained setup because Azure CNI remains responsible for IPAM. Replaced it with monitoring Cilium agent and node-init logs for CNI chaining and transparent-mode errors.
- The migration recommendation referred to "Cilium as the primary CNI (Azure CNI Overlay + Cilium)." Updated it to Azure CNI Powered by Cilium, which is the managed AKS dataplane option documented by Microsoft.

## Review Notes
The CiliumNetworkPolicy YAML is syntactically consistent with Cilium L3/L4 policy examples. The Hubble Helm values and `cilium hubble ui` command are consistent with Cilium Hubble UI documentation. The example assumes the user has an `app` namespace with frontend/backend pods labeled as shown.
