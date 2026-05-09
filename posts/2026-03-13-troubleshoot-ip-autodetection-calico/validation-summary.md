# Validation Summary: How to Troubleshoot IP Autodetection in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico IP autodetection
- calicoctl
- kubectl
- Tigera operator Installation resource

## Sources Consulted
- Calico Open Source documentation: Configure IP autodetection, https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico Open Source documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Open Source documentation: Node resource, https://docs.tigera.io/calico/latest/reference/resources/node
- Calico Open Source documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source documentation: calicoctl ipam overview, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Kubernetes documentation: kubectl get, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The original troubleshooting commands inspected IP pools and IPAM block allocation, but Calico IP autodetection is reflected in Calico Node resources and Kubernetes node addresses. Replaced the IP pool and IPAM commands with `calicoctl get nodes -o yaml`, `kubectl get nodes -o wide`, and a Calico node pod placement check.
- The original configuration snippet defined an `IPPool`, which configures pod address allocation and encapsulation rather than node IP autodetection. Replaced it with the operator-managed `Installation` resource using `spec.calicoNetwork.nodeAddressAutodetectionV4.kubernetes: NodeInternalIP`, matching the official Calico autodetection documentation.
- The original verification step used `calicoctl ipam check`, which is documented for Calico Enterprise and is not listed in the Calico Open Source `calicoctl ipam` command overview. Replaced it with Calico Node and Kubernetes node checks plus a Calico node DaemonSet rollout check.
- The original `kubectl get pods -A -o wide | awk '{print $8}'` command selected the node column from wide pod output, not the pod IP column, and did not validate Calico node autodetection. Replaced it with node-oriented verification commands.
- The architecture diagram described IP pools, block allocation, and pod IP assignment instead of autodetection. Updated the diagram to show Kubernetes node address selection, Calico node address configuration, and pod routing.
- The conclusion contained a duplicated "in Calico" phrase and referred to cluster IP addressing generally. Updated it to refer specifically to node addressing requirements.

## Review Notes
The corrected configuration uses the operator-managed Calico `Installation` resource. Manifest-based installations can also configure autodetection through `IP_AUTODETECTION_METHOD` on the `calico-node` DaemonSet, but the post now consistently uses the operator API in its configuration example.
