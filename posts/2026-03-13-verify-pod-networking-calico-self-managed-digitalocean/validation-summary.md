# Validation Summary: Verify Pod Networking with Calico on Self-Managed DigitalOcean Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Calico CNI
- DigitalOcean Droplets
- DigitalOcean Cloud Firewalls
- DigitalOcean CLI (`doctl`)
- `kubectl`
- `calicoctl`

## Sources Consulted
- DigitalOcean `doctl compute firewall add-rules` reference: https://docs.digitalocean.com/reference/doctl/reference/compute/firewall/add-rules/
- DigitalOcean Cloud Firewalls rule configuration documentation: https://docs.digitalocean.com/products/networking/firewalls/how-to/configure-rules/
- DigitalOcean Cloud Firewalls API reference: https://docs.digitalocean.com/products/networking/firewalls/reference/api/
- DigitalOcean `doctl compute droplet get` reference: https://docs.digitalocean.com/reference/doctl/reference/compute/droplet/get/
- DigitalOcean Reserved IP documentation: https://docs.digitalocean.com/products/networking/reserved-ips/
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico outgoing NAT documentation: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes generated `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The firewall example claimed to add an IP-in-IP rule, but the command actually opened broad ICMP/TCP/UDP traffic and DigitalOcean Cloud Firewalls expose TCP, UDP, and ICMP rules rather than arbitrary protocol 4 IP-in-IP rules. Changed the example to allow Calico VXLAN on UDP port 4789 from the VPC CIDR and added a note recommending VXLAN when Cloud Firewalls protect the cluster.
- The introduction said DigitalOcean networking supports both IP-in-IP and VXLAN overlay modes in the Cloud Firewall context. Reworded this to focus on Calico VXLAN overlays, which matches the rest of the guide and avoids implying that DigitalOcean Cloud Firewalls can explicitly permit IP-in-IP.
- The node debugging examples used the `ubuntu` image for `ping` and `nc`, but Kubernetes documentation notes that debugging images may not include these tools. Changed the examples to use `nicolaka/netshoot`, which is a purpose-built networking troubleshooting image.
- The best-practices section referred to a "private Floating IP" for persistent external access. DigitalOcean Floating IPs have been renamed Reserved IPs and are publicly accessible static addresses, so this was changed to "Reserved IP" and "persistent public access."

## Review Notes
- The Calico IPPool fields `vxlanMode`, `ipipMode`, `natOutgoing`, and `disabled` are current and valid.
- The `kubectl run`, `kubectl exec`, `kubectl debug`, `calicoctl get ippool`, and `doctl compute droplet get --format PublicIPv4` examples are consistent with current documentation.
- The UDP `nc` check is useful as a quick probe, but UDP tests are less definitive than an actual cross-node pod connectivity test, which the post performs in the next step.
