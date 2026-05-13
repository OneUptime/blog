# Validation Summary: How to Diagnose External API Access Failures from Calico Pods

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Calico GlobalNetworkPolicy and IPPool NAT
- Kubernetes pods and NetworkPolicy
- kubectl diagnostic commands
- CoreDNS DNS resolution and query logging
- curl HTTPS and proxy diagnostics
- iptables NAT inspection

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico default deny policy documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico outgoing NAT documentation: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- CoreDNS log plugin documentation: https://coredns.io/plugins/log/
- curl man page: https://curl.se/docs/manpage.html
- Local iptables help output for `iptables -t nat -L ... -n`

## Issues Found
- The post used `policyTypes` when inspecting Calico `GlobalNetworkPolicy` resources. Calico uses `spec.types`; `policyTypes` is the Kubernetes `NetworkPolicy` field. Updated the Calico grep and explanatory comment to use `types`.
- The DNS test hard-coded `10.96.0.10` as the CoreDNS ClusterIP. That is common but not guaranteed. Updated the example to read the `kube-dns` Service ClusterIP with `kubectl`.
- The CoreDNS log check implied query logs are always available. CoreDNS query logging requires the `log` plugin. Updated the comment to say the check applies when query logging is enabled.
- The NAT source-IP note said the external IP should be the node IP. In cloud and egress-gateway setups, the observed address can be another configured egress/NAT IP. Updated the note accordingly.
- The Calico node lookup assumed the `calico-system` namespace. Calico can also run elsewhere, such as `kube-system`. Updated the command to discover the namespace for the node-local `calico-node` pod.

## Review Notes
The remaining commands and explanations are technically sound for a Calico-backed Kubernetes cluster, but some operational details remain environment-specific: CoreDNS labels may differ on non-standard installs, `calicoctl` must be installed and configured, and direct iptables inspection applies to Calico deployments using the Linux iptables dataplane.
