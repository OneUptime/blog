# Validation Summary: How to Provision GPU Instances for ML with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-style HCL
- AWS EC2
- AWS Systems Manager Parameter Store
- Azure Virtual Machines
- Azure VM Extensions
- Google Compute Engine
- GPU infrastructure for machine learning

## Sources Consulted
- HashiCorp AWS provider docs: `aws_instance` https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- HashiCorp AWS provider docs: `aws_spot_instance_request` https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/spot_instance_request.html.markdown
- HashiCorp AWS provider docs: `aws_ssm_parameter` https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/ssm_parameter.html.markdown
- AWS Deep Learning AMI docs for PyTorch on Ubuntu 22.04 https://docs.aws.amazon.com/dlami/latest/devguide/aws-deep-learning-x86-gpu-pytorch-2.6-ubuntu-22-04.html
- AWS EC2 previous-generation instance specs https://docs.aws.amazon.com/ec2/latest/instancetypes/pg.html
- AWS public EC2 price list for `us-east-1` https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/us-east-1/index.json
- AWS public spot pricing feed https://spot-price.s3.amazonaws.com/spot.js
- HashiCorp AzureRM provider docs: `azurerm_linux_virtual_machine` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/linux_virtual_machine.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_managed_disk` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/managed_disk.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_virtual_machine_data_disk_attachment` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/virtual_machine_data_disk_attachment.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_virtual_machine_extension` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/virtual_machine_extension.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_dev_test_global_vm_shutdown_schedule` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/dev_test_global_vm_shutdown_schedule.html.markdown
- Microsoft Learn: NVIDIA GPU Driver Extension for Linux https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/hpccompute-gpu-linux
- Microsoft Learn: Install NVIDIA GPU drivers on N-series VMs running Linux https://learn.microsoft.com/en-us/azure/virtual-machines/linux/n-series-driver-setup
- Microsoft Learn: supported Canonical Ubuntu image references https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-automatic-upgrade
- Azure Retail Prices API https://prices.azure.com/api/retail/prices
- HashiCorp Google provider docs: `google_compute_instance` https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_instance.html.markdown
- Google Cloud docs: GPU host maintenance requirements https://cloud.google.com/compute/docs/gpus/gpu-host-maintenance
- Google Cloud docs: Deep Learning VM CLI usage https://cloud.google.com/deep-learning-vm/docs/cli
- Google Cloud docs: Deep Learning VM image families https://cloud.google.com/deep-learning-vm/docs/images
- Google Cloud VM pricing https://cloud.google.com/compute/vm-instance-pricing
- Google Cloud GPU pricing https://cloud.google.com/compute/gpus-pricing

## Issues Found
- The AWS AMI lookup used an outdated name pattern. Current AWS DLAMI guidance uses public SSM parameters, so I changed the example to `data "aws_ssm_parameter"` with the current DLAMI path.
- The AWS `user_data` example incorrectly used `base64encode(...)` with the `user_data` argument. I changed it to plain text, which matches the provider contract.
- The AWS shutdown script was logically wrong because the cron line canceled the scheduled shutdown every hour. I removed that line and kept a simple 8-hour shutdown schedule.
- The AWS example always created the on-demand instance and optionally created a spot request, which could launch two GPU instances when `use_spot = true`. I made the on-demand and spot resources mutually exclusive with `count`.
- The AWS post used `aws_spot_instance_request`, but the provider explicitly recommends `aws_instance` with `instance_market_options` instead of that legacy API path. I replaced the spot example accordingly.
- The AWS storage comment incorrectly said `p3.2xlarge` had local NVMe instance storage. AWS documents `p3.2xlarge` as EBS-only, so I corrected the comment.
- The Azure example used an inline `data_disk` block that `azurerm_linux_virtual_machine` does not support. I replaced it with `azurerm_managed_disk` plus `azurerm_virtual_machine_data_disk_attachment`.
- The Azure example claimed a GPU-optimized image but did not actually configure NVIDIA drivers. I switched to a supported Ubuntu 20.04 image and added the official NVIDIA GPU driver VM extension.
- The GCP example assumed `zone = "${var.region}-a"`, which is not reliable for GPU availability. I changed it to an explicit `var.zone`.
- The GCP example suggested `nvidia-a100-80gb` on an `n1-standard-8` VM, but attachable A100 GPUs are not an N1 pattern. I limited the example comment to attachable N1 GPU types (`T4` and `V100`).
- The pricing table contained stale spot/preemptible values and an outdated GCP on-demand example. I updated the table with current public pricing sources and added a date/region caveat.

## Review Notes
- AWS `p3` instances are still valid as a pricing/cost example, but current Ubuntu 22.04 DLAMIs in the AWS Deep Learning AMI catalog are aimed at newer GPU families. The code example now uses a currently documented DLAMI path and instance examples that align with it.
- Google Cloud spot pricing is intentionally left dynamic in the table because Google’s official pricing docs state that spot prices change and do not appear in most pricing tables.
