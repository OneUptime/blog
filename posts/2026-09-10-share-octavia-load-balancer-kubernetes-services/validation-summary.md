# Validation Summary: How to Share an Octavia Load Balancer Across Kubernetes Services

## Status

validated

## Post Type

Tutorial and lifecycle guide

## Technologies Covered

- OpenStack Cloud Controller Manager v1.36.0
- OpenStack Octavia tags, listeners, and pools
- Kubernetes LoadBalancer Services

## Sources Consulted

- [OCCM v1.36.0 Service annotations and examples](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/expose-applications-using-loadbalancer-type-service.md)
- [OCCM v1.36.0 load balancer implementation](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/pkg/openstack/loadbalancer.go)
- [OCCM v1.36.0 configuration reference](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/using-openstack-cloud-controller-manager.md)
- [Octavia v2 API reference](https://docs.openstack.org/api-ref/load-balancer/v2/)
- [Octavia CLI reference](https://docs.openstack.org/python-octaviaclient/latest/cli/index.html)
- [Kubernetes JSONPath reference](https://kubernetes.io/docs/reference/kubectl/jsonpath/)

## Issues Found

- The cleanup discussion treated external creation as sufficient evidence of retention. Source inspection shows that v1.36.0 infers deletion ownership from the `kube_service_` name prefix and attachment tags. Corrected the paragraph to explain that an externally created resource with that prefix can still be treated as controller-owned.

## Review Notes

- Reviewed on 2026-09-10 against the cited official documentation and source. This was a static technical review, not an execution test.
- Read the complete post and reviewed both Service manifests, distinct frontend ports, explicit UUID reuse, sharing limits, and the listener/pool inspection commands.
- The documented tag feature requirement, internal-Service restriction, and stable load-balancer annotation are represented accurately.
- Actual resource names and tags matter to the deletion decision. No load balancer was adopted or deleted, and no listener traffic or final-Service removal was tested. The article retains its required nonproduction lifecycle exercise.
