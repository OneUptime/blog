# Validation Summary: How to Monitor Calico CNI Removal Progress and Problems

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico CNI
- Kubernetes
- kubectl
- Kubernetes custom resources and CRDs
- Linux CNI configuration files
- Linux iptables

## Sources Consulted
- Kubernetes kubectl api-resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/
- Kubernetes finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Calico install calico/node documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico CNI plugin configuration documentation: https://docs.tigera.io/calico/latest/reference/cni-plugin/configuration
- Calico Kubernetes requirements documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico calico/node configuration documentation: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico operator installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises

## Issues Found
- The post said iptables `cali-*` chains should be absent from the `FORWARD` table. `FORWARD` is a chain, not a table, and Calico iptables references can appear across the host ruleset. Changed the wording and command to check `iptables-save` output for `cali-` references.
- The CRD deletion watch was described as a count but printed matching CRD rows. Changed it to pipe to `wc -l`.
- The stuck CRD object loop used `kubectl api-resources` without overriding the default `--namespaced=true`, so it missed cluster-scoped Calico resources. Split the loop into namespaced and cluster-scoped checks using `--namespaced=true` and `--namespaced=false`.
- Several checks assumed Calico pods and ConfigMaps were in `kube-system`. Current Calico installations can also use operator-managed namespaces such as `calico-system`, so the checks were changed to use `--all-namespaces` where appropriate.

## Review Notes
The post remains a general monitoring checklist, not a complete Calico uninstall procedure. In future, it could mention that clusters using Calico eBPF or nftables dataplanes may need additional node-level checks beyond iptables.
