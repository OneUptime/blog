# Validation Summary: How to Implement GitOps-Based Security Policy Management for Google Cloud

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Google Cloud
- Cloud Build
- Cloud Build triggers
- Terraform
- HashiCorp Google Terraform provider
- Google Cloud IAM Conditions
- Google Cloud Organization Policy
- GKE Config Sync
- Kubernetes NetworkPolicy
- OPA/Rego
- Conftest
- Cloud Scheduler
- Cloud Functions for Python
- Google Cloud Python client libraries

## Sources Consulted
- Google Cloud Cloud Build trigger documentation: https://docs.cloud.google.com/build/docs/automating-builds/create-manage-triggers
- Google Cloud CLI reference for GitHub build triggers: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud Build substitutions documentation: https://docs.cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Terraform CLI plan command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform releases: https://releases.hashicorp.com/terraform/
- Terraform Registry documentation for `google_compute_firewall`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- Terraform Registry documentation for `google_project_organization_policy` and `google_org_policy_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_organization_policy and https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/org_policy_policy
- Google Cloud Organization Policy constraints documentation: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- Google Cloud IAM Conditions documentation: https://docs.cloud.google.com/iam/docs/conditions-overview
- GKE Config Sync installation documentation: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/how-to/installing-config-sync
- Google Cloud Policy Controller migration documentation: https://cloud.google.com/kubernetes-engine/policy-controller/docs/how-to/migrate-policy-controller-api
- OPA/Rego policy language documentation: https://www.openpolicyagent.org/docs/latest/policy-language/
- Conftest documentation: https://www.conftest.dev/
- Google Cloud Python Compute Firewalls client documentation: https://docs.cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.services.firewalls.FirewallsClient
- Google Cloud Storage Python list objects sample: https://docs.cloud.google.com/storage/docs/samples/storage-list-files-with-prefix

## Issues Found
- The IAM Condition example used a condition on `roles/editor`, but Google Cloud IAM Conditions do not support legacy basic roles. Changed the conditional binding to `roles/compute.networkAdmin`.
- The organization policy Terraform examples used the superseded `google_project_organization_policy` resource and mixed legacy constraint formatting. Updated them to `google_org_policy_policy` using Organization Policy API v2 syntax.
- The Cloud Build pipeline ran Conftest before the Terraform plan step in the YAML order and generated the JSON plan incorrectly with `terraform plan -out=plan.tfplan -json`. Updated the pipeline to create a saved plan with `terraform plan -out=plan.tfplan` and convert it with `terraform show -json`.
- The apply step used `$BRANCH_NAME = main`, which can be unsafe with a shared PR/apply build config because pull request triggers also target `main`. Updated the guard to apply only when the trigger name is `security-policy-apply`, and to apply the saved plan file.
- The Terraform builder image was pinned to the old `hashicorp/terraform:1.7`. Updated examples to `hashicorp/terraform:1.14.6`, a current stable Terraform release available in HashiCorp releases.
- The Config Sync example used the older `ConfigManagement` Kubernetes manifest shape and included `policyController` in the Config Management configuration. Updated it to the current `gcloud beta container fleet config-management` `apply-spec.yaml` format and removed Policy Controller from that Config Sync config.
- The Rego policy used pre-OPA-v1 partial set rule syntax and a non-default package name while the Conftest command did not specify a namespace. Updated the package to `main` and changed rules to `deny contains msg if`.
- The Python drift detection sample referenced undefined helper functions and imported unused clients. Added concrete helper implementations for loading expected firewall rules from Cloud Storage and logging drift alerts, removed the unimplemented organization-policy drift call, and made the project and bucket configurable with environment variables.

## Review Notes
- The Config Sync token authentication example assumes the required token secret has already been configured for the cluster.
- The drift detection sample now checks unexpected firewall rules only; a production implementation would usually compare full rule fields and add separate checks for IAM and organization policies.
