# Validation Summary: How to Refresh OpenStack Load Balancer Members After Label Changes

## Status

validated

## Post Type

Troubleshooting and rollout guide

## Technologies Covered

- OpenStack Cloud Controller Manager v1.36.0 node selectors
- Kubernetes v1.33 and v1.34 Service controller predicates
- Kubernetes labels and Service annotations
- OpenStack Octavia pool members

## Sources Consulted

- [OCCM v1.36.0 Service annotations and examples](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/expose-applications-using-loadbalancer-type-service.md)
- [OCCM v1.36.0 configuration reference](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/using-openstack-cloud-controller-manager.md)
- [OCCM v1.36.0 key/value selector parser](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/pkg/util/util.go)
- [Kubernetes v1.34.0 Service controller](https://github.com/kubernetes/kubernetes/blob/v1.34.0/staging/src/k8s.io/cloud-provider/controllers/service/controller.go)
- [Kubernetes v1.33.0 Service controller](https://github.com/kubernetes/kubernetes/blob/v1.33.0/staging/src/k8s.io/cloud-provider/controllers/service/controller.go)
- [Kubernetes external load balancer exclusion label](https://kubernetes.io/docs/reference/labels-annotations-taints/#node-kubernetes-io-exclude-from-external-load-balancers)
- [kubectl label](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/)
- [kubectl annotate](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/)
- [Octavia CLI reference](https://docs.openstack.org/python-octaviaclient/latest/cli/index.html)
- [Kubernetes JSONPath reference](https://kubernetes.io/docs/reference/kubectl/jsonpath/)

## Issues Found

- The exclusion-label discussion did not explain that adding `false` to an unlabeled node can fail to trigger a sync even after boolean handling was added. Compared the v1.34 exclusion predicate and node-update predicate, then clarified that unchanged eligibility does not itself guarantee synchronization.

## Review Notes

- Reviewed on 2026-09-10 against the cited official documentation and source. This was a static technical review, not an execution test.
- Read the complete post and reviewed the Service manifest, node-selector syntax, node labeling, annotation refresh, and staged backend replacement.
- Confirmed that changing Service annotations requests a load-balancer update and that the older controller excludes nodes based on label presence. The provider guide explicitly documents the custom-label refresh limitation.
- No controller was run and no pool was changed. The exact bundled cloud-provider library, observed member health, and local application endpoints still require the article's deployment-specific checks.
