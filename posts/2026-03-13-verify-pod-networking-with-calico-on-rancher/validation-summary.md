# Validation Summary: How to Verify Pod Networking with Calico on Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- kubectl
- Calico
- calicoctl
- Kubernetes Services and DNS
- Pod networking and IPAM

## Sources Consulted
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Calico `calicoctl node status` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico BGP configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico IP pool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Rancher kubectl and kubeconfig documentation: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig

## Issues Found
- The post stated that all BGP sessions should be `Established` between all nodes. This is only correct for Calico deployments that use BGP; Calico VXLAN deployments do not use BGP. Updated the text to make the BGP check conditional on the deployment mode.
- The IPAM section said each node should have an IP block allocated. Calico allocates blocks for nodes running workloads that use Calico IPAM, and borrowed IPs can also appear. Updated the wording to avoid overgeneralizing.
- The cross-node pod section said it used node selectors, but the commands used `spec.nodeName`. Updated the description to match the implementation.
- The `kubectl run --overrides` examples omitted `apiVersion`, while the generated kubectl reference specifies that overrides require an object with a valid `apiVersion` field. Added `apiVersion: v1` to the JSON overrides.
- The BusyBox test pod examples passed `sleep 3600` as arguments instead of explicitly setting the container command. Added `--command -- sleep 3600` to make the intended command unambiguous.
- The connectivity and service checks could race pod startup. Added `kubectl wait --for=condition=Ready` before executing commands in the test pods and before exposing/testing the nginx pod.
- The external egress check used ICMP to `8.8.8.8` without noting that ICMP may be blocked by network policy, firewalls, or the upstream network. Added a caveat.

## Review Notes
The Rancher UI navigation can vary slightly by Rancher version and UI mode, but the described workflow is technically plausible for checking cluster and pod status. The post does not pin Calico, Kubernetes, or Rancher versions, so the review used current official documentation available on 2026-05-08.
