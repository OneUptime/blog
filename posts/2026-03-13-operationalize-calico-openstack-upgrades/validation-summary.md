# Validation Summary: How to Operationalize Calico on OpenStack Upgrades

## Status
validated

## Post Type
Operational guide / Process documentation

## Technologies Covered
- Calico (calico-node, kube-controllers, calico-felix, TigeraStatus CRD)
- OpenStack (Neutron, ML2 mechanism driver)
- networking-calico (Neutron ML2 Calico plugin)
- Kubernetes
- OpenShift
- Ansible

## Sources Consulted
- Calico documentation – OpenStack integration: https://docs.tigera.io/calico/latest/getting-started/openstack/
- networking-calico project: https://opendev.org/openstack/networking-calico
- Calico architecture (Felix data plane agent): https://docs.tigera.io/calico/latest/reference/architecture/overview
- Tigera operator status CRD (TigeraStatus): https://docs.tigera.io/calico/latest/reference/installation/api
- Calico component reference (calico-node, kube-controllers): https://docs.tigera.io/calico/latest/reference/component-resources/

## Issues Found
No technical issues found. The component naming (calico-node, kube-controllers, calico-felix, TigeraStatus), the existence of the Neutron ML2 Calico mechanism driver (networking-calico), and the placement of Felix on OpenStack compute nodes are all consistent with official Calico/OpenStack documentation.

## Review Notes
- The post is primarily an operational/process document. The "code" block is a runbook outline in plain text rather than executable code or configuration, so there are no syntax/CLI flags to verify.
- The reference to `TigeraStatus` is correct for operator-installed Calico; users running manifest-installed Calico would not have this CRD. A future revision could mention this distinction.
- For OpenStack deployments, the `calico-felix` package on compute nodes is the same Felix binary embedded in the `calico/node` container on Kubernetes; calling out this shared component could help readers understand why version skew between the two planes matters during upgrades.
