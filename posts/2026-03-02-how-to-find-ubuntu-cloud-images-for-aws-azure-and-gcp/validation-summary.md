# Validation Summary: How to Find Ubuntu Cloud Images for AWS, Azure, and GCP

## Status
validated

## Post Type
Tutorial / Cloud infrastructure guide

## Technologies Covered
- Ubuntu cloud images
- AWS EC2, AWS CLI, and AWS Systems Manager Parameter Store
- Azure Virtual Machines and Azure CLI
- Google Compute Engine and gcloud CLI
- Terraform AWS, AzureRM, and Google providers
- Bash, curl, and Python JSON parsing

## Sources Consulted
- Canonical Ubuntu on AWS documentation: https://documentation.ubuntu.com/aws/aws-how-to/instances/find-ubuntu-images/
- Canonical Ubuntu on Azure documentation: https://documentation.ubuntu.com/azure/azure-how-to/instances/find-ubuntu-images/
- Canonical Ubuntu on GCP documentation: https://documentation.ubuntu.com/gcp/google-how-to/gce/find-ubuntu-images/
- Google Compute Engine operating system details: https://cloud.google.com/compute/docs/images/os-details
- Google Compute Engine OS image lifecycle and naming conventions: https://cloud.google.com/compute/docs/images/os-image-lifecycle
- Google Cloud CLI installation documentation: https://cloud.google.com/sdk/docs/install
- Microsoft Azure CLI `az vm image` documentation: https://learn.microsoft.com/en-us/cli/azure/vm/image
- Terraform AWS provider `aws_ssm_parameter` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter
- Terraform Google provider `google_compute_image` data source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/compute_image
- Canonical EC2 AMI locator data endpoint: https://cloud-images.ubuntu.com/locator/ec2/releasesTable

## Issues Found
- The AWS minimal AMI name filter used `amd64-minimal-*`, but Canonical's EC2 AMI naming uses the `server-minimal` product string. Updated the filter to `ubuntu-noble-24.04-amd64-server-minimal-*`.
- The Ubuntu AMI locator parsing example used the wrong column indexes for region, release, and architecture. Updated the Python snippet to match the current `releasesTable` row layout and select the newest matching serial.
- Ubuntu 24.04 AWS SSM paths used `ebs-gp2`; Canonical documents `ebs-gp3` for Ubuntu releases >= 23.10. Updated the 24.04 standard, minimal, Terraform, and helper-script parameter paths to `ebs-gp3`.
- The AWS SSM comment said public parameters require no authentication. Removed that claim because the parameters are public, but normal AWS API access still depends on AWS CLI credentials.
- The Azure section described SKUs as versions and selected `[-1]` without sorting. Updated the wording and changed the examples to sort by image `version` before selecting the latest item.
- The Azure 22.04 example and reference format used the older `0001-com-ubuntu-server-jammy` offer and `22_04-lts` SKU. Updated them to the current Canonical-documented `ubuntu-22_04-lts` offer and `server` SKU.
- The Azure SKU guidance said `server-gen2` for Gen2 VMs. Updated it to `server` for Gen2 and `server-gen1` for Gen1, matching Canonical's current Azure URNs.
- The GCP install command used the older `google-cloud-sdk` package name directly through `apt`. Updated it to Google's current Ubuntu snap install command for `google-cloud-cli`.
- The GCP 24.04 x86 examples used `ubuntu-2404-lts`; Google Cloud's current OS details list `ubuntu-2404-lts-amd64` as the x86 image family. Updated the gcloud and Terraform examples accordingly.

## Review Notes
Local AWS, Azure, gcloud, and Terraform CLIs were not installed in the review environment, so command validation was performed against official documentation and the live Canonical AMI locator endpoint. The corrected AMI locator Python snippet was executed successfully against the live endpoint.
