# Validation Summary: How to Test OpenStack Kuryr with Calico in Production-Like Environments

## Status
validated

## Post Type
Tutorial / operational testing guide

## Technologies Covered
- OpenStack Neutron
- OpenStackClient
- Kuryr-Kubernetes
- Calico for OpenStack
- Kubernetes Deployments, Services, and NetworkPolicy
- kubectl
- calicoctl
- Bash

## Sources Consulted
- OpenStack Kuryr-Kubernetes integration design: https://docs.openstack.org/kuryr-kubernetes/latest/devref/kuryr_kubernetes_design.html
- OpenStack Kuryr-Kubernetes NetworkPolicy documentation: https://docs.openstack.org/kuryr-kubernetes/2023.2/devref/network_policy.html
- OpenStack Kuryr-Kubernetes ports pool documentation: https://static.openstack.org/docs/kuryr-kubernetes/yoga/installation/ports-pool.html
- OpenStackClient server command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html
- OpenStackClient port command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/port.html
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The VM creation example used `openstack server create --project kuryr-test`, but current OpenStackClient `server create` does not support a `--project` option. I changed the example to run `openstack server create` without `--project` and added a note that credentials should already be scoped to the `kuryr-test` project.
- The verification command listed pod ports with `--device-owner kuryr:bound`, which does not match the documented Kuryr-Kubernetes device owners for current neutron and nested-vlan pod drivers. I changed the verification commands to list `compute:kuryr` and `trunk:subport` ports.
- The architecture diagram implied Neutron directly programs Felix. Calico for OpenStack documents the Calico Neutron driver as translating Neutron data for Felix/BIRD to implement, so I changed the diagram label to reflect the Calico Neutron driver and Felix/BIRD role.

## Review Notes
- The Kubernetes Deployment, Service, and NetworkPolicy snippets use current stable API versions and valid fields.
- The deny-all ingress policy blocks TCP/UDP/SCTP ingress according to Kubernetes semantics; the blog tests HTTP, which is an appropriate TCP validation.
- `kubectl exec` with `TYPE/NAME` resources is supported by current kubectl.
- The `calicoctl get workloadendpoints -n kuryr-test` command is valid for namespaced WorkloadEndpoint resources, though exact endpoint namespace and labels depend on the deployed Calico datastore and orchestrator integration.
