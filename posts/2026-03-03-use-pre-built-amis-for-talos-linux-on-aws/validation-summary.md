# Validation Summary: How to Use Pre-Built AMIs for Talos Linux on AWS

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Talos Linux
- AWS EC2 AMIs
- AWS CLI
- EC2 launch templates
- Amazon EBS gp3 volumes and encryption
- Kubernetes cluster bootstrapping
- Talos Image Factory

## Sources Consulted
- Talos AWS installation documentation: https://docs.siderolabs.com/talos/v1.10/platform-specific-installations/cloud-platforms/aws
- Talos v1.7.0 `cloud-images.json` release asset: https://github.com/siderolabs/talos/releases/download/v1.7.0/cloud-images.json
- Talos CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Talos Image Factory documentation: https://docs.siderolabs.com/talos/v1.13/learn-more/image-factory
- Talos boot assets documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/boot-assets
- Talos system extensions documentation: https://docs.siderolabs.com/talos/v1.7/build-and-extend-talos/custom-images-and-development/system-extensions
- Talos upgrade documentation: https://docs.siderolabs.com/talos/v1.11/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- AWS CLI `describe-images` documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-images.html
- AWS CLI `run-instances` documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS EC2 user-data documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- Amazon EBS encryption requirements: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-encryption-requirements.html

## Issues Found
- The post claimed Talos publishes multiple pre-built AWS AMI variants such as standard, NVIDIA GPU, and ZFS. Talos publishes official AWS AMIs per release, region, and architecture; NVIDIA and ZFS require custom images with system extensions. Updated the AMI explanation and variant section accordingly.
- The post used `talosctl image default --talos-version ... --platform aws --arch ...` to look up AMIs. `talosctl image default` lists default container images used by Talos, not AWS AMIs, and those flags are not part of the documented command. Replaced the example with the official `cloud-images.json` release asset lookup.
- The AWS CLI AMI lookup did not constrain architecture and used Talos architecture terminology in a context where EC2 reports x86_64. Added AWS `architecture=x86_64` filtering and an amd64 AMI name filter.
- The EBS encryption section said there is no performance penalty. AWS documents the same IOPS performance with a minimal effect on latency, so the statement was revised to match AWS documentation.
- The bootstrapping section said nodes boot into maintenance mode and wait for configuration even though the examples pass machine configuration through user-data. Updated the wording to explain that Talos applies EC2 user-data automatically and waits in maintenance mode only when configuration is not provided.

## Review Notes
The post still uses Talos v1.7 examples, which are version-specific and older than current Talos releases, but the commands and concepts are valid for the version being discussed after the corrections above.
