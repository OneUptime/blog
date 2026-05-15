# Validation Summary: How to Use Terraform to Provision RHEL VMs on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Google provider
- Google Cloud Compute Engine
- Red Hat Enterprise Linux 9
- Google Cloud CLI
- Google Cloud firewall rules

## Sources Consulted
- Terraform Google provider `google_compute_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Terraform Google provider `google_compute_firewall` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- Terraform `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- Terraform `pathexpand` function documentation: https://developer.hashicorp.com/terraform/language/functions/pathexpand
- Terraform strings and templates documentation: https://developer.hashicorp.com/terraform/language/expressions/strings
- Google Cloud Terraform authentication documentation: https://cloud.google.com/docs/terraform/authentication
- Google Cloud Compute Engine operating system image details: https://cloud.google.com/compute/docs/images/os-details
- Google Cloud SSH key metadata documentation: https://cloud.google.com/compute/docs/connect/add-ssh-keys
- Google Cloud persistent disk documentation: https://cloud.google.com/compute/docs/disks/persistent-disks
- Google Cloud CLI `gcloud compute ssh` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/ssh
- Google Cloud CLI `gcloud compute images list` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/images/list

## Issues Found
- The Terraform SSH metadata example used `file("~/.ssh/id_rsa.pub")`. Terraform's `file` function reads the path it is given and does not itself expand `~`; Terraform provides `pathexpand` for paths that begin with a home-directory segment. Changed the example to `file(pathexpand("~/.ssh/id_rsa.pub"))` so the public key path resolves correctly.

## Review Notes
- The `rhel-cloud/rhel-9` image reference is valid as a Google provider image family reference for the RHEL 9 image family in the `rhel-cloud` project.
- The `google_compute_instance` and `google_compute_firewall` resource arguments used in the post are current for the Terraform Google provider 7.x series.
- The firewall rule opens SSH from `0.0.0.0/0`; the post already notes that this should be restricted in production.
- Terraform and the Google Cloud CLI were not installed in the local environment, so I could not run `terraform fmt`, `terraform validate`, or local `gcloud` help commands. The configuration and commands were reviewed against official syntax, provider, and CLI documentation instead.
