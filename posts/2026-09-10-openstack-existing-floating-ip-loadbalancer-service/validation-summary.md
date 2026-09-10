# Validation Summary: How to Attach an Existing OpenStack Floating IP to a Service

## Status

validated

## Post Type

Tutorial and lifecycle guide

## Technologies Covered

- OpenStack floating IPs and Neutron ports
- OpenStack Octavia
- OpenStack Cloud Controller Manager v1.36.0
- Kubernetes LoadBalancer Services

## Sources Consulted

- [OCCM v1.36.0 Service annotations and examples](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/expose-applications-using-loadbalancer-type-service.md)
- [OCCM v1.36.0 load balancer implementation](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/pkg/openstack/loadbalancer.go)
- [Kubernetes Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [OpenStackClient network v2 reference](https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/network/v2/index.html)
- [Octavia CLI reference](https://docs.openstack.org/python-octaviaclient/latest/cli/index.html)
- [Kubernetes JSONPath reference](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [curl command manual](https://curl.se/docs/manpage.html)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed on 2026-09-10 against the cited official documentation and source. This was a static technical review, not an execution test.
- Read the complete post and reviewed the Service manifest, floating-IP lookup, VIP-port comparison, and external request example.
- Checked the existing-address lookup and retention branches in the implementation. The post clearly distinguishes the requested address, floating-IP UUID, and load-balancer UUID.
- The use of deprecated `spec.loadBalancerIP` is explicitly limited to the provider release that still supports it. Address availability, project policy, routing, traffic, and retention after deletion require the documented cloud-specific checks; none were executed here.
