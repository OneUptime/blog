# Validation Summary: How to Handle DNS Propagation During Deployment

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Services, Ingress, EndpointSlices, and Jobs
- ExternalDNS
- CoreDNS
- Amazon Route 53
- AWS CLI
- DNS TTLs and CNAME/alias records

## Sources Consulted
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD application specification reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/application-specification/
- ExternalDNS Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/v0.15.0/charts/external-dns/
- ExternalDNS annotations documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS TTL documentation: https://kubernetes-sigs.github.io/external-dns/v0.15.0/docs/ttl/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- CoreDNS Kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- CoreDNS cache plugin documentation: https://coredns.io/plugins/cache/
- AWS CLI Route 53 change-resource-record-sets documentation: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html

## Issues Found
- The introduction said Argo CD-managed services, ingresses, and DNS records need to change atomically. Argo CD and ExternalDNS coordinate through Kubernetes resources and reconciliation loops, but DNS updates are not atomic with application syncs. Changed this to "need to be coordinated."
- The DNS flow diagram incorrectly placed CoreDNS in the external ingress request path. Updated the diagram to show external traffic flowing through public DNS, the load balancer, ingress, Service, and endpoints, with CoreDNS shown separately for internal client service discovery.
- The recursive resolver line implied resolvers always respect TTL. Changed it to "usually respects TTL" to account for resolver and client behavior.
- The post stated Kubernetes Service DNS is typically 30 seconds. CoreDNS's Kubernetes plugin default TTL is 5 seconds unless configured, so the text now reflects that default.
- The ExternalDNS Helm values used the legacy `provider: aws` form. Updated the snippet to the current `provider.name: aws` style documented by the ExternalDNS Helm chart and kept AWS-specific behavior in `extraArgs`.
- The Route 53 TTL-lowering job attempted to lower TTL on an alias record. Route 53 alias records must omit `TTL` and inherit the alias target TTL, so the example now uses a non-alias CNAME record with `TTL: 30` and includes a comment explaining the alias limitation.
- The DNS verification job checked for one fixed IP address, which is misleading for CNAMEs and cloud load balancers that can resolve to multiple changing addresses. Updated it to verify the expected CNAME target before checking the HTTPS health endpoint.

## Review Notes
- The Route 53 weighted alias example is valid as a weighted alias record set, but real deployments must use the correct hosted zone ID for the specific AWS load balancer target.
- The CoreDNS tuning example is syntactically valid, but changing cluster DNS TTLs should be tested carefully because it can increase query volume.
- The ExternalDNS chart version in the article is 1.14.0. The chart remains usable, but newer chart versions exist; future updates could refresh the version and provider-specific chart examples.
