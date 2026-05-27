# Validation Summary: How to Manage Kubernetes Resources with the Terraform Kubernetes Provider

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Terraform Kubernetes provider
- Kubernetes Deployments
- Kubernetes Services
- Kubernetes Namespaces
- Kubernetes ConfigMaps
- Kubernetes Secrets
- Terraform CLI

## Sources Consulted
- HashiCorp Terraform Kubernetes provider documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- Kubernetes provider v3 upgrade guide: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/guides/v3-upgrade-guide
- Kubernetes provider `kubernetes_service_v1` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service_v1
- Kubernetes provider `kubernetes_secret_v1` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret_v1
- Kubernetes provider `kubernetes_deployment_v1` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment_v1
- HashiCorp Terraform CLI `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform dependency and `depends_on` documentation: https://developer.hashicorp.com/terraform/language/meta-arguments
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes liveness/readiness/startup probes documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- OneUptime website availability check: https://oneuptime.com

## Issues Found
- The provider version was pinned to `~> 2.25.0`, while the current Kubernetes provider line is v3 and the v3 upgrade guide marks non-version-suffixed resources as deprecated. Updated the provider pin to `~> 3.1.0` and changed examples to versioned resources such as `kubernetes_namespace_v1`, `kubernetes_deployment_v1`, `kubernetes_service_v1`, `kubernetes_config_map_v1`, and `kubernetes_secret_v1`.
- The provider configuration text implied that a cluster and Kubernetes resources could be safely managed in the same apply by chaining cluster outputs into the Kubernetes provider. Updated it to describe the supported pattern of using outputs from a separate configuration or apply step.
- The nginx Deployment used a liveness probe path of `/healthz`, which the default nginx image does not serve successfully. Changed the liveness probe path to `/`.
- The variables section defined `app_name`, `replicas`, and `image_tag`, but the Deployment did not use them. Updated the Deployment to use those variables.
- The sample `terraform plan` and `terraform apply` commands only supplied `image_tag`, but the configuration also requires `db_password` and `api_key`. Updated the commands to include all required variables.
- The dependency diagram implied Terraform could infer Service-to-Deployment and ConfigMap-to-Deployment dependencies that were not present in the configuration. Updated the text and diagram, and added `depends_on` for the Service because the relationship through labels is not an implicit Terraform reference.
- The LoadBalancer output assumed an IP address only. Updated it to return an IP or hostname and enabled `wait_for_load_balancer` on the Service so Terraform waits for a load balancer endpoint before completing the Service create operation.
- Added a state-security caveat for Kubernetes Secret data because Terraform marks secret values as sensitive in output but stores resource arguments in Terraform state.

## Review Notes
Terraform and OpenTofu were not installed in the workspace, so I could not run `terraform validate` locally. The snippets were reviewed against the current official provider and Terraform CLI documentation instead.
