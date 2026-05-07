# Validation Summary: How to Install Rancher on Linode

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Rancher Manager
- K3s
- Kubernetes
- Linode CLI / Akamai Cloud
- Cloud Firewalls
- NodeBalancers
- Helm
- cert-manager
- DNS

## Sources Consulted
- Rancher Installation Requirements: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher Helm CLI Quick Start: https://ranchermanager.docs.rancher.com/v2.14/getting-started/quick-start-guides/deploy-rancher-manager/helm-cli
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Setting up the Bootstrap Password: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/bootstrap-password
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Requirements: https://docs.k3s.io/installation/requirements
- cert-manager Helm Installation: https://cert-manager.io/docs/installation/helm/
- Helm Installation Guide: https://helm.sh/docs/v3/intro/install/
- Akamai Cloud Linode Create API reference: https://techdocs.akamai.com/linode-api/reference/linode-instances
- Akamai Cloud Firewalls API reference: https://techdocs.akamai.com/linode-api/reference/firewalls
- Linode instances commands: https://techdocs.akamai.com/cloud-computing/docs/cli-commands-for-compute-instances
- Manage IP addresses on a Linode: https://techdocs.akamai.com/cloud-computing/docs/managing-ip-addresses-on-a-compute-instance
- Linode interfaces: https://techdocs.akamai.com/cloud-computing/docs/linode-interfaces
- NodeBalancers overview: https://techdocs.akamai.com/cloud-computing/docs/nodebalancer
- Getting started with NodeBalancers: https://techdocs.akamai.com/cloud-computing/docs/getting-started-with-nodebalancers
- Backend nodes: https://techdocs.akamai.com/cloud-computing/docs/back-end-nodes-compute-instances
- NodeBalancers commands: https://techdocs.akamai.com/cloud-computing/docs/nodebalancers-commands
- Domains commands: https://techdocs.akamai.com/cloud-computing/docs/domains-commands

## Issues Found
- The original K3s install step used an unpinned install that could drift onto a Rancher-unsupported Kubernetes version. I changed it to use `INSTALL_K3S_VERSION=<supported-k3s-version>` and `server --cluster-init`, which matches current Rancher quick-start guidance.
- The original firewall opened TCP `6443` to `0.0.0.0/0`. K3s documents `6443` as needing to be reachable by cluster nodes, not exposed broadly to the public internet for this single-node setup, so I removed that rule.
- The original Linode creation and firewall attachment flow did not account for Linode's current interface model. I added `--interface_generation legacy_config` so the documented `firewalls device-create --type linode` flow remains correct, and added `--private_ip true` to support the later NodeBalancer example.
- The original IP lookup used a generic IPv4 listing, which becomes ambiguous once a private IPv4 is present. I changed it to `linode-cli linodes ips-list $LINODE_ID` so readers can distinguish public and private addresses.
- The original Rancher install used a placeholder hostname without clarifying the fully qualified hostname requirement and used `bootstrapPassword=admin`. I changed this to explicit variables, clarified that Rancher needs an FQDN, and documented `sslip.io` as a proof-of-concept option.
- The original Rancher node driver section implied a direct "Create and select Linode" workflow. I corrected it to the current Rancher model of activating the Linode node driver and using a Linode node template in an RKE or RKE2 machine pool.
- The original NodeBalancer example used HTTPS termination on the NodeBalancer. Rancher requires an HTTP/2-compatible load balancer, while Linode documents TCP mode as the flexible option that preserves encrypted backend connections and supports HTTP/2 use cases. I replaced the example with TCP pass-through to the backend's private IP on port `443`.
- The original NodeBalancer section also implied a single backend was enough for production resilience. I added a note clarifying that a single Rancher server remains a single point of failure.

## Review Notes
- This post is now technically accurate as a single-node evaluation guide, not a production HA deployment guide.
- Rancher's documented production sizing and availability requirements are materially higher than a single 4 GB Linode. The revised post now frames that size as a quick-test starting point instead of a general minimum.
- The cert-manager installation still uses the Jetstack Helm repository, which remains supported, but the cert-manager project currently recommends OCI charts for the newest releases.
