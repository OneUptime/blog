# Validation Summary: How to Install Rancher on DigitalOcean Droplets

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- K3s
- Kubernetes
- DigitalOcean Droplets
- `doctl`
- Helm
- cert-manager
- DNS

## Sources Consulted
- Rancher install docs: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Helm CLI quick start: https://ranchermanager.docs.rancher.com/v2.14/getting-started/quick-start-guides/deploy-rancher-manager/helm-cli
- Rancher DigitalOcean cluster creation docs: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider/create-a-digitalocean-cluster
- Rancher node driver docs: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/about-provisioning-drivers/manage-node-drivers
- Rancher Helm chart options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- K3s cluster access docs: https://docs.k3s.io/cluster-access
- K3s installation/configuration docs: https://docs.k3s.io/installation/configuration
- Helm install docs: https://helm.sh/docs/v3/intro/install
- cert-manager Helm install docs: https://cert-manager.io/docs/installation/helm/
- DigitalOcean `doctl compute droplet create`: https://docs.digitalocean.com/reference/doctl/reference/compute/droplet/create/
- DigitalOcean `doctl compute droplet get`: https://docs.digitalocean.com/reference/doctl/reference/compute/droplet/get/
- DigitalOcean `doctl compute firewall create`: https://docs.digitalocean.com/reference/doctl/reference/compute/firewall/create/
- DigitalOcean `doctl compute domain records create`: https://docs.digitalocean.com/reference/doctl/reference/compute/domain/records/create/
- DigitalOcean `doctl compute reserved-ip create`: https://docs.digitalocean.com/reference/doctl/reference/compute/reserved-ip/create/
- DigitalOcean `doctl compute reserved-ip-action assign`: https://docs.digitalocean.com/reference/doctl/reference/compute/reserved-ip-action/assign/
- DigitalOcean Linux image docs: https://docs.digitalocean.com/products/droplets/details/images/
- Rancher support matrix: https://www.suse.com/suse-rancher/support-matrix

## Issues Found
- The original K3s install command pulled an unspecified latest K3s release, which can drift outside the Rancher support matrix. I changed it to use `INSTALL_K3S_VERSION=<RANCHER_SUPPORTED_K3S_VERSION>` and the current single-node Rancher quick-start pattern with `server --cluster-init --write-kubeconfig-mode=644`.
- The original prerequisites and access wording implied a traditional domain was merely optional without explaining the hostname requirement. I updated the prerequisite to require a DNS name and noted that an `sslip.io` hostname is a valid evaluation option, then clarified the later DNS and browser-access wording to match.
- The original DigitalOcean cluster provisioning steps in Rancher were outdated. Current Rancher uses DigitalOcean cloud credentials plus an RKE2/K3s DigitalOcean cluster flow with machine pools, so I updated Step 10 to match the current documented workflow.
- The original Reserved IP section implied that assigning a Reserved IP was a production-oriented step for this single-node deployment. I changed that wording and the summary so the post no longer suggests that a single-node Droplet setup is production-grade.
- I clarified that the firewall example exposes port `6443` for optional remote K3s API access, rather than implying it is always required for Rancher itself.

## Review Notes
- The post is now technically consistent with the current Rancher, K3s, cert-manager, Helm, and DigitalOcean documentation reviewed on 2026-05-07.
- The `rancher-stable` Helm repository and the Jetstack HTTP Helm repository are still valid, but cert-manager's current docs recommend OCI-based chart installs for recent releases.
- This remains a single-node Rancher deployment. Official Rancher guidance for production still points to a high-availability setup with a load balancer, real DNS, and trusted certificates.
