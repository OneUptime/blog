# Validation Summary: How to Set Up Rancher HA on K3s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- K3s
- Kubernetes
- embedded etcd
- MySQL external datastore
- keepalived
- Helm
- cert-manager
- kube-apiserver
- kube-proxy

## Sources Consulted
- K3s High Availability Embedded etcd: https://docs.k3s.io/datastore/ha-embedded
- K3s High Availability External DB: https://docs.k3s.io/datastore/ha
- K3s Cluster Load Balancer: https://docs.k3s.io/datastore/cluster-loadbalancer
- K3s Cluster Access: https://docs.k3s.io/cluster-access
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- K3s Token CLI Reference: https://docs.k3s.io/cli/token
- K3s Installation Requirements: https://docs.k3s.io/installation/requirements
- Rancher Install/Upgrade on a Kubernetes Cluster: https://ranchermanager.docs.rancher.com/v2.11/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Helm CLI Quick Start: https://ranchermanager.docs.rancher.com/v2.14/getting-started/quick-start-guides/deploy-rancher-manager/helm-cli
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher Choosing a Version: https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/choose-a-rancher-version
- Rancher K3s for Rancher guide: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-cluster-setup/k3s-for-rancher
- cert-manager Helm installation: https://cert-manager.io/docs/installation/helm/
- Kubernetes kube-apiserver command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kube-proxy config reference: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/

## Issues Found
- The description said the guide used “embedded or external etcd,” but the external example was actually MySQL. I changed this to “embedded etcd or an external datastore” to match K3s terminology and the commands shown.
- The embedded-etcd install command had a broken shell continuation: `--disable=traefik \  # ...` is not valid shell syntax. I removed that fragment.
- The post disabled Traefik in K3s but never installed an alternative ingress controller. Because Rancher relies on an ingress controller for the UI/API, I removed `--disable=traefik` from the K3s install examples so the default K3s ingress path remains functional.
- The token retrieval path used `/var/lib/rancher/k3s/server/node-token`, but current K3s documents the server join token at `/var/lib/rancher/k3s/server/token`. I corrected the path and label.
- The additional embedded-etcd servers joined `https://k3s-server-01:6443` instead of the fixed registration address created in the load-balancer/VIP step. I changed the example to use the VIP endpoint `https://10.0.0.100:6443`.
- The external datastore example incorrectly used `--cluster-init`, which is for initializing embedded etcd clusters. I removed it from the external datastore section.
- The external datastore example only included the hostname as a TLS SAN, but the later kubeconfig step rewrites the API endpoint to the VIP `10.0.0.100`. I added the VIP as a TLS SAN so the kubeconfig example is TLS-valid.
- The cert-manager install used `installCRDs=true`; current Rancher and cert-manager installation docs use `crds.enabled=true`. I updated the Helm value to the current documented form.
- The K3s tuning section stated that Rancher needs kube-proxy metrics and presented all tuning values as required stability settings. I rewrote those comments to describe them as optional tuning examples and to scope the kube-proxy setting to monitoring.
- The conclusion used a specific “more than 100 managed clusters” recommendation without support in the official docs reviewed. I replaced it with Rancher’s documented positioning: RKE2 for datacenter/cloud use cases and K3s for smaller or edge-oriented deployments.

## Review Notes
- The guide now aligns with current documentation, but it still uses the legacy Jetstack Helm repository for cert-manager. That remains supported, while cert-manager’s upstream docs now recommend OCI charts for the newest releases.
- A keepalived VIP provides a fixed registration address and failover, but not active Layer 4 load balancing across nodes. For active distribution of API traffic, pairing the VIP with HAProxy or another TCP load balancer would be a stronger production pattern.
- `global.cattle.psp.enabled=false` is still a valid Rancher chart value, but newer Rancher releases can automatically detect when PodSecurityPolicy is unavailable on Kubernetes 1.25+.
