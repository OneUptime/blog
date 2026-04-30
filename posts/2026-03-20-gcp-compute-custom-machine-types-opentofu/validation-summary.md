# Validation Summary: How to Create GCP Compute Instances with Custom Machine Types in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Platform (GCP)
- Google Compute Engine
- OpenTofu
- Google Cloud provider for OpenTofu/Terraform
- HCL

## Sources Consulted
- Google Cloud: Create a VM with a custom machine type - https://cloud.google.com/compute/docs/instances/creating-instance-with-custom-machine-type
- Google Cloud: General-purpose machine family for Compute Engine - https://cloud.google.com/compute/docs/general-purpose-machines
- Google Cloud: Operating system details - https://cloud.google.com/compute/docs/images/os-details
- Terraform Registry: `google_compute_instance` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance

## Issues Found
- The post stated that GCP custom machine types generally use `custom-{vCPUs}-{memoryMB}` and that extended memory uses `n1-custom-{vCPUs}-{memoryMB}-ext`. I corrected this because `custom-*` is the N1 form, other supported series use `{series}-custom-*`, and extended memory is enabled by appending `-ext` to the series-appropriate machine type name.
- The extended-memory example used `n1-custom-4-32768-ext`. I changed it to `custom-4-32768-ext` because N1 custom machine types use the `custom-*` prefix.
- The dynamic example built an N1-specific machine type string but described it generically. I clarified that the example constructs an N1 custom machine type string.
- The summary generalized the N1 `6.5 GB/vCPU` limit to all custom machine types. I changed it to refer to the default memory-per-vCPU ratio for the chosen machine series because the limits vary by series.

## Review Notes
- The image family references `debian-cloud/debian-12` and `ubuntu-os-cloud/ubuntu-2204-lts` are valid public image families as of April 30, 2026.
- The examples that use the `default` network assume the project still has the default VPC network and its auto-created subnetworks.
