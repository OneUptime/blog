# Validation Summary: How to Use Talos Linux with AWS Graviton (ARM64) Instances

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- AWS EC2
- AWS Graviton ARM64 instances
- Kubernetes scheduling
- Docker multi-architecture images
- AWS Auto Scaling Spot Instances

## Sources Consulted
- Talos Linux AWS installation guide: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/cloud-platforms/aws
- Talos Linux release assets and `cloud-images.json`: https://github.com/siderolabs/talos/releases
- Talos Linux MachineConfig reference for `externalCloudProvider`: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux upgrade guide: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- AWS Graviton overview: https://aws.amazon.com/ec2/graviton/
- AWS CLI `describe-images` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-images.html
- AWS CLI `run-instances` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI `create-auto-scaling-group` reference: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html
- Kubernetes node labels reference: https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes assigning Pods to nodes guide: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Docker `manifest inspect` reference: https://docs.docker.com/reference/cli/docker/manifest/inspect/
- Docker Buildx build reference: https://docs.docker.com/reference/cli/docker/buildx/build/

## Issues Found
- The AMI discovery command searched EC2 image names and a hard-coded owner instead of using the official Talos release `cloud-images.json` source documented by Sidero Labs. Replaced it with a `curl` and `jq` lookup for the official AWS ARM64 AMI by Talos version and region.
- The EC2 launch examples used a placeholder AMI ID. Updated them to use the `$AMI` value returned by the official AMI lookup.
- The Talos config generation example used an AWS external cloud provider patch without also installing or referencing cloud-provider-aws manifests. Replaced it with the AWS-documented flags for cloud user data size and install disk while preserving the architecture-independent point.
- The post described Graviton3 as the current generation. Updated the wording to "Graviton3 and newer" so it remains accurate with newer Graviton generations available.
- The cost and Spot interruption claims were too absolute. Reworded them to reflect that savings and interruption rates vary by workload, instance family, region, Availability Zone, pricing model, and current capacity.
- The Talos upgrade command used the old `v1.7.1` installer image. Updated the example to `v1.13.2`, the current stable Talos release checked during validation.
- Added `curl` and `jq` to prerequisites because the corrected AMI lookup depends on them.

## Review Notes
The Kubernetes `kubernetes.io/arch` node selector and preferred node affinity examples match current Kubernetes scheduling syntax. The Docker manifest inspection and Buildx multi-platform build commands match Docker CLI documentation, though `docker manifest inspect` is still documented as experimental. Local `aws` and `talosctl` binaries were not installed in the workspace, so command validation used official documentation and release assets rather than local `--help` output.
