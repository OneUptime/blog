# Validation Summary: How to Install Rancher on Oracle Cloud Infrastructure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Oracle Cloud Infrastructure (OCI)
- OCI CLI
- Rancher
- K3s
- Kubernetes
- Helm
- cert-manager
- Ubuntu 22.04

## Sources Consulted
- OCI CLI `network subnet create`: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/network/subnet/create.html
- OCI CLI `network subnet update`: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/network/subnet/update.html
- OCI CLI `iam availability-domain list`: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/iam/availability-domain/list.html
- OCI CLI `compute image list`: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/compute/image/list.html
- OCI CLI `compute instance launch`: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/compute/instance/launch.html
- OCI CLI `compute instance list-vnics`: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/compute/instance/list-vnics.html
- Rancher installation requirements: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher install/upgrade on a Kubernetes cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Helm chart options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- K3s configuration options: https://docs.k3s.io/installation/configuration
- Helm installation docs: https://helm.sh/docs/v3/intro/install/
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- OCI Always Free resources: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- Rancher on ARM64 (experimental): https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/enable-experimental-features/rancher-on-arm64

## Issues Found
- The post hard-coded `Uocm:US-ASHBURN-AD-1` as the availability domain. OCI exposes availability domains per tenancy and region, so I changed this to a CLI lookup using `oci iam availability-domain list`.
- The post created a custom route table and security list but never attached them to the subnet. OCI subnets use the VCN's default route table and security list unless explicitly changed, so I added `oci network subnet update` to associate both resources.
- The instance size was set to `2` OCPUs and `16` GB RAM. Rancher's current installation requirements for a K3s upstream cluster list `4` vCPUs and `16` GB RAM as the minimum starting point, so I updated the shape config to `{"ocpus":4,"memoryInGBs":16}`.
- The instance launch step did not capture the instance OCID even though the next command required it. I updated the launch command to save `INSTANCE_ID`, wait for the instance to reach `RUNNING`, and then retrieve `PUBLIC_IP` directly.
- The K3s install command was missing root privileges. The K3s install script writes system files and installs a service, so I changed it to run through `sudo` and used `0644` kubeconfig permissions.
- The Helm install step used a piped script invocation. I changed it to Helm's documented script-based installation flow that downloads `get_helm.sh`, marks it executable, and runs it locally.
- The intro and free-tier section implied OCI Always Free includes supported Rancher host shapes. Current Rancher installation requirements state supported operating systems are 64-bit x86, while OCI Always Free Ampere A1 is ARM64 and Rancher documents ARM64 as experimental, so I corrected that claim and limited the free-tier note to non-production testing.

## Review Notes
- The guide remains a single-node installation. Rancher documents three-node high availability as the production recommendation, so this post is best read as a proof-of-concept or small-scale setup guide.
- cert-manager's own documentation now prefers OCI-distributed Helm charts, but Rancher's current installation docs still show the Jetstack Helm repository flow used in the post, so the updated commands remain acceptable.
