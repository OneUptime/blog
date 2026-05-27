# Validation Summary: Use Preemptible VMs with GPUs for Cost-Effective Machine Learning Training

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Spot VMs / preemptible VM concepts
- Compute Engine GPUs
- Deep Learning VM Images
- Cloud Storage
- PyTorch checkpointing and torchrun
- Terraform Google provider
- Bash startup and shutdown scripts
- gcloud CLI

## Sources Consulted
- Google Cloud Compute Engine Spot VMs: https://docs.cloud.google.com/compute/docs/instances/spot
- Google Cloud Create and use Spot VMs: https://docs.cloud.google.com/compute/docs/instances/create-use-spot
- Google Cloud gcloud compute instances create reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud GPU host maintenance documentation: https://docs.cloud.google.com/compute/docs/gpus/gpu-host-maintenance
- Google Cloud host maintenance policy documentation: https://docs.cloud.google.com/compute/docs/instances/setting-vm-host-options
- Google Cloud Deep Learning VM image documentation: https://docs.cloud.google.com/deep-learning-vm/docs/images
- Google Cloud GPU pricing documentation: https://cloud.google.com/compute/gpus-pricing
- Google Cloud Storage Python Blob API reference: https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.blob.Blob
- PyTorch torch.save documentation: https://docs.pytorch.org/docs/2.12/generated/torch.save.html
- PyTorch torch.load documentation: https://docs.pytorch.org/docs/2.12/generated/torch.load.html
- PyTorch torchrun elastic launch documentation: https://docs.pytorch.org/docs/stable/elastic/run.html
- Terraform google_compute_instance resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance

## Issues Found
- The post described "Preemptible (Spot) VMs" as though the terms were interchangeable. Updated the wording to say Spot VMs are the current version of preemptible VMs, matching Google Cloud documentation.
- The opening discount claim used "60-91%" while Google Cloud documents Spot VM discounts as up to 91%. Updated the sentence to avoid an unsupported lower bound.
- The post claimed a 100 GPU-hour training job could save thousands of dollars. Based on the listed example prices, that scale of job saves hundreds for one GPU, not thousands. Updated the sentence to distinguish 100 GPU-hours from larger multi-GPU jobs.
- The gcloud and Terraform examples used the deprecated Debian 11 Deep Learning VM image family `pytorch-latest-gpu-debian-11`. Updated the examples to use `pytorch-latest-gpu`, which tracks the current PyTorch GPU Deep Learning VM image family.
- The PyTorch SIGTERM handler saved `current_epoch` and `current_step`, but the training loop never updated those globals. Updated the loop to track `current_epoch`, `current_step`, and `current_loss`, and use them for emergency checkpoint saves.
- The resume logic skipped already processed batches, but the DataLoader used `shuffle=True`, which makes batch order non-deterministic across restarts unless sampler/RNG state is also saved. Changed the example DataLoader to `shuffle=False` for a resumable minimal example.
- The monitor script checked for a `STOPPED` Compute Engine status. Compute Engine stopped VM instances report `TERMINATED`, including Spot VMs with `STOP` termination action. Removed the invalid status check.
- The tips recommended Local SSD for data staging without warning that Local SSD data is lost when the VM stops. Updated the recommendation to use persistent disk or Cloud Storage for staging and noted the Local SSD caveat.

## Review Notes
- The local environment did not have `gcloud` or `terraform` installed, so CLI and Terraform checks were performed against official documentation rather than local command help.
- The PyTorch example still uses placeholder `MyModel()` and `MyDataset()` names, which is acceptable for an illustrative training script but would need project-specific definitions in a runnable example.
