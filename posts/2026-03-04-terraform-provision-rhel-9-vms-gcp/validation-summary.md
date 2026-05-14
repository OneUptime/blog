# Validation Summary: How to Use Terraform to Provision RHEL 9 VMs on GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Terraform
- Google Cloud Compute Engine
- Google Cloud CLI
- cloud-init
- Red Hat subscription-manager
- Red Hat Insights
- SELinux
- firewalld

## Sources Consulted
- Google Cloud documentation: Provision Compute Engine resources with Terraform - https://cloud.google.com/compute/docs/terraform
- Google Cloud documentation: Operating system details for Compute Engine public images - https://cloud.google.com/compute/docs/images/os-details
- HashiCorp Terraform Google provider documentation for google_compute_instance - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Red Hat documentation: Deploying RHEL 9 on Google Cloud - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_rhel_9_on_google_cloud/
- Red Hat documentation: Configuring and managing cloud-init for RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_cloud-init_for_rhel_9/
- Red Hat documentation: Red Hat Insights client configuration guide - https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/client_configuration_guide_for_red_hat_insights/
- Red Hat documentation: Configuring firewalls and packet filters in RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/

## Issues Found
- The post title and description promised Terraform provisioning on GCP, but the launch step used AWS, Azure, and GCP CLI commands instead of Terraform. Replaced those commands with a minimal `google_compute_instance` Terraform configuration using the official RHEL 9 image family in the `rhel-cloud` project.
- The prerequisites referred to AWS, Azure, or GCP and cloud-specific CLI tools. Narrowed them to Google Cloud, Terraform, and the Google Cloud CLI to match the post scope.
- The cloud-init example defined a custom `users` list without preserving the default RHEL cloud user. Added `- default`, which Red Hat documents as required when adding users while keeping the default account.
- The registration step implied every GCP RHEL image needs `subscription-manager register --auto-attach`. Clarified that this applies to bring-your-own-subscription images; Google Cloud on-demand RHEL images include the Red Hat product billing.
- The networking section still mentioned AWS security groups and Azure NSGs. Replaced that with Google Cloud firewall rules.

## Review Notes
The article is now technically aligned with the Terraform-on-GCP title, but it remains a brief starter guide. A future revision could add `terraform init`, `terraform plan`, and `terraform apply` commands, variables for region and zone, and a firewall rule example.
