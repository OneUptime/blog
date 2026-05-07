# Validation Summary: How to Install Rancher on Vultr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Vultr Cloud Compute
- Vultr API v2
- Vultr Firewall
- Vultr DNS
- Rancher
- K3s
- Kubernetes
- Helm
- cert-manager
- Bash, `curl`, and `jq`

## Sources Consulted
- Vultr API Reference: https://www.vultr.com/api/
- Vultr Firewall Rules: https://docs.vultr.com/products/network/firewall/management/rules
- Vultr Firewall Group Linking: https://docs.vultr.com/products/network/firewall/management/link
- Vultr DNS Record Management: https://docs.vultr.com/products/network/dns/management/manage-records
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Cluster Access: https://docs.k3s.io/cluster-access
- Helm Installation Guide: https://helm.sh/docs/v3/intro/install/
- cert-manager Helm Installation: https://cert-manager.io/docs/installation/helm/
- Rancher Install/Upgrade on a Kubernetes Cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Installation Requirements: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher Helm CLI Quick Start: https://ranchermanager.docs.rancher.com/v2.14/getting-started/quick-start-guides/deploy-rancher-manager/helm-cli

## Issues Found
- The firewall group was created and rules were added, but it was never attached to the instance. I added the documented `PATCH /v2/instances/{instance-id}` step with `firewall_group_id` so the firewall configuration actually takes effect.
- The instance IP lookup command used `jq` without raw output, which returns a JSON string instead of a plain IP address. I changed it to `jq -r`.
- The post used `jq` in its API examples without listing it as a prerequisite. I added it to the prerequisites.
- The hostname and DNS wording implied that a custom domain was optional while later commands still assumed one. I changed the placeholder to `<dns-name-for-rancher>` and clarified that a real domain or an `sslip.io` name can be used, while the Vultr DNS step applies when you manage your own domain in Vultr.

## Review Notes
- The cert-manager commands remain valid as written because Rancher’s current installation docs still use the Jetstack Helm repository flow, although cert-manager’s own latest docs recommend OCI charts for the newest releases.
- A single-node K3s install with `replicas=1` is appropriate for a proof-of-concept, but Rancher’s current installation requirements and architecture guidance recommend a dedicated, highly available management cluster for production and a supported Kubernetes/K3s version from the Rancher support matrix.
