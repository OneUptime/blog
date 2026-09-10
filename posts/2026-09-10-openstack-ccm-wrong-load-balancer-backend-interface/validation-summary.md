# Validation Summary: How to Diagnose the Wrong OpenStack Load Balancer Backend Interface

## Status

validated

## Post Type

Troubleshooting and configuration guide

## Technologies Covered

- OpenStack Cloud Controller Manager v1.36.0 networking
- Kubernetes Node addresses and NodePorts
- OpenStack Nova, Neutron, and Octavia

## Sources Consulted

- [OCCM v1.36.0 load balancer implementation](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/pkg/openstack/loadbalancer.go)
- [OCCM v1.36.0 configuration reference](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/using-openstack-cloud-controller-manager.md)
- [OCCM v1.36.0 Service annotations and examples](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/expose-applications-using-loadbalancer-type-service.md)
- [Kubernetes v1.34.0 Service controller](https://github.com/kubernetes/kubernetes/blob/v1.34.0/staging/src/k8s.io/cloud-provider/controllers/service/controller.go)
- [OpenStackClient network v2 reference](https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/network/v2/index.html)
- [OpenStackClient compute v2 reference](https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/compute/v2/index.html)
- [Octavia CLI reference](https://docs.openstack.org/python-octaviaclient/latest/cli/index.html)
- [Kubernetes JSONPath reference](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [kubectl annotate](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed on 2026-09-10 against the cited official documentation and source. This was a static technical review, not an execution test.
- Read the complete post and reviewed the node/member comparison, provider identity, network configuration, IP-family selection, and targeted Service refresh.
- The cited address-selection function and networking reference support the explanation. Network selection and member-subnet configuration have separate roles.
- The YAML/INI fragments and CLI placeholders were inspected statically. Provider-specific connectivity, refreshed Node objects, firewall rules, local endpoints, and live Octavia member health were not tested.
