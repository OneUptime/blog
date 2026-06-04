# Validation Summary: How to Use AWS Load Balancer Controller for ALB and NLB on EKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EKS
- AWS Load Balancer Controller
- Kubernetes Ingress
- Kubernetes Service type LoadBalancer
- Application Load Balancer (ALB)
- Network Load Balancer (NLB)
- IAM Roles for Service Accounts (IRSA)
- Helm
- Terraform
- AWS WAF
- Amazon Cognito
- TargetGroupBinding

## Sources Consulted
- Amazon EKS: Install AWS Load Balancer Controller with Helm: https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
- Amazon EKS: Route TCP and UDP traffic with Network Load Balancers: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- AWS Load Balancer Controller ingress annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- AWS Load Balancer Controller service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- AWS Load Balancer Controller SSL redirect task: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/tasks/ssl_redirect/
- AWS Load Balancer Controller TargetGroupBinding documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/targetgroupbinding/targetgroupbinding/
- Terraform AWS IAM module for EKS IRSA roles: https://registry.terraform.io/modules/terraform-aws-modules/iam/aws/latest/submodules/iam-role-for-service-accounts-eks

## Issues Found
- The installation snippets referenced AWS Load Balancer Controller `v2.7.0` and Helm chart `1.7.0`, which are outdated for a 2026 guide. Updated the IAM policy URL to `v2.14.1` and the Helm chart version to `1.14.0`, matching current Amazon EKS installation documentation.
- The `eksctl create iamserviceaccount` example omitted the region flag and override flag shown in current Amazon EKS guidance. Added `--region us-east-1` and `--override-existing-serviceaccounts`.
- The ALB example used `/health` as the health check path for the stock `nginx:latest` image, which would not return HTTP 200 by default. Changed the health check path to `/`.
- The ALB test command called the load balancer hostname without the configured host header, while the Ingress rule is scoped to `example.com`. Added `-H 'Host: example.com'`.
- The NLB Service examples used `service.beta.kubernetes.io/aws-load-balancer-type: "nlb"`, which does not clearly select AWS Load Balancer Controller in current EKS documentation. Updated them to use `aws-load-balancer-type: "external"` with `aws-load-balancer-nlb-target-type: "instance"`.
- The NLB cross-zone example used the deprecated `aws-load-balancer-cross-zone-load-balancing-enabled` annotation. Replaced it with `service.beta.kubernetes.io/aws-load-balancer-attributes: load_balancing.cross_zone.enabled=true`.
- The Cognito authentication example used incorrect JSON key casing and a full Cognito domain hostname. Updated it to use `userPoolARN`, `userPoolClientID`, and `userPoolDomain` with the domain prefix, and added HTTPS listener and ACM certificate annotations because ALB authentication requires HTTPS listeners.

## Review Notes
The remaining examples are technically valid as illustrative manifests, but real deployments still require correctly tagged subnets, matching ACM certificate regions, reachable backend security groups, and existing Kubernetes Services for the routing examples.
