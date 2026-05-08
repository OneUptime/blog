# Validation Summary: Verify Pod Networking with Calico on Self-Managed Azure Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- kubectl
- Azure Virtual Network
- Azure Network Security Groups
- Azure CLI
- VXLAN
- IP-in-IP
- BGP

## Sources Consulted
- Calico Open Source Azure documentation: https://docs.tigera.io/calico/latest/reference/public-cloud/azure
- Calico Open Source overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/
- Calico Open Source IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico Open Source test networking documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/test-networking
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Azure Network Security Groups overview: https://learn.microsoft.com/en-us/azure/architecture/networking/guide/network-level-segmentation
- Azure CLI az network nsg rule reference: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule

## Issues Found
- The introduction incorrectly stated that BGP traffic on TCP 179 must be allowed for the VXLAN workflow. Calico documentation states that Calico VXLAN overlays do not use BGP, while TCP 179 is required only when Calico networking uses BGP. I removed BGP from the VXLAN requirement and kept a BGP caveat in the best practices section.
- The NSG guidance implied that a custom VXLAN allow rule is always required. Azure NSGs include default VirtualNetwork-to-VirtualNetwork allow rules, so an explicit rule is required when VXLAN traffic is not otherwise allowed or is overridden by higher-priority custom rules. I updated the wording accordingly.
- The Step 1 wording said VXLAN mode is mandatory without context. Calico can also be used on Azure with Azure user-defined routes or other networking options, so I narrowed the statement to Calico overlay networking.
- The best practices section referred to "Calico's built-in connectivity test." The official Calico documentation provides a test networking workflow rather than a single built-in connectivity-test command. I changed the wording to reference the documented workflow.

## Review Notes
The remaining commands and configuration fields are technically valid for the described VXLAN verification workflow. The examples assume a Linux Calico deployment using the default `kube-system` namespace and the `default-ipv4-ippool` name; operator-managed installations may use `calico-system` and different IPPool naming.
