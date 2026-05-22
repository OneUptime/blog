# Validation Summary: How to Use Terraform with Spinnaker for Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Spinnaker
- Spinnaker Gate API
- Spinnaker pipelines and Deploy Manifest stages
- Spinnaker Terraform Integration plugin
- Kubernetes
- Amazon EKS
- AWS IAM roles for service accounts
- AWS S3
- Helm

## Sources Consulted
- Spinnaker installation documentation: https://spinnaker.io/docs/setup/install/
- Spinnaker Halyard deprecation notice: https://spinnaker.io/docs/reference/halyard/
- Spinnaker pipeline lifecycle and Spin CLI documentation: https://spinnaker.io/docs/guides/spin/pipeline/
- Spinnaker API reference for saving and invoking pipelines: https://spinnaker.io/docs/reference/api/docs
- Spinnaker pipeline stage reference: https://spinnaker.io/docs/reference/pipeline/stages/
- Armory Terraform Integration plugin documentation for Spinnaker: https://docs.armory.io/plugins/terraform/use/
- HashiCorp Terraform Helm provider `helm_release` documentation: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- HashiCorp Terraform Kubernetes provider `kubernetes_service_account` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service_account
- HashiCorp Terraform AWS provider `aws_iam_role` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Amazon EKS Kubernetes version lifecycle documentation: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS IAM roles for service accounts documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- OpsMx Spinnaker Helm chart metadata: https://artifacthub.io/packages/helm/opsmx/spinnaker

## Issues Found
- The prerequisites described Halyard as a current installation option. Spinnaker documentation now marks Halyard as deprecated, so the wording was updated to recommend current Kustomize-based installation guidance while acknowledging existing installations.
- The EKS example used Kubernetes `1.29`, which is no longer listed as a current Amazon EKS supported version on May 22, 2026. The example was updated to `1.33`, which is in standard support according to the Amazon EKS lifecycle documentation.
- The Helm release snippet had a comment saying it set resource limits, but the value shown configures a Gate profile override. The comment was corrected.
- The "Pipeline Templates" heading was technically imprecise because the example saves a normal pipeline definition through Gate, not Spinnaker's pipeline-template feature. The heading was changed to "Pipeline Configurations."
- The canary and production Deploy Manifest stages omitted the artifact source fields used by the staging Deploy Manifest stage. The stages now include `source = "artifact"` and `manifestArtifactId = "deployment-manifest"`.
- The post described the Terraform stage as built into Spinnaker. Official Terraform Integration documentation describes it as a plugin plus Terraformer service, so the text and best-practices section were corrected.

## Review Notes
The Terraform and Helm CLIs are not installed in this workspace, so local command-based validation could not be run. The HCL snippets were reviewed for syntax and checked against official Terraform provider documentation where applicable. The Spinnaker pipeline JSON examples are still intentionally illustrative; production users should export known-good pipeline JSON from Deck or manage it with the Spin CLI because plugin and account-specific stage fields can vary by Spinnaker installation.
