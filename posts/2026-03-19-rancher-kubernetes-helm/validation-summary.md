# Validation Summary: How to Install Rancher on a Kubernetes Cluster with Helm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- cert-manager
- Ingress
- DNS

## Sources Consulted
- Rancher: Install/Upgrade Rancher on a Kubernetes Cluster - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher: Installation Requirements - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher: Helm Chart Options - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher: Choosing a Rancher Version - https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/choose-a-rancher-version
- SUSE Rancher Support Matrix (Rancher Manager v2.14.1) - https://www.suse.com/suse-rancher/support-matrix/all-supported-versions/rancher-v2-14-1/
- cert-manager: Installing with Helm - https://cert-manager.io/docs/installation/helm/
- Helm: Installing Helm - https://helm.sh/docs/v3/intro/install/
- Helm: helm upgrade - https://helm.sh/docs/v3/helm/helm_upgrade/

## Issues Found
- The prerequisite `Kubernetes v1.25 or later` was too broad and is inaccurate for current Rancher releases, which support specific Kubernetes ranges per Rancher version. I changed this to require a Rancher-supported Kubernetes version and to point readers to the support matrix.
- The original prerequisite omitted the need for an ingress controller, which is required for Rancher on Kubernetes and must often be installed separately on managed clusters. I added that prerequisite.
- The original resource guidance of `8 GB RAM and 4 CPU cores across your cluster nodes` understated Rancher's documented HA sizing guidance. I replaced it with Rancher's current small-cluster guidance of 4 vCPUs and 16 GB RAM per node for the nodes running Rancher.
- The cert-manager section pinned an outdated `v1.14.4` install flow and separate CRD URL. I updated it to the current supported Helm installation pattern using `crds.enabled=true` and removed the stale version pin.
- The comment describing `rancher-latest` as `the latest stable release` was incorrect. I changed it to describe the latest release channel for testing newer builds, while keeping `rancher-stable` as the production recommendation.
- The install section did not mention ingress class handling, which Rancher does not set by default on its Ingress. I added the note to use `ingress.ingressClassName` when the controller requires it.
- The DNS section incorrectly suggested `kubectl get svc -n cattle-system` would identify the load balancer IP. I corrected this to use the Rancher Ingress for verification and clarified that the external IP or hostname usually belongs to the ingress controller's `LoadBalancer` Service, often in another namespace.
- The upgrade example could drop customized settings because it did not preserve prior Helm values. I added `--reuse-values` to keep existing release values during upgrade.
- The troubleshooting note claiming each Rancher pod only needed `256 Mi` of memory was misleading for production HA sizing. I replaced it with Rancher's documented cluster-level sizing guidance.

## Review Notes
- The post is technically relevant and salvageable after correction.
- The guide still uses the Jetstack Helm repository path for cert-manager, which remains officially supported, although cert-manager now recommends OCI charts for the latest releases.
- Rancher-supported Kubernetes versions vary by Rancher release, so future updates to this post should keep the support matrix in sync rather than hardcoding a generic Kubernetes minimum.
