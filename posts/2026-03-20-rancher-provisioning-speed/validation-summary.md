# Validation Summary: How to Optimize Cluster Provisioning Speed in Rancher - Speed

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- AWS EC2
- AWS CLI
- Container registry mirrors
- `kubectl`
- `jq`

## Sources Consulted
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher EC2 Machine Configuration Reference: https://ranchermanager.docs.rancher.com/v2.10/reference-guides/cluster-configuration/downstream-cluster-configuration/machine-configuration/amazon-ec2
- Rancher Launching Kubernetes on New Nodes in an Infrastructure Provider: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider
- Rancher Agents: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/about-rancher-agents
- Rancher Install/Upgrade on a Kubernetes Cluster: https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Installation Methods: https://docs.rke2.io/install/methods
- RKE2 Import Images: https://docs.rke2.io/add-ons/import-images
- RKE2 Private Registry Configuration: https://docs.rke2.io/install/private_registry
- RKE2 Air-Gap Install: https://docs.rke2.io/install/airgap
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Agent Configuration Reference: https://docs.rke2.io/reference/linux_agent_config
- RKE2 Architecture: https://docs.rke2.io/architecture
- AWS CLI `modify-vpc-attribute`: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-vpc-attribute.html
- Amazon EC2 instance metadata: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html
- Amazon EC2 M6i instances: https://aws.amazon.com/ec2/instance-types/m6i/

## Issues Found
- Step 1 used Docker installation and a nonexistent `rke2-install.sh` flow, and it enabled `rke2-server` before RKE2 was installed. I replaced that with the official RKE2 install script and the supported RKE2 image-tarball staging workflow.
- Step 1 hard-coded individual Kubernetes component images and versions that may not match the selected RKE2 release. I removed those manual pulls and switched to the version-matched RKE2 image tarball.
- Step 3 claimed `m6i.xlarge` provided NVMe SSD storage. That is incorrect for M6i; I changed the comment to a general current-generation instance recommendation.
- Step 3 included `Amazonec2Config` fields `iops`, `throughput`, and `placementGroup`, which are not part of the current Rancher EC2 machine config reference used for this resource. I removed them.
- Step 3 used an IMDSv1-style metadata request in `userdata`. I updated it to an IMDSv2-compatible example.
- Step 4 used `nodePools`, a `roles` list, and `rollingUpdate`, which do not match Rancher’s current RKE2 cluster YAML shape. I replaced them with supported `machinePools` role booleans and `upgradeStrategy`.
- Step 5 used outdated or unsupported image commands, including `rke2 images list` and `rke2 images save`, and hard-coded `rancher/rancher-agent:v2.8.0`. I replaced that with a version-matched Rancher agent mirror example and RKE2’s supported pre-import file mechanism.
- Step 6 used outdated AWS CLI syntax for enabling VPC DNS attributes. I updated the commands to the current `modify-vpc-attribute` structure syntax.
- Step 7 used a `jq` expression that would fail if a cluster did not yet have a `Ready` condition. I made the query tolerant of missing conditions.
- The introduction and conclusion stated specific provisioning-time ranges and percentage improvements without source-backed evidence. I softened those claims so the post no longer presents unverifiable performance guarantees as fact.

## Review Notes
- The RKE2 version `v1.33.1+rke2r1` and Rancher agent tag `v2.13.1` are example version pins. They should be changed to versions that match the target Rancher and Kubernetes support matrix before use.
- Editing `/etc/resolv.conf` directly is distro-dependent and may not persist on systems managed by `systemd-resolved`, NetworkManager, or DHCP. The post now notes that caveat.
- Initial machine creation concurrency is handled by Rancher and its underlying reconciliation loop once the desired machine pool quantities are declared; the removed `rollingUpdate` block applied to a different API shape and was not the correct Rancher RKE2 configuration.
