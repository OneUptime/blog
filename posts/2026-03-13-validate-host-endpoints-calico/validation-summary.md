# Validation Summary: How to Validate Calico Host Endpoint Policies Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico HostEndpoint
- Calico GlobalNetworkPolicy
- Kubernetes
- calicoctl
- kubectl
- Linux iptables

## Sources Consulted
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico creating host endpoint objects: https://docs.tigera.io/calico/latest/reference/host-endpoints/objects
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico host forwarded traffic policy guide: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico basic host endpoint connectivity policy guide: https://docs.tigera.io/calico/latest/reference/host-endpoints/connectivity
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico host endpoint failsafe rules: https://docs.tigera.io/calico/latest/reference/host-endpoints/failsafe

## Issues Found
- The GlobalNetworkPolicy ingress rule matched destination ports 22, 443, and 6443 but did not specify a protocol. Calico policy examples and rule semantics use `protocol: TCP` with TCP destination ports, so I added `protocol: TCP` to make the intended SSH, HTTPS, and Kubernetes API allow rule explicit.
- The implementation applied the HostEndpoint before the policy. Calico documentation recommends creating policies before HostEndpoint objects because a new host endpoint without matching policy defaults to denying traffic except failsafe traffic. I reordered the commands so the host protection policy is applied first.
- The Felix liveness command used a literal `calico-node-xxx` pod name and omitted the container name. I changed it to use a placeholder pod name and `-c calico-node`, which is safer for multi-container Calico node pods.

## Review Notes
The post uses `projectcalico.org/v3`, `HostEndpoint`, `GlobalNetworkPolicy`, `interfaceName`, `expectedIPs`, `applyOnForward`, and `preDNAT` fields consistently with current Calico documentation. The `kube-system` namespace in the example matches manifest-based installs; operator-based installs may place Calico node pods in `calico-system`, so readers should adjust the namespace for their installation.
