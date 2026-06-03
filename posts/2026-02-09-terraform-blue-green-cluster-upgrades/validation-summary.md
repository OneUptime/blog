# Validation Summary: How to Build Terraform Workspaces for Blue-Green Kubernetes Cluster Upgrades

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform S3 backend
- HashiCorp AWS provider
- Amazon EKS
- Amazon EC2 launch templates and IMDSv2
- Amazon Route 53 weighted alias records
- Elastic Load Balancing / Application Load Balancers
- AWS CLI for EKS
- kubectl and Kubernetes manifests

## Sources Consulted
- Terraform CLI workspaces documentation: https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- AWS provider `aws_lb` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb.html
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS launch template documentation: https://docs.aws.amazon.com/eks/latest/userguide/launch-templates.html
- Amazon Route 53 alias record documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html
- AWS CLI `eks wait cluster-active` reference: https://docs.aws.amazon.com/cli/latest/reference/eks/wait/cluster-active.html
- AWS CLI `eks update-kubeconfig` reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The S3 backend example used `dynamodb_table` for state locking. Terraform's S3 backend now marks DynamoDB locking as deprecated, so the snippet was updated to use `use_lockfile = true` and an explicit `workspace_key_prefix`.
- The workspace state path comment was too imprecise. It now describes the non-default workspace path shape for the configured S3 backend prefix.
- The EKS versions `1.28` and `1.29` are outdated for a 2026 tutorial. The examples now use `1.34` and `1.35`, which are in the current Amazon EKS support window on the review date.
- The cluster module defined `public_endpoint` in workspace configuration but did not pass it into the module, and the module hard-coded endpoint public access from `environment`. The module now uses `var.public_endpoint`, and the root module passes `local.config.public_endpoint`.
- The node group referenced `aws_launch_template.nodes` to enforce IMDSv2 but did not define the launch template. Added a minimal launch template with `http_tokens = "required"`.
- The Route 53 alias example incorrectly targeted the EKS cluster API endpoint. Route 53 alias records should point to supported AWS resources such as an ALB, so the snippet now aliases to `aws_lb.ingress.dns_name` and `aws_lb.ingress.zone_id`.
- The workload migration script exported live Kubernetes objects with `kubectl get -o yaml` and re-applied them to another cluster, which is unreliable because live objects include generated metadata. The script now applies version-controlled manifests recursively to the green cluster.
- The smoke test used `kubectl run --rm -i` without an explicit attach flag. The command now includes `--attach=true`, matching the documented constraint for `--rm`.
- Rollback claims described DNS rollback as instant. The text now says rollback is fast and notes that DNS cutovers are affected by TTLs and resolver/client caching.

## Review Notes
The Terraform snippets are illustrative and still assume supporting resources and variables exist, including IAM roles, security groups, subnet data sources, Route 53 zones, and ALB data sources for the cutover example. The health check also assumes the runner can reach private EKS endpoints when `public_endpoint = false`, and that Metrics Server is installed before `kubectl top nodes` is expected to pass.
