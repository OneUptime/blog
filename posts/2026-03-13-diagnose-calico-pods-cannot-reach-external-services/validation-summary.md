# Validation Summary: How to Diagnose Calico Pods Cannot Reach External Services

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- kubectl
- calicoctl
- Linux iptables
- Linux routing
- DNS, ICMP, and HTTPS connectivity testing

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico outgoing NAT documentation: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico network policy getting started documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl overview and resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post stated that a GlobalNetworkPolicy with no egress rules causes implicit egress deny. This is incomplete because Calico defaults `types` to `Ingress` when no egress rules are present, so egress is only affected when the policy includes `Egress` in `types` or has egress rules. Updated the wording to focus on policies that include Egress without matching egress Allow rules.
- The route diagnostic defined `POD_IP` but ran `ip route get 8.8.8.8`, which checks the node's normal route lookup rather than a lookup using the pod IP as the source. Updated the command to `ip route get 8.8.8.8 from "${POD_IP}"`.

## Review Notes
The post assumes the Calico node pods run in the `calico-system` namespace with the `k8s-app=calico-node` label. That is common for operator-managed installations, but manifest-based installations may use `kube-system`; this is an environment caveat rather than a command syntax error.
