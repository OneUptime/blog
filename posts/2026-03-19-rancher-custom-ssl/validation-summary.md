# Validation Summary: How to Install Rancher with Custom SSL Certificates

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Docker
- Kubernetes
- Helm
- cert-manager
- OpenSSL
- TLS/SSL certificates

## Sources Consulted
- Rancher: Installing Rancher on a Single Node Using Docker - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/rancher-on-a-single-node-with-docker
- Rancher: Install/Upgrade Rancher on a Kubernetes Cluster - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher: Adding TLS Secrets - https://ranchermanager.docs.rancher.com/v2.10/getting-started/installation-and-upgrade/resources/add-tls-secrets
- Rancher: Rancher Helm Chart Options - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher: Updating the Rancher Certificate - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/update-rancher-certificate
- Rancher: Setting up the Bootstrap Password - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/bootstrap-password
- cert-manager: Installing with Helm - https://cert-manager.io/docs/installation/helm/
- Kubernetes: `kubectl create secret generic` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes: `kubectl create secret tls` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Helm: `helm install` - https://helm.sh/docs/helm/helm_install/

## Issues Found
- The post treated `tls.crt` like a leaf certificate. Rancher requires the server certificate plus intermediates as a full chain, so I corrected the prerequisite and certificate-preparation wording.
- The Docker install command incorrectly combined a mounted `cacerts.pem` with `--no-cacerts`. Rancher uses those in different scenarios, so I split the instructions into the correct private/self-signed CA flow and the correct recognized public CA flow.
- The Docker section did not mention that Rancher's single-node Docker install is for development and testing, not production. I added that restriction from the official Rancher docs.
- The Helm section incorrectly said cert-manager is needed or recommended for Rancher when using `ingress.tls.source=secret`. Rancher's install docs say to skip cert-manager in that case, so I corrected the explanation.
- The optional cert-manager example was outdated. I updated it to the current official Helm installation syntax from cert-manager's docs.
- The Helm install command always set `privateCA=true`, which is wrong for publicly trusted certificates. I changed it so `privateCA=true` is only added when the certificate is signed by a private CA.
- The renewal guidance did not account for CA-chain changes. I clarified that private-CA renewals may also require updating `cacerts.pem` or the `tls-ca` secret, and that Rancher agent trust must be updated when the CA changes.
- The troubleshooting note about incomplete certificate chains only mentioned `cacerts.pem`. I corrected it to distinguish the full chain in `tls.crt` from the CA chain in `cacerts.pem`.

## Review Notes
- The optional cert-manager example is pinned to `v1.20.2`, which is the latest version shown in cert-manager's official Helm install docs as of May 7, 2026.
- Rancher continues to document Docker-based installation, but only for development and testing. The Helm-based method remains the production-oriented path.
