# Validation Summary: How to Set Up Rancher HA on RKE2 - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- etcd
- Helm
- cert-manager
- NGINX

## Sources Consulted
- RKE2 High Availability: https://docs.rke2.io/install/ha
- RKE2 Cluster Access: https://docs.rke2.io/cluster_access
- RKE2 Networking Services: https://docs.rke2.io/networking/networking_services
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- Rancher Install/Upgrade on a Kubernetes Cluster: https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- cert-manager Helm Installation: https://cert-manager.io/docs/installation/helm/
- Helm Install Reference: https://helm.sh/docs/helm/helm_install/
- etcd Maintenance: https://etcd.io/docs/v3.5/op-guide/maintenance/
- etcd System Limits: https://etcd.io/docs/v3.6/dev-guide/limit/

## Issues Found
- The additional RKE2 server join example used `https://rke2-server-01:9345` instead of the fixed registration address. I updated it to `https://rancher.example.com:9345` because the RKE2 HA documentation directs additional servers to join through the stable registration endpoint.
- The load balancer example mixed external TLS termination on the load balancer with a Rancher install flow that uses Rancher/cert-manager-managed ingress TLS. I replaced it with a Layer 4 NGINX example for ports `80`, `443`, `6443`, and `9345`, which matches the Rancher and RKE2 guidance for this install path.
- The cert-manager installation used `--set installCRDs=true`, which is an older form. I updated it to `--set crds.enabled=true`, which is the current option documented by both Rancher and cert-manager.
- The Rancher install command used `global.cattle.psp.enabled=false`, which is an older compatibility flag associated with older Rancher releases. I removed it and changed the bootstrap password example to a non-default placeholder, in line with current Rancher guidance to set a unique initial admin password.
- The `kubectl` steps assumed `kubectl` was already on `PATH`. I added `export PATH=/var/lib/rancher/rke2/bin:$PATH`, which matches current RKE2 cluster access documentation.
- The HA verification note said that cordoning a node was itself an HA test. I reworded that line to describe node maintenance behavior more accurately, since cordoning prevents new scheduling but does not simulate node failure.

## Review Notes
- No further technical issues were found after these corrections.
- RKE2 documentation now notes that `ingress-nginx` reached end of life in March 2026 and that Traefik becomes the default for new `v1.36+` clusters. The revised load balancer guidance in this post remains valid because it forwards traffic to ports `80` and `443` on the cluster nodes rather than depending on ingress-controller-specific HTTP configuration.
- The guide does not pin Rancher or cert-manager chart versions. That is not incorrect, but pinning versions would improve reproducibility in a future revision.
