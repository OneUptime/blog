# Validation Summary: How to Use Confidential Computing with Confidential VMs for Sensitive Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Confidential VM
- Google Compute Engine
- Google Cloud CLI
- Terraform Google provider
- Cloud KMS / CMEK
- Shielded VM
- Cloud Monitoring
- Google Cloud Organization Policy

## Sources Consulted
- Google Cloud Confidential VM: Create a Confidential VM instance: https://docs.cloud.google.com/confidential-computing/confidential-vm/docs/create-a-confidential-vm-instance
- Google Cloud Confidential VM: Supported configurations: https://docs.cloud.google.com/confidential-computing/confidential-vm/docs/supported-configurations
- Google Cloud Confidential VM: Verify Confidential Computing is enabled: https://docs.cloud.google.com/confidential-computing/confidential-vm/docs/verify-confidential-computing-enabled
- Google Cloud Confidential VM: Enforce Confidential VM use: https://docs.cloud.google.com/confidential-computing/confidential-vm/docs/enforce-confidential-vm-use
- Google Cloud Confidential VM: Monitor Confidential VM integrity: https://docs.cloud.google.com/confidential-computing/confidential-vm/docs/monitor-integrity
- Google Cloud Monitoring metrics list: Compute Engine metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c
- Google Cloud SDK reference: gcloud compute instances create: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud SDK reference: gcloud compute instance-templates create: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instance-templates/create
- Google Cloud SDK reference: gcloud monitoring policies create: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Terraform Google provider: google_compute_instance: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance

## Issues Found
- The post described Confidential VMs as AMD SEV-only. Updated the overview to mention the current supported technologies: AMD SEV, AMD SEV-SNP, and Intel TDX.
- The post said the key machine type requirement was N2D or C2D. Updated this to refer to supported machine type, CPU platform, zone, and OS combinations, and listed the current AMD SEV families used in the example context.
- The gcloud VM and instance-template examples used the deprecated `--confidential-compute` flag. Replaced it with `--confidential-compute-type=SEV` and added `--min-cpu-platform="AMD Milan"` for the N2D AMD SEV example.
- The post stated that `TERMINATE` is always required because Confidential VMs cannot be live migrated. Updated this language because current Google Cloud documentation supports live migration for N2D AMD SEV VMs on AMD EPYC Milan.
- The verification command used a broad `dmesg | grep -i sev` check and an inaccurate expected output string. Updated it to the Google-documented `sudo dmesg | grep -i "Encryption Features active"` pattern and expected output.
- The text called `gcloud compute instances describe` output "instance metadata." Updated that wording to "instance description."
- The Terraform example enabled Confidential Compute without specifying the confidential technology type. Added `confidential_instance_type = "SEV"` and `min_cpu_platform = "AMD Milan"` to match the current provider example and Google Cloud requirements for the chosen machine family.
- The Cloud Monitoring alert command used non-current flag names for threshold creation and an uppercase integrity metric label value. Updated it to use `--if="> 0"` and `--duration=0s`, and changed `metric.labels.status` to the documented lowercase `failed` value.
- The organization policy example used an invalid denied value (`compute.googleapis.com/Instance`) for `constraints/compute.restrictNonConfidentialComputing`. Replaced the policy-file example with the documented `gcloud resource-manager org-policies deny constraints/compute.restrictNonConfidentialComputing compute.googleapis.com --folder=FOLDER_ID` command.

## Review Notes
- The examples intentionally use `--maintenance-policy=TERMINATE`. Current Google Cloud documentation notes that live migration is supported only for N2D AMD SEV VMs on AMD EPYC Milan, where `MIGRATE` can be used. `TERMINATE` remains valid and is required for Confidential VM configurations that do not support live migration.
