# Validation Summary: How to Migrate Existing Workloads to Calico on Self-Managed Azure Kubernetes

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Calico Open Source
- Tigera operator
- Kubernetes
- kubeadm
- kubectl
- calicoctl
- Azure Virtual Network
- Azure Virtual Machines
- CNI plugins
- VXLAN encapsulation

## Sources Consulted
- Calico Azure documentation: https://docs.tigera.io/calico/latest/reference/public-cloud/azure
- Calico operator Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico IP pool documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Project Calico release manifest URL, verified with HTTP 200: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/tigera-operator.yaml

## Issues Found
- The introduction said Calico can use either VXLAN or IP-in-IP encapsulation on Azure. Calico's Azure documentation states that VXLAN is supported on Azure and IP-in-IP packets are blocked by the Azure network fabric, so the post now recommends VXLAN and removes the IP-in-IP option for Azure overlay networking.
- The prerequisites pinned `calicoctl` to v3.27+ while the install command pinned Calico v3.27.0. This was stale for a 2026 post, so the prerequisite now says to use a `calicoctl` version matching the deployed Calico release and the operator manifest URL now uses v3.32.0.
- The command for listing node internal IPs used `.status.addresses[0].address`, which depends on address ordering and may not return the InternalIP. It now filters node addresses by `type=="InternalIP"`.
- Step 2 said to remove the existing CNI DaemonSet but only removed local CNI files. Added a generic `kubectl delete daemonset` command using namespace/name placeholders, so the instructions match the described migration step and avoid the old CNI recreating config.
- The Step 4 rationale said VXLAN was needed because Azure VNet does not support BGP route injection by default. The wording now cites the Azure-specific Calico support constraint: VXLAN is supported for Calico overlay networking and IP-in-IP is blocked.

## Review Notes
The Calico operator `Installation` and `APIServer` resources use the documented `operator.tigera.io/v1` API. The `ipPools` fields `cidr`, `blockSize`, `encapsulation`, `natOutgoing`, and `nodeSelector` match the operator Installation API. The `kubectl drain` flags and the `kubectl run` connectivity test syntax are consistent with Kubernetes CLI documentation.
