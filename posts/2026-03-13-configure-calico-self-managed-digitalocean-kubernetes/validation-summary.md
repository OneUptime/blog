# Validation Summary: Configure Calico on Self-Managed DigitalOcean Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes
- kubeadm
- DigitalOcean Droplets
- DigitalOcean VPC networking
- DigitalOcean Cloud Firewalls
- doctl

## Sources Consulted
- Calico Kubernetes quickstart: https://docs.tigera.io/calico/latest/getting-started/kubernetes/quickstart
- Calico Kubernetes system requirements and network ports: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico operator installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico VXLAN/IP-in-IP overlay networking: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes kubeadm init reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- DigitalOcean doctl firewall create reference: https://docs.digitalocean.com/reference/doctl/reference/compute/firewall/create/
- DigitalOcean doctl droplet tag reference: https://docs.digitalocean.com/reference/doctl/reference/compute/droplet/tag/
- DigitalOcean VPC features: https://docs.digitalocean.com/products/networking/vpc/details/features/
- DigitalOcean Droplet metadata API: https://docs.digitalocean.com/products/droplets/how-to/access-metadata/
- DigitalOcean Private Droplets networking details: https://docs.digitalocean.com/products/droplets/details/private-droplets/

## Issues Found
- The DigitalOcean Cloud Firewall rule syntax used `sources:tag:` and `destinations:address:`, which does not match the current `doctl` firewall rule format. Changed the rules to use `tag:` for sources and `address:` for destinations.
- The firewall was created before the Droplets were tagged and was not attached to the tag. Moved tagging before firewall creation and added `--tag-names "k8s-cluster"` so the firewall applies to the cluster Droplets.
- The Droplet tagging command passed multiple Droplet names to a command documented for a single Droplet argument. Split it into one command per Droplet.
- The control plane private IP command assumed the VPC interface was always `eth1`. Replaced it with the DigitalOcean metadata endpoint for the private interface address, which also works for Private Droplets where the private interface is `eth0`.
- The Calico operator manifest referenced v3.27.0, which is outdated. Updated it to the current official Calico v3.32.0 manifest.
- The VXLAN-only Calico installation did not disable BGP. Added `bgp: Disabled` to the operator `Installation` resource.
- The verification step used `calicoctl node status`, which is primarily a BGP status command and is not the best fit for a VXLAN-only install. Replaced it with `kubectl get tigerastatus` and `kubectl get pods -n calico-system -o wide`.
- The best-practice note referred specifically to `eth1` as the private network. Generalized it to DigitalOcean's private network because interface names differ between traditional and Private Droplets.

## Review Notes
- The post is technically relevant and contains implementation commands and configuration, so it was reviewed as a code/technical guide.
- The firewall rule set covers VXLAN (`UDP 4789`) and common Kubernetes control-plane/node ports. Clusters using additional Kubernetes features, custom API server ports, WireGuard, IP-in-IP, NodePorts, or external access patterns may need additional firewall rules.
