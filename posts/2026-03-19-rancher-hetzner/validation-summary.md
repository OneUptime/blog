# Validation Summary: How to Install Rancher on Hetzner Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- K3s
- Helm
- cert-manager
- Hetzner Cloud
- `hcloud` CLI
- Netplan

## Sources Consulted
- Rancher: Install/Upgrade Rancher on a Kubernetes Cluster — https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher: Installation Requirements — https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher: Registering Existing Clusters — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters
- Rancher: Node Drivers — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/about-provisioning-drivers/manage-node-drivers
- K3s Quick-Start Guide — https://docs.k3s.io/quick-start
- K3s Cluster Access — https://docs.k3s.io/cluster-access
- Helm installation docs — https://helm.sh/docs/intro/install/
- Hetzner Cloud CLI manual: `hcloud ssh-key create` — https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_ssh-key_create.md
- Hetzner Cloud CLI manual: `hcloud firewall add-rule` — https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_firewall_add-rule.md
- Hetzner Cloud CLI manual: `hcloud server create` — https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_server_create.md
- Hetzner Cloud CLI manual: `hcloud floating-ip create` — https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_floating-ip_create.md
- Hetzner Cloud CLI manual: `hcloud floating-ip assign` — https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_floating-ip_assign.md
- Hetzner Floating IP FAQ — https://docs.hetzner.com/cloud/floating-ips/faq/
- Hetzner Floating IP persistent configuration — https://docs.hetzner.com/cloud/floating-ips/persistent-configuration/
- Hetzner deprecated server plans — https://docs.hetzner.com/cloud/servers/deprecated-plans/
- Hetzner current cloud server plans — https://www.hetzner.com/cloud/cost-optimized and https://www.hetzner.com/cloud/regular-performance

## Issues Found
- The post recommended the `CX21` server type, which Hetzner now lists under deprecated server plans. I updated the recommendation to current 4 GB options (`CX23` or `CPX21`) and scoped that sizing to lightweight proof-of-concept use.
- The prerequisites said a domain name was optional, but Rancher's Helm install requires a `hostname`. Rancher's current installation docs explicitly expect a DNS name and allow a temporary proof-of-concept hostname such as `sslip.io`. I updated the prerequisite and the DNS wording to reflect that.
- The Ubuntu netplan example for a Floating IP omitted `renderer: networkd`. Hetzner's current persistent Floating IP documentation includes that setting for the Ubuntu netplan example, so I added it.
- The cert-manager section said “Wait for pods to become ready” while the command shown was only `kubectl get pods -n cert-manager`, which checks status but does not wait. I corrected the wording to “Check that the pods are ready.”
- The Rancher/Hetzner integration paragraph used imprecise provisioning terminology (`custom cluster drivers`). I updated it to match Rancher's current documentation around importing K3s or RKE2 clusters and adding custom node drivers.

## Review Notes
- A 4 GB single-node Hetzner server can be enough for a small evaluation setup, but Rancher's official K3s hardware guidance for a small production management cluster starts at 4 vCPUs and 16 GB RAM per node.
- The guide does not pin Rancher, K3s, Helm, or cert-manager versions. The commands were valid on 2026-05-07, but exact behavior and defaults may change over time as upstream releases move forward.
