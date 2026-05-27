# Validation Summary: How to Use Confidential VMs to Encrypt Data in Use on Compute Engine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Confidential VM
- AMD SEV
- AMD SEV-SNP
- Intel TDX
- gcloud CLI
- Terraform Google provider
- Shielded VM
- Cloud KMS / CMEK
- Google Cloud Organization Policy
- Go-TPM Tools

## Sources Consulted
- Google Cloud Confidential VM overview: https://cloud.google.com/confidential-computing/confidential-vm/docs/confidential-vm-overview
- Google Cloud Confidential VM supported configurations: https://cloud.google.com/confidential-computing/confidential-vm/docs/supported-configurations
- Google Cloud create Confidential VM instance guide: https://cloud.google.com/confidential-computing/confidential-vm/docs/create-your-first-confidential-vm-instance
- Google Cloud Confidential VM pricing: https://cloud.google.com/confidential-computing/confidential-vm/pricing
- gcloud compute instances create reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- gcloud compute instance-templates create reference: https://cloud.google.com/sdk/gcloud/reference/compute/instance-templates/create
- Google Cloud Confidential VM attestation documentation: https://cloud.google.com/confidential-computing/confidential-vm/docs/attestation
- Google Go-TPM Tools repository: https://github.com/google/go-tpm-tools
- Google Cloud organization policy constraints reference: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- gcloud resource-manager org-policies reference: https://cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies
- Terraform Google provider google_compute_instance documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Terraform Google provider google_compute_instance_template documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_template

## Issues Found
- The post said Confidential VMs only use AMD SEV or AMD SEV-SNP and that Intel-based types are unsupported. Updated the explanation to include Intel TDX and current supported machine families.
- The post said AMD SEV-SNP is available on C2D and N2D. Updated it to N2D with the AMD Milan CPU platform, matching current supported configurations.
- The gcloud examples used the older `--confidential-compute` flag. Updated examples to use `--confidential-compute-type=SEV` or `SEV_SNP`.
- The AMD SEV examples did not pin the AMD Milan CPU platform and claimed live migration was impossible for encrypted memory. Added `--min-cpu-platform="AMD Milan"` and used `--maintenance-policy=MIGRATE` for N2D SEV examples, while keeping `TERMINATE` for SEV-SNP.
- The post claimed AMD SEV had no additional cost. Updated the pricing note to state that Confidential VM incurs additional per-vCPU and memory charges that vary by technology and pricing model.
- The Terraform examples enabled Confidential Compute but did not specify `confidential_instance_type` or `min_cpu_platform`. Added `confidential_instance_type = "SEV"` and `min_cpu_platform = "AMD Milan"`, and updated the maintenance policy to `MIGRATE` for N2D SEV.
- The performance section gave a fixed 2-6% overhead claim. Replaced it with Google's documented workload-dependent wording that SEV performance can be close to a standard VM.
- The attestation example referenced `github.com/google/go-tpm-tools/cmd/attest-tool`, which is not the Go-TPM Tools command. Updated it to install `github.com/google/go-tpm-tools/cmd/gotpm@latest`.
- The organization policy example used `enable-enforce`, which applies to boolean constraints. Updated it to use `gcloud resource-manager org-policies deny` with `is:compute.googleapis.com` for the list constraint `compute.restrictNonConfidentialComputing`.
- The wrapping paragraph repeated the outdated fixed 2-6% performance claim. Updated it to workload-dependent wording.

## Review Notes
The post is technically relevant and has been validated after corrections. A future improvement would be to add separate examples for Intel TDX and SEV-SNP attestation flows, because attestation tooling differs by Confidential Computing technology.
