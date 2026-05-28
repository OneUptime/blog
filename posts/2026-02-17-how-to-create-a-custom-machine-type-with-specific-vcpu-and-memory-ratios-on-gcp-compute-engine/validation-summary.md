# Validation Summary: How to Create a Custom Machine Type with Specific vCPU and Memory Ratios

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Compute Engine custom machine types
- Google Cloud CLI
- Terraform Google provider
- Google Cloud Recommender API

## Sources Consulted
- Google Cloud Compute Engine custom machine type documentation: https://cloud.google.com/compute/docs/instances/creating-instance-with-custom-machine-type
- Google Cloud general-purpose machine family documentation: https://cloud.google.com/compute/docs/general-purpose-machines
- Google Cloud CLI reference for `gcloud compute instances create`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud CLI reference for `gcloud compute instances set-machine-type`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/set-machine-type
- Terraform Google provider `google_compute_instance` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Google Cloud machine type recommendations documentation: https://cloud.google.com/compute/docs/instances/apply-machine-type-recommendations-for-instances

## Issues Found
- The constraints section stated one standard memory-per-vCPU range for all custom machine types. Updated it to clarify that the standard memory range depends on the machine series, with N1 differing from E2, N2, and N2D.
- The constraints section listed only N1, N2, N2D, and E2 as custom machine type series. Updated it to include current N-series options such as N4, N4A, and N4D.
- The memory increment statement was too broad. Updated it to note that N1, N2, N2D, E2, N4, and N4D use 256 MB increments, while N4A uses 1 GB increments.
- The cost comparison claimed a specific 10-15% savings range. Updated it because Google Cloud documents a custom machine type pricing premium, so exact savings depend on region and machine series.

## Review Notes
The gcloud examples, Terraform custom machine type string formats, extended memory suffix, stopped-VM requirement for machine type changes, and Recommender CLI example match the referenced official documentation. The local environment did not have `gcloud` installed, so CLI flag validation was performed against the official Google Cloud CLI reference instead of local `--help` output.
