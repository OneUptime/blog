# Validation Summary: How to Set Up ExternalDNS with Route53 for EKS Kubernetes Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Services and Ingress resources
- ExternalDNS
- Amazon EKS
- Amazon Route53
- AWS IAM and IRSA
- eksctl
- Helm
- AWS Load Balancer Controller
- Prometheus metrics

## Sources Consulted
- ExternalDNS AWS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- ExternalDNS flags reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/flags/
- ExternalDNS annotations reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS FAQ: https://kubernetes-sigs.github.io/external-dns/latest/docs/faq/
- ExternalDNS metrics documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/monitoring/metrics/
- AWS eksctl IRSA documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- AWS Load Balancer Controller Ingress annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- Amazon Route53 alias record documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html

## Issues Found
- The Route53 IAM policy was missing `route53:ListTagsForResources`, which is included in the current ExternalDNS AWS IAM policy. Added it and scoped `route53:ListResourceRecordSets` to hosted zone resources.
- The IRSA setup did not mention associating the EKS IAM OIDC provider. Added the `eksctl utils associate-iam-oidc-provider` command before creating the IAM service account.
- The Helm examples used the deprecated `provider=aws` chart value. Updated them to `provider.name=aws`, which matches the current ExternalDNS chart documentation.
- The raw kubectl manifest only created a Deployment and reused the service account, but did not grant Kubernetes RBAC permissions to read Services, Ingresses, Pods, Endpoints, and Nodes. Added a `ClusterRole` and `ClusterRoleBinding`.
- The raw kubectl manifest used the older `v0.14.0` ExternalDNS image. Updated it to `v0.21.0`, matching the current ExternalDNS AWS tutorial.
- The listed metric `external_dns_controller_verified_a_records` is an older metric name. Updated it to the current `external_dns_controller_verified_records` metric.

## Review Notes
The tutorial is technically relevant and largely accurate after the fixes. The examples still use `--policy=sync`, which is valid, but production users should understand that sync mode can delete records owned by that ExternalDNS instance when Kubernetes sources are removed.
