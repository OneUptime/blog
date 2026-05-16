# Validation Summary: How to Set Up Global Load Balancing Across Talos Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes Services and Ingress
- Global Server Load Balancing
- Cloudflare Load Balancing
- AWS Route 53
- K8GB
- MetalLB
- NGINX

## Sources Consulted
- Cloudflare Load Balancers API documentation: https://developers.cloudflare.com/api/resources/load_balancers/
- Cloudflare Load Balancing monitor documentation: https://developers.cloudflare.com/load-balancing/monitors/
- AWS CLI Route 53 `create-health-check` documentation: https://docs.aws.amazon.com/cli/latest/reference/route53/create-health-check.html
- AWS Route 53 latency routing and resource record set documentation: https://docs.aws.amazon.com/Route53/latest/APIReference/API_ResourceRecordSet.html
- K8GB multi-zone setup documentation: https://www.k8gb.io/multizone/
- K8GB ResourceRef documentation: https://www.k8gb.io/latest/resource_ref/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- MetalLB official documentation: https://metallb.io/
- MetalLB address pool configuration documentation: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/

## Issues Found
- The Cloudflare pool examples referenced `$HEALTH_MONITOR_ID` before the monitor was created. Moved the monitor example ahead of the pool examples so the workflow can actually produce the monitor ID before attaching it to pools.
- The Cloudflare pool example included `notification_email`, which is not part of the current pool model in Cloudflare's documented Load Balancers API. Removed it from the example.
- The Cloudflare and Route 53 health checks used HTTPS on port 443, while the later Kubernetes health endpoint served plain HTTP on port 8080 and exposed it through a LoadBalancer Service. Updated the examples to use HTTP on port 80 consistently.
- The K8GB Helm values used the older `dnsZone` and `edgeDNSZone` fields. Updated the example to the current `k8gb.dnsZones[0].parentZone`, `loadBalancedZone`, and `dnsZoneNegTTL` values.
- The K8GB Gslb example embedded the Ingress configuration under the Gslb resource. That legacy form is still accepted, but the current K8GB documentation recommends `resourceRef`. Updated the example to define a Kubernetes Ingress and reference it from a `k8gb.io/v1beta1` Gslb resource.

## Review Notes
- The post is technically relevant and contains implementation details, so it was reviewed as a code/tutorial post.
- The examples still use documentation/demo IP address ranges (`203.0.113.0/24` and `198.51.100.0/24`), which is appropriate for sample commands but must be replaced with real endpoint addresses before use.
- The sample health endpoint is intentionally simple. The post correctly notes that production health checks should validate critical dependencies and capacity, not just return a static 200 response.
