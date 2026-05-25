# Validation Summary: How to Use Helm with OCI Registries in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Helm provider
- Kubernetes
- Helm 3 OCI registries
- AWS Elastic Container Registry
- Azure Container Registry
- Google Artifact Registry
- Docker/OCI container registries

## Sources Consulted
- Helm documentation: Use OCI-based registries - https://helm.sh/docs/v3/topics/registries/
- HashiCorp Helm provider documentation - https://registry.terraform.io/providers/hashicorp/helm/latest/docs
- HashiCorp Terraform Provider Helm source documentation - https://github.com/hashicorp/terraform-provider-helm
- AWS ECR documentation: Private registry authentication - https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- AWS ECR documentation: Pushing a Helm chart to an Amazon ECR private repository - https://docs.aws.amazon.com/AmazonECR/latest/userguide/push-oci-artifact.html
- Terraform AWS provider documentation: aws_ecr_authorization_token - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ecr_authorization_token
- Microsoft Learn: Azure Container Registry authentication - https://learn.microsoft.com/azure/container-registry/container-registry-authentication
- Microsoft Learn: Push and pull Helm charts to an Azure container registry - https://learn.microsoft.com/azure/container-registry/container-registry-helm-repos
- Google Cloud documentation: Manage Helm charts in Artifact Registry - https://cloud.google.com/artifact-registry/docs/helm/manage-charts
- Google Cloud documentation: Set up authentication for Helm - https://cloud.google.com/artifact-registry/docs/helm/authentication

## Issues Found
- The description mentioned GCR even though the post covers Google Artifact Registry. Changed it to Google Artifact Registry.
- The introduction said OCI registries became the recommended way to distribute charts in Helm 3.8. Official Helm docs say OCI support became generally available and enabled by default in Helm 3.8. Updated the wording.
- The post claimed traditional Helm repositories have no standard authentication mechanism. Helm repositories can use HTTP authentication, so the wording was narrowed to the practical difference that auth is separate from container registry credentials.
- The Terraform guidance said OCI charts must not use the `repository` attribute and that setting `repository` to an OCI URL fails. The official Helm provider documentation supports OCI repository URLs in `repository` with the chart name in `chart`, as well as full chart URLs. Updated the explanation and troubleshooting note.
- The ECR provider example prefixed `aws_ecr_authorization_token.proxy_endpoint` with `oci://`, but that Terraform data source returns the registry URL used for Docker login, commonly including `https://`. Updated the example to replace the `https://` prefix with `oci://`.
- The Azure ACR snippet used admin credentials without noting that they are only populated when the ACR admin account is enabled. Added a short comment to make that requirement explicit.
- The Google Kubernetes provider example used the raw GKE endpoint as `host`. The Kubernetes/Helm provider expects a URI, so the example now prefixes the endpoint with `https://`.
- The Helm CLI section said `helm show all ... --version ...` lists available chart versions. That command inspects one chart version. Updated the text and comment, and kept the ECR CLI command as the version-listing example for ECR.

## Review Notes
- The examples intentionally pin the Helm provider to `~> 2.12`, so the block-style `kubernetes`, `registry`, and `set` syntax is appropriate for the provider 2.x line. Helm provider 3.x uses nested object/list syntax in current documentation, so future updates may want a separate provider 3.x refresh.
