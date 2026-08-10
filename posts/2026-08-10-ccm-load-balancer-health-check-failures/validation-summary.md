# Validation Summary: Why Load Balancer Health Checks Fail After CCM Provisioning

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Kubernetes `Service` resources of type `LoadBalancer`
- Kubernetes cloud-controller-manager and provider-specific load-balancer controllers
- EndpointSlices, Pod readiness, and Service selectors
- `externalTrafficPolicy`, `healthCheckNodePort`, and NodePort allocation
- kube-proxy and CNI-based Service data planes
- `kubectl` and the `curlimages/curl` diagnostic container
- AWS Load Balancer Controller and Network Load Balancers
- Google Kubernetes Engine LoadBalancer Services
- Azure Kubernetes Service Standard Load Balancer health probes
- Cloud firewalls, security groups, NetworkPolicy, and IP-family routing

## Sources Consulted

- [Kubernetes Service concepts](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes Service v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/)
- [Kubernetes traffic policies and Service proxies](https://kubernetes.io/docs/reference/networking/virtual-ips/#traffic-policies)
- [Kubernetes Service traffic policy](https://kubernetes.io/docs/concepts/services-networking/service-traffic-policy/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes Cloud Controller Manager](https://kubernetes.io/docs/concepts/architecture/cloud-controller/)
- [Kubernetes Debug Services guide](https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/)
- [Kubernetes `kubectl run` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [AWS Load Balancer Controller Service annotations](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/)
- [GKE LoadBalancer Service parameters](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer-parameters)
- [GKE LoadBalancer Service concepts and health checks](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer)
- [AKS Standard Load Balancer configuration and health-probe annotations](https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard#customize-the-load-balancer-health-probe)
- [Official curl container image](https://hub.docker.com/r/curlimages/curl) and [entrypoint source](https://github.com/curl/curl-container/blob/8.21.0/etc/entrypoint.sh)
- [curl `--fail` option](https://curl.se/docs/manpage.html#-f)

## Issues Found

- The original path diagram implied that every load-balancer health check continued through the Service data plane to a ready application endpoint. This is not true for checks such as `healthCheckNodePort`, which can terminate at kube-proxy or a replacement health responder. The diagram now separates node-level proxy health checks, NodePort-to-application checks, and direct Pod-IP checks, and the accompanying text explains the distinction.
- The statement that health checks cannot succeed without ready Service endpoints was too broad. For example, a node-level check used with `externalTrafficPolicy: Cluster` can report a healthy Node without probing the application. The text now says that application traffic requires usable endpoints while provider health state can be independent, and instructs readers to verify endpoint readiness separately.
- The endpoint-readiness guidance did not account for selectorless Services or `publishNotReadyAddresses`. It now covers externally managed EndpointSlices and warns that Kubernetes-generated EndpointSlices report endpoints as ready when `publishNotReadyAddresses: true`, requiring a separate Pod-readiness check.
- The in-cluster curl used an unbracketed ClusterIP placeholder, which is not valid URL syntax for a literal IPv6 address. It now uses same-namespace Service DNS. The text also explains that `internalTrafficPolicy: Local` can make this test fail from a Node without a local endpoint even when the application has ready endpoints elsewhere.
- The `externalTrafficPolicy: Local` explanation implied immediate load-balancer exclusion of Nodes without local endpoints. It now states the exact node-local forwarding and drop behavior and accounts for health-check convergence before target removal.
- The NodePort-allocation guidance treated `spec.allocateLoadBalancerNodePorts: false` as if it prohibited all NodePorts. The field only disables automatic allocation: existing NodePorts remain, and explicitly requested NodePorts are honored. Both affected passages now distinguish disabled automatic allocation from missing required NodePorts and account for controllers that permit manual assignment.
- The AKS health-probe documentation link pointed to a page that no longer contains the referenced section. It now points to the current AKS Standard Load Balancer configuration page and its health-probe annotation table.

## Review Notes

- All `kubectl` commands, flags, resource names, label selectors, and JSONPath expressions are valid in the current command reference. The diagnostic command also works with the current `curlimages/curl` entrypoint, which accepts the explicit `curl` argument.
- Command placeholders such as `WEB_POD`, `SERVICE_PORT`, and `HEALTH_PATH` must be replaced with live values. Actual execution also depends on cluster access, RBAC, image-pull policy, DNS, and network policy.
- `curl -fsS` does not treat HTTP redirects as failures or print the response code. The following prose already warns that redirects can fail a provider probe; operators comparing exact HTTP behavior should also inspect the returned status and headers.
- Provider behavior and annotations remain version-specific. In particular, the AWS documentation URL uses the moving `latest` version, so operators should select documentation matching their installed controller release as the post advises.
