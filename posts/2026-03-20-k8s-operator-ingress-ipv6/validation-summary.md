# Validation Summary: How to Handle IPv6 in Operator-Managed Ingress Resources

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Kubernetes Ingress
- Kubernetes Services
- IPv4/IPv6 dual-stack networking
- KIND
- Go
- controller-runtime

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes dual-stack validation task: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- KIND configuration documentation: https://kind.sigs.k8s.io/docs/user/configuration/
- Go `net` package documentation: https://pkg.go.dev/net
- controller-runtime `log` package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/log
- controller-runtime `client` package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/client

## Issues Found
- The description and overview implied that load balancer IP handling belongs to the `Ingress` resource itself. I changed that wording to refer to the backing `LoadBalancer` Services, which is where Kubernetes defines dual-stack and load balancer IP behavior.
- The “Checking IPv6 Support in the Cluster” helper only inspected node addresses and ignored client/list errors. I renamed it to reflect what it actually checks, added error handling, and clarified that seeing an IPv6 node address is not a complete dual-stack capability check.
- The test command `kubectl get pods -n kube-system -o wide | grep "2001:"` assumed a specific IPv6 prefix. I replaced it with commands that print node addresses and pod IPs directly, which matches the upstream Kubernetes dual-stack validation guidance and works with other valid IPv6 ranges such as KIND's default `fd00:` ranges.
- The conclusion referred to `IPFamilyPolicy` generically. I corrected that reference to Kubernetes Service `.spec.ipFamilyPolicy`, which is the actual field used for dual-stack Service behavior.

## Review Notes
- `Service.spec.loadBalancerIP` is deprecated in Kubernetes v1.24 and does not support dual-stack behavior well; provider-specific annotations or other controller-specific mechanisms are preferred when a static load balancer IP is required.
- Ingress remains valid, but the Kubernetes project has frozen the Ingress API and recommends Gateway API for new feature development.
- `kubectl` was not installed in the local workspace, so command examples were reviewed against official documentation rather than executed in this environment.
