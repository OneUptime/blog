# Validation Summary: How to Deploy Istio with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Terraform
- Terraform Helm provider
- Terraform Kubernetes provider
- Helm
- Kubernetes
- Amazon S3 Terraform backend

## Sources Consulted
- Istio Install with Helm: https://istio.io/latest/docs/setup/install/helm/
- Istio Upgrade with Helm: https://istio.io/latest/docs/setup/upgrade/helm/
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio 1.30.0 release announcement: https://istio.io/latest/news/releases/1.30.x/announcing-1.30/
- Istio 1.30.0 base chart values: https://raw.githubusercontent.com/istio/istio/1.30.0/manifests/charts/base/values.yaml
- Istio 1.30.0 istiod chart values and templates: https://raw.githubusercontent.com/istio/istio/1.30.0/manifests/charts/istio-control/istio-discovery/values.yaml
- Istio 1.30.0 gateway chart values: https://raw.githubusercontent.com/istio/istio/1.30.0/manifests/charts/gateway/values.yaml
- Istio MeshConfig API source: https://raw.githubusercontent.com/istio/api/1.30.0/mesh/v1alpha1/config.proto
- Istio ProxyConfig API source: https://raw.githubusercontent.com/istio/api/1.30.0/mesh/v1alpha1/proxy.proto
- Terraform Helm provider helm_release documentation: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Terraform plan command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform depends_on documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3

## Issues Found
- The post used Istio 1.22.0 as the default install version and 1.23.0 as the upgrade example. Both releases are outside Istio's current support window as of 2026-05-21. Updated the default install version to 1.30.0 and changed the upgrade example to show moving from an older supported 1.29 patch release to 1.30.0.
- The `templatefile` example passed `environment = var.environment`, but no `environment` variable was defined and the template did not use that value. Removed the unused argument so the snippet is self-contained.
- The S3 backend example did not enable state locking. Current Terraform S3 backend documentation supports native lockfile locking with `use_lockfile = true`, so the example now includes it.

## Review Notes
- The Istio Helm chart names, repository URL, install ordering, gateway values, `pilot` resource/autoscaling values, and `meshConfig` keys were checked against Istio 1.30.0 chart and API sources.
- Terraform CLI examples use valid `terraform init`, `terraform plan -out=...`, `terraform plan -var=...`, `terraform apply <plan>`, and `terraform destroy` forms. The local environment does not have Terraform or Helm installed, so validation was performed against official documentation and upstream chart sources rather than by executing the examples.
