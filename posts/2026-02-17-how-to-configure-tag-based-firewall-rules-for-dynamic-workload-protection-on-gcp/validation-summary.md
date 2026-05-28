# Validation Summary: How to Configure Tag-Based Firewall Rules for Dynamic Workload Protection on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Compute Engine VM instances and instance templates
- VPC firewall rules
- Network tags
- Resource Manager secure tags
- Global and regional network firewall policies
- Google Cloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud: Secure tags for firewalls: https://docs.cloud.google.com/firewall/docs/tags-firewalls-overview
- Google Cloud: Create and manage secure tags: https://docs.cloud.google.com/firewall/docs/use-tags-for-firewalls
- Google Cloud: Use VPC firewall rules: https://docs.cloud.google.com/firewall/docs/using-firewalls
- Google Cloud SDK reference: `gcloud compute firewall-rules create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Google Cloud SDK reference: `gcloud compute network-firewall-policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/network-firewall-policies/create
- Google Cloud SDK reference: `gcloud compute network-firewall-policies rules create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/network-firewall-policies/rules/create
- Google Cloud SDK reference: `gcloud compute network-firewall-policies associations create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/network-firewall-policies/associations/create
- Google Cloud SDK reference: `gcloud compute instance-templates create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instance-templates/create
- Google Cloud Resource Manager: Create and manage tags: https://docs.cloud.google.com/resource-manager/docs/tags/tags-creating-and-managing
- Terraform Registry: `google_compute_firewall`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- Terraform Registry: `google_compute_instance_template`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_template

## Issues Found
- The introduction described firewall targeting as based on labels attached to workloads. Google Cloud labels are separate from network tags and Resource Manager tags, so this was changed to "tags attached to your workloads."
- The secure tag key creation command omitted `--purpose=GCE_FIREWALL` and `--purpose-data`. Cloud NGFW secure tags must use the `GCE_FIREWALL` purpose, so these flags were added with VPC-scoped purpose data.
- The regional network firewall policy rule examples used `--region=us-central1`. The `gcloud compute network-firewall-policies rules create` command uses `--firewall-policy-region` for regional policies, so both rule examples were corrected.
- The regional network firewall policy association example used `--region=us-central1`. The association command uses `--firewall-policy-region`, so the command was corrected.
- The managed instance group note said to bind secure tags at the instance group level. The supported automation path is to apply Resource Manager tags through instance templates or tag bindings, so the sentence was corrected.

## Review Notes
Local `gcloud` was not installed in the review environment, so CLI validation was performed against the official Google Cloud SDK reference documentation instead of local `--help` output. The remaining network tag, VPC firewall rule, Resource Manager tag binding, instance template, and Terraform examples are consistent with the official documentation consulted.
