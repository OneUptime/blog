# Validation Summary: How to Install Rancher with a Self-Signed Certificate

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- K3s
- Kubernetes
- Helm
- OpenSSL
- TLS certificates
- cert-manager

## Sources Consulted
- Rancher installation requirements: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Install/Upgrade Rancher on a Kubernetes cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Helm chart options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Adding TLS secrets for Rancher: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/add-tls-secrets
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s cluster access: https://docs.k3s.io/cluster-access
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- Helm 3 `helm repo add`: https://helm.sh/docs/v3/helm/helm_repo_add/
- Helm 3 `helm install`: https://helm.sh/docs/v3/helm/helm_install/
- Kubernetes `kubectl create secret tls`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Kubernetes `kubectl create secret generic`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The prerequisites incorrectly required Docker on the host. I removed that requirement because Rancher documents that K3s bundles containerd by default and does not require Docker.
- The prerequisites and hostname guidance implied that a raw IP address was an appropriate Rancher access target. I corrected this to a DNS hostname because the Rancher chart `hostname` value is documented as the server FQDN, and Rancher’s install guide recommends using a DNS name even for proof-of-concept installs.
- The post incorrectly instructed readers to install cert-manager for a `ingress.tls.source=secret` installation. I replaced that step with the current Rancher guidance that cert-manager should be skipped when you provide your own certificate files.
- The troubleshooting section incorrectly mentioned cert-manager readiness as a likely issue for this certificate mode. I updated it to the relevant failure cases for private CA installs: hostname/SAN mismatch, missing `tls-ca`, or missing `privateCA=true`.

## Review Notes
- The K3s install step uses the generic installer without pinning `INSTALL_K3S_VERSION`. That is acceptable for a simple walkthrough, but Rancher only supports specific Kubernetes/K3s versions per Rancher release, so readers should still verify the Rancher support matrix before using the latest installer output.
- The post is appropriate for development and testing. Rancher’s production guidance still favors a highly available installation and current sizing/networking requirements from the official installation requirements documentation.
