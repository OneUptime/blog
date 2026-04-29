# Validation Summary: How to Configure External DNS with Kubernetes for IPv4 Services (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- ExternalDNS
- Amazon Route 53
- Amazon EKS IAM Roles for Service Accounts (IRSA)
- AWS CLI
- `kubectl`
- YAML manifests

## Sources Consulted
- ExternalDNS AWS tutorial for v0.14.2: https://kubernetes-sigs.github.io/external-dns/v0.14.2/tutorials/aws/
- ExternalDNS annotations reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS Service source reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/service/
- ExternalDNS Ingress source reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/ingress/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- AWS CLI `route53 list-resource-record-sets` reference: https://docs.aws.amazon.com/cli/latest/reference/route53/list-resource-record-sets.html
- AWS Route 53 service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonroute53.html
- Amazon EKS IAM roles for service accounts: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html

## Issues Found
- The description and workflow explanation incorrectly implied that ExternalDNS always uses an external IPv4 address and creates a plain `A` record. I corrected that language to reflect how ExternalDNS actually uses the resource's published target, which may be an IP or hostname, and creates the corresponding DNS record.
- The Route 53 IAM policy example was missing `route53:ListTagsForResource`, which is included in the official ExternalDNS AWS tutorial. I added that permission.
- The RBAC example was incomplete because it defined a `ServiceAccount` and `ClusterRole` but no `ClusterRoleBinding`. I added the missing binding so the `external-dns` service account is actually authorized to read the required Kubernetes resources.
- The RBAC rule for `nodes` omitted the `get` verb present in the official ExternalDNS manifest. I added it for consistency with the documented permissions.
- The Service annotation example claimed Route 53 would create an `A` record pointing directly to a load balancer IPv4 address. I corrected the comment to match the common AWS behavior where ExternalDNS creates an alias-backed `A` record for the load balancer target.
- The Ingress example omitted the requirement that an ingress controller must populate `status.loadBalancer.ingress`, and that clusters without a default `IngressClass` need an explicit class. I added that clarification.
- The Route 53 verification command was too broad and could return ownership TXT records as well as the main DNS record. I narrowed the JMESPath query to the `A` record being demonstrated.

## Review Notes
- The manifest is pinned to `registry.k8s.io/external-dns/external-dns:v0.14.2`. I validated the flags and AWS examples against the v0.14.2 documentation linked above.
- Because the deployment uses `--registry=txt`, real Route 53 output will also include TXT ownership records alongside the primary DNS record.
- `kubectl` was not installed in the local workspace, so `kubectl` command syntax was verified against the official Kubernetes CLI reference rather than local `--help` output.
