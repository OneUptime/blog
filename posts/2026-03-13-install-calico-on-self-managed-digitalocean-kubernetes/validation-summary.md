# Validation Summary: How to Install Calico on Self-Managed DigitalOcean Kubernetes Step by Step

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes and kubeadm
- DigitalOcean Droplets, VPC, and Cloud Firewalls
- doctl CLI
- kubectl
- calicoctl
- Calico NetworkPolicy

## Sources Consulted
- Calico install guide for self-managed/on-premises Kubernetes: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico overlay networking and VXLAN/IP-in-IP documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/
- Calico IPPool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico datastore and calicoctl Kubernetes datastore documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Kubernetes kubeadm init reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/generated/kubeadm_init/
- DigitalOcean doctl firewall create reference: https://docs.digitalocean.com/reference/doctl/reference/compute/firewall/create/
- DigitalOcean doctl firewall add-droplets reference: https://docs.digitalocean.com/reference/doctl/reference/compute/firewall/add-droplets/
- DigitalOcean Droplet limits documentation: https://docs.digitalocean.com/products/droplets/details/limits/

## Issues Found
- The `doctl compute firewall create` example used an invalid multiple-Droplet source rule. Replaced it with VPC CIDR-based TCP/UDP rules, which match DigitalOcean's documented `address:<CIDR>` rule syntax.
- The public API server rule used `address:0.0.0.0/0,::/0`, which is not the documented `doctl` rule format. Changed it to a documented IPv4 rule.
- The kubeconfig copy step omitted ownership correction, which can leave `$HOME/.kube/config` owned by root. Added the standard `chown` command from kubeadm setup guidance.
- The Calico operator install step used the older v3.27.0 manifest and omitted the Calico CRDs now shown in the official install flow. Updated URLs to v3.32.0 and added `v1_crd_projectcalico_org.yaml`.
- The Calico custom resource did not explicitly select private VPC node addresses or disable BGP for the VXLAN-only design. Added `nodeAddressAutodetectionV4.cidrs` and `bgp: Disabled`.
- The Calico custom resource omitted the `APIServer` resource, which is needed for `projectcalico.org/v3` API resources used later in the post. Added the `APIServer` resource.
- The post used `kubectl apply` for the initial Calico custom resources, while official Calico install instructions use `kubectl create`. Changed the command to `kubectl create -f calico-installation-do.yaml`.
- The verification step described `calicoctl node status` as node peering verification, but the guide configures VXLAN with BGP disabled. Replaced it with `calicoctl get nodes`.
- The Calico NetworkPolicy examples selected namespaces with `kubernetes.io/metadata.name`. Updated them to the documented Calico namespace label `projectcalico.org/name`.

## Review Notes
- The guide remains version-specific to Calico v3.32.0. Future Calico releases may change the latest manifest URL or the set of default custom resources.
- The DNS egress policy allows UDP/53 only. Some production environments may also need TCP/53, but the UDP-only example is syntactically valid and common for a basic example.
