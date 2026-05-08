# Validation Summary: How to Validate Calico Forwarded Traffic Policies Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico HostEndpoint resources
- Calico GlobalNetworkPolicy resources
- calicoctl
- kubectl
- Linux iptables dataplane inspection

## Sources Consulted
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico applyOnForward documentation: https://docs.tigera.io/calico/latest/reference/host-endpoints/forwarded
- Calico host endpoint policy summary: https://docs.tigera.io/calico/latest/reference/host-endpoints/summary
- Calico forwarded traffic policy guide: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Kubernetes node protection documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes

## Issues Found
- The ingress policy listed service ports 22, 443, and 6443 without an explicit protocol. Calico examples and policy semantics treat service-port rules as protocol-specific, so the rule now sets `protocol: TCP` to match SSH, HTTPS, and Kubernetes API traffic precisely.
- The iptables diagnostic command was presented generally. Calico can run with different dataplanes, so the comment now scopes the command to nodes using the iptables dataplane.
- The Felix liveness command used a placeholder pod name in `kube-system` and omitted the `calico-node` container and binary path. It was changed to execute against the `calico-node` DaemonSet in the common `calico-system` namespace with `-c calico-node -- /bin/calico-node -felix-live`.

## Review Notes
The HostEndpoint and GlobalNetworkPolicy API versions and fields are current for Calico v3.x. `applyOnForward: true` is correctly used for forwarded traffic through host endpoints, and `preDNAT: false` is valid for a normal post-DNAT host endpoint policy. Operators using manifest-based installs in `kube-system` may need to adjust the namespace in the Felix liveness command to match their installation.
