# Validation Summary: Validate Calico Networking on Azure

## Status
validated

## Post Type
Tutorial / validation guide

## Technologies Covered
- Calico networking and IPAM
- Kubernetes pods, deployments, services, and kubectl commands
- Azure Virtual Network
- Azure VM network interfaces and IP forwarding
- Azure Network Security Groups
- VXLAN

## Sources Consulted
- Azure network interface IP forwarding documentation: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-network-interface
- Azure Network Security Group default rules and rule behavior: https://learn.microsoft.com/en-us/azure/architecture/networking/guide/network-level-segmentation
- Azure CLI `az network nsg rule` reference: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule
- Azure CLI `az network nic` reference: https://learn.microsoft.com/en-us/cli/azure/network/nic
- Calico Azure public cloud documentation: https://docs.tigera.io/calico/latest/reference/public-cloud/azure
- Calico IPAM block size documentation: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl create deployment` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post implied Azure NIC IP forwarding is required for all Calico networking on Azure. Calico's Azure documentation specifically lists it for Azure UDR/routed designs, while Calico VXLAN is a separate supported option. The introduction, Step 1, and conclusion were updated to scope IP forwarding to routed pod traffic and Azure UDR deployments.
- The post stated that each node should have at least one `/24` Calico IPAM block. Calico's default IPv4 block size is `/26`, so this was corrected to say that each active node should have one or more blocks, with `/26` as the default unless changed.
- The NSG validation query only checked for destination port `4789` and did not verify allow access, inbound direction, UDP or wildcard protocol, wildcard destination ports, or Azure default rules. The query and expected-output text were updated to include those checks and to account for Azure's default VirtualNetwork-to-VirtualNetwork allow rule.
- The conclusion claimed VXLAN traffic is not allowed in default NSG configurations. Azure default NSG rules allow VirtualNetwork-to-VirtualNetwork traffic unless overridden, so this was corrected to say custom NSG deny rules can block VXLAN.
- The `kubectl run --overrides` examples omitted `apiVersion`, while the kubectl reference specifies inline override objects should supply a valid `apiVersion`. The examples now include `apiVersion: v1`.
- The pod connectivity test used backgrounded `kubectl run` commands and a fixed `sleep 10`, which could race pod scheduling. This was replaced with explicit `kubectl wait` readiness checks.
- The nginx service test did not wait for the deployment rollout before testing the service. A `kubectl rollout status` command was added.
- The outbound test used `https://ifconfig.me` from a BusyBox pod, which can fail depending on BusyBox TLS and certificate support. The URL was changed to `http://ifconfig.me` for a simpler connectivity validation.

## Review Notes
The guide assumes node names match Azure VM names and that the resource group and NSG names are `k8s-rg` and `k8s-workers-nsg`; those are environment-specific placeholders, not universal values. The guide is specific to Calico VXLAN on self-managed Kubernetes; Azure UDR or Azure CNI IPAM designs require different validation details.
