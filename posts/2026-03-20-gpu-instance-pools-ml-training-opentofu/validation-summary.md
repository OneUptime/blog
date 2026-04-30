# Validation Summary: How to Set Up GPU Instance Pools for ML Training with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu HCL
- AWS EC2 Auto Scaling
- AWS Deep Learning AMIs
- AWS EFS
- Google Compute Engine managed instance groups
- Google Compute Engine autoscaling
- Google Deep Learning VM Images
- NVIDIA GPU/container tooling

## Sources Consulted
- OpenTofu CLI docs: https://opentofu.org/docs/cli/
- OpenTofu `init`: https://opentofu.org/docs/cli/init/
- OpenTofu `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS Deep Learning Base GPU AMI (Ubuntu 22.04): https://docs.aws.amazon.com/dlami/latest/devguide/aws-deep-learning-x86-base-gpu-ami-ubuntu-22-04.html
- AWS Deep Learning Base OSS Nvidia Driver GPU AMI (Ubuntu 22.04) 20260417: https://docs.aws.amazon.com/dlami/latest/devguide/aws-deep-learning-ami-gpubaseoss-ul2204-2026-04-20.html
- AWS EC2 accelerated instance specs: https://docs.aws.amazon.com/ec2/latest/instancetypes/ac.html
- Amazon EFS client install docs: https://docs.aws.amazon.com/efs/latest/ug/using-amazon-efs-utils.html
- Amazon EFS manual install docs: https://docs.aws.amazon.com/efs/latest/ug/installing-amazon-efs-utils.html
- Amazon EFS mount helper docs: https://docs.aws.amazon.com/efs/latest/ug/efs-mount-helper.html
- Amazon EFS NFS mount docs: https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-mount-cmd-dns-name.html
- Amazon EFS NFS client docs: https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-install-nfsclient.html
- NVIDIA Container Toolkit install guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.17.8/install-guide.html
- Google Compute Engine instance template docs: https://cloud.google.com/compute/docs/instance-templates/create-instance-templates
- Google Compute Engine GPU instance template sample: https://cloud.google.com/compute/docs/samples/compute-template-gpu
- Google Compute Engine autoscaling on Monitoring metrics: https://cloud.google.com/compute/docs/autoscaler/scaling-cloud-monitoring-metrics
- Google Compute Engine Spot VM docs: https://cloud.google.com/compute/docs/instances/create-use-spot
- Google Deep Learning VM image selection docs: https://cloud.google.com/deep-learning-vm/docs/images
- Google Deep Learning VM CLI docs: https://cloud.google.com/deep-learning-vm/docs/cli
- Terraform Registry `google_compute_instance_group_manager`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_group_manager

## Issues Found
- The AWS snippet selected `p3.2xlarge`, but the current Ubuntu 22.04 AWS Deep Learning Base GPU AMI no longer lists P3 as a supported instance family. I changed the example to current DLAMI-supported G5 sizes (`g5.xlarge` and `g5.2xlarge`).
- The AWS user-data installed NVIDIA container tooling with an outdated repository/package flow (`nvidia-container-runtime` and `apt-key`). Current NVIDIA docs use the newer toolkit installation flow, and current DLAMIs already ship with NVIDIA drivers/container tooling. I removed the stale install commands and updated the comment accordingly.
- The AWS user-data mounted EFS with `mount -t efs` without first installing the EFS client. AWS docs require `amazon-efs-utils` for the `efs` mount helper. To keep the snippet self-contained on Ubuntu 22.04, I switched it to the documented NFS-based mount flow and added `nfs-common`.
- The GCP image family `deeplearning-platform-release/common-cu121` is outdated. Google’s current Deep Learning VM image docs show newer active Ubuntu 22.04 GPU image families, and `common-cu121` is past its support window. I updated the snippet to `deeplearning-platform-release/common-cu129-ubuntu-2204-nvidia-580`.
- The GCP autoscaler metric filter was malformed. It used `resource.label.subscription_id` instead of `resource.labels.subscription_id` and omitted the required quoted string values. I corrected the filter to match Google’s documented Monitoring metric filter syntax.
- The GCP MIG referenced the instance template with `.id` and explicitly set `target_size` even though the group is autoscaled. I changed the template reference to `self_link_unique`, which is the documented recommendation, and removed the explicit `target_size` to avoid capacity drift against the autoscaler.
- The GCP comment claiming `80% cost saving` was too specific and dated. I replaced it with the more accurate generic note that preemptible instances are used for lower cost.

## Review Notes
- The local environment does not have the `tofu` binary installed, so the deployment commands were validated against the official OpenTofu CLI documentation rather than executed locally.
- GPU capacity and exact instance availability remain region- and zone-dependent on both AWS and GCP, so real deployments may still require adjusting the selected instance types or zones.
- The GCP example still uses the provider-supported `preemptible = true` setting. Google Cloud’s newer terminology is Spot VMs, but the configuration shown remains valid for the provider/resource pattern used here.
