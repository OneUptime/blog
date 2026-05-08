# Validation Summary: Upgrade Calico on Self-Managed Azure Kubernetes Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes
- Azure Virtual Network
- Azure Network Security Groups
- Azure route tables
- Azure CLI
- kubectl
- calicoctl

## Sources Consulted
- Calico upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico Azure documentation: https://docs.tigera.io/calico/latest/reference/public-cloud/azure
- Calico self-managed Azure documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-public-cloud/azure
- Calico system requirements and network ports: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico VXLAN/IPIP overlay documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico calicoctl node status documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Microsoft Azure CLI NSG documentation: https://learn.microsoft.com/en-us/cli/azure/network/nsg
- Kubernetes kubectl rollout documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- `calicoctl node status` was described as a VXLAN tunnel validation command. Calico documents this command as reporting Calico node status and BGP peering state, and Calico VXLAN does not use BGP. I changed the VXLAN checks to inspect the `vxlan.calico` device on the node and kept `calicoctl node status` only for Calico node/BGP validation.
- The upgrade step applied the stock `custom-resources.yaml` from Calico v3.28.0. That manifest contains default Installation values, including a default IP pool CIDR and encapsulation, and can overwrite cluster-specific configuration. I replaced it with a warning to apply only a reviewed cluster-specific Installation manifest when Installation settings actually need to change.
- The Tigera Operator upgrade command used server-side apply without `--force-conflicts`. Calico upgrade documentation uses server-side apply with `--force-conflicts`, so I updated the command.
- The current-version check selected the first pod in `calico-system`, which is not guaranteed to be `calico-node`. I changed it to read the `calico-node` container image from the `calico-node` DaemonSet.
- The best-practice note said Azure VNet may need time to learn new VXLAN routes. In VXLAN mode, Azure VNet sees encapsulated node traffic rather than pod routes. I changed the note to refer to NSG effective rules and route table convergence.

## Review Notes
The guide is technically relevant and salvageable. It is version-specific to Calico v3.28.0; future maintenance should revisit the exact upgrade procedure because newer Calico releases split some CRD upgrade steps differently from the v3.28.0 manifest layout.
