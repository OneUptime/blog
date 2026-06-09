# Validation Summary: How to Configure GitLab CI Dynamic Environments with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD (dynamic environments, on_stop, auto_stop_in, CI_* predefined variables, GIT_STRATEGY)
- GitLab-managed Terraform state (HTTP backend)
- Terraform (1.7) - workspaces, HTTP backend, outputs, locals
- AWS provider resources (VPC, subnets, internet gateway, security groups, ALB, Route53, RDS PostgreSQL, Secrets Manager)
- Kubernetes Terraform provider (namespaces, resource quotas, network policies)
- AWS CLI (ECS service updates)
- Docker / Docker-in-Docker
- GitLab REST API v4 (environments, terraform/state, repository branches)

## Sources Consulted
- GitLab Terraform state HTTP backend docs: https://docs.gitlab.com/user/infrastructure/iac/terraform_state/
- GitLab CI/CD environments docs (on_stop, action: stop, auto_stop_in)
- GitLab predefined CI/CD variables (CI_MERGE_REQUEST_IID, CI_COMMIT_REF_SLUG, CI_API_V4_URL, CI_JOB_TOKEN, etc.)
- GitLab REST API for environments and Terraform state
- Terraform AWS provider documentation (aws_vpc, aws_lb, aws_db_instance, aws_route53_record, aws_secretsmanager_secret)
- Terraform Kubernetes provider documentation (kubernetes_namespace, kubernetes_resource_quota, kubernetes_network_policy)
- Docker Hub for hashicorp/terraform:1.7 image
- AWS RDS PostgreSQL engine version support

## Issues Found
- **Inconsistent job reference in `deploy_app`**: The `deploy_app` job under "Container Deployment to Dynamic Environments" listed `needs: - job: terraform_apply` but no `terraform_apply` job was defined anywhere in the post. The terraform `apply` step is performed by the `deploy` job (both in the basic and complete pipeline examples). Updated the dependency to reference `deploy` so the example is consistent with the rest of the post.

## Review Notes
- The `cleanup` job in the "Basic Dynamic Environment Pipeline" sets `GIT_STRATEGY: none` and then `cd ${TF_ROOT}`. Because the source isn't checked out, the directory won't exist on first run unless cached. The post later improves this in the `stop_review` job by performing `git clone --depth 1 --branch main` of the project to retrieve the Terraform configuration — that pattern is the correct production approach. The basic example is left as-is because it represents an intentional simplification before the GitLab-managed state section.
- `data.aws_route53_zone.main` is referenced in the route53 record but not declared in the snippet. This is a common tutorial omission (the data source declaration is implied) and not technically incorrect.
- The `cleanup_orphans` job inherits the `hashicorp/terraform:1.7` image but invokes `curl` and `jq`. The HashiCorp Terraform Alpine-based image historically did not include `jq` by default. Readers may need to either install `jq` in a script step or use a different base image. Not changed because it falls outside strict technical correctness of the example.
- The HTTP backend lock/unlock method values (`POST` / `DELETE`) match the official GitLab docs.
- `auto_stop_in: 1 week` uses GitLab's duration parser; the format is valid.
- `terraform output -raw <name>` is valid (Terraform 0.13+).
- RDS `engine_version = "15"` is valid — AWS resolves to the latest supported minor version for PostgreSQL 15 family.
- `stage: .pre` is a valid GitLab reserved stage that runs before all other stages.
- The GitLab API `environments?states=available` query parameter (plural `states`) is correct per the current API.
