# Validation Summary: How to Set Up DNS for Rancher Services

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- RKE
- Kubernetes
- CoreDNS
- `kubectl`
- StatefulSets
- DNS service discovery

## Sources Consulted
- Kubernetes: DNS for Services and Pods - https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes: Configure DNS for a Cluster - https://kubernetes.io/docs/tasks/access-application-cluster/configure-dns-cluster/
- Kubernetes: Autoscale the DNS Service in a Cluster - https://kubernetes.io/docs/tasks/administer-cluster/dns-horizontal-autoscaling/
- Kubernetes: StatefulSets - https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes: `kubectl run` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Rancher: DNS troubleshooting - https://ranchermanager.docs.rancher.com/v2.10/troubleshooting/other-troubleshooting-tips/dns
- SUSE Rancher Manager: RKE2 Cluster Configuration Reference - https://documentation.suse.com/cloudnative/rancher-manager/v2.13/en/cluster-deployment/configuration/rke2.html
- RKE2: Networking Services - https://docs.rke2.io/networking/networking_services
- RKE2: Helm / Customizing Packaged Components with HelmChartConfig - https://docs.rke2.io/add-ons/helm
- CoreDNS: `hosts` plugin - https://coredns.io/plugins/hosts/
- CoreDNS: `forward` plugin - https://coredns.io/plugins/forward/
- CoreDNS: `reload` plugin - https://coredns.io/plugins/reload/

## Issues Found
- The introduction stated that Rancher-managed clusters use CoreDNS as the default DNS provider without qualification. I updated this to scope the claim to Rancher-managed RKE2 clusters and modern RKE clusters, which matches Rancher documentation.
- The interactive `kubectl run` examples omitted `--restart=Never`. I added it to the test and troubleshooting commands so the examples match current Kubernetes guidance for ephemeral debug Pods.
- The post treated direct `coredns` ConfigMap edits as the persistent Rancher path. I added an RKE2-specific note explaining that persistent CoreDNS customization should use a `HelmChartConfig` for `rke2-coredns`, because the add-on manager can overwrite generated ConfigMaps.
- The DNS autoscaler example was incomplete and could not work as shown because it lacked the required RBAC and service account setup. I replaced it with a working manifest pattern based on the Kubernetes DNS autoscaling documentation and noted that RKE2 already deploys CoreDNS with the autoscaler by default.
- The Corefile example was labeled as the default Corefile. I changed that wording to describe it as a typical Corefile because packaged defaults vary across Kubernetes distributions.

## Review Notes
- CoreDNS configuration details can vary by distribution and packaging method even when the cluster DNS behavior is standard Kubernetes.
- StatefulSet pod DNS names are correct as written, but immediate lookups can still be affected by DNS negative caching in the cluster DNS layer.
