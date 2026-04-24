# Validation Summary: How to Troubleshoot Certificate Errors in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- cert-manager
- TLS / X.509 certificates
- Let's Encrypt
- OpenSSL
- kubectl

## Sources Consulted
- Rancher: Install/Upgrade Rancher on a Kubernetes Cluster: https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher: Troubleshooting the Rancher Server Kubernetes Cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster/troubleshooting
- Rancher: Updating the Rancher Certificate: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/update-rancher-certificate
- Rancher: Adding TLS Secrets: https://ranchermanager.docs.rancher.com/v2.10/getting-started/installation-and-upgrade/resources/add-tls-secrets
- cert-manager: Certificate resource: https://cert-manager.io/docs/usage/certificate/
- cert-manager: cmctl reference: https://cert-manager.io/docs/reference/cmctl/
- cert-manager: ACME Orders and Challenges: https://cert-manager.io/docs/concepts/acme-orders-challenges/
- cert-manager: HTTP01 configuration: https://cert-manager.io/docs/configuration/acme/http01/
- OpenSSL: `openssl s_client`: https://docs.openssl.org/3.0/man1/openssl-s_client/
- Kubernetes: `kubectl logs`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes: `kubectl set env`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_env/

## Issues Found
- The `openssl s_client` example did not pass `-servername`, which can return the wrong certificate on SNI-enabled ingress endpoints. I added `-servername <rancher-hostname>` so the inspection command targets the correct certificate.
- The cert-manager section said most Rancher installs use cert-manager and used a legacy or installation-dependent log label. I narrowed the statement to Rancher-generated and Let's Encrypt certificate modes and updated the log command to use the documented `app.kubernetes.io/instance=cert-manager` selector.
- The renewal step used `cert-manager.io/issue-temporary-certificate` and secret deletion as a renewal mechanism. That annotation controls temporary self-signed issuance behavior and cert-manager docs recommend `cmctl renew` for manual renewal instead, so I replaced the step with `cmctl renew`.
- The Let's Encrypt troubleshooting step checked a `ClusterIssuer` named `letsencrypt-prod` and suggested DNS-01 or HTTP-01. Rancher's documented Let's Encrypt flow uses a namespaced `Issuer` in `cattle-system` and HTTP-01 validation, so I rewrote the commands around `Issuer`, `Order`, and `Challenge` resources and corrected the explanation.
- The private CA section referenced a nonstandard secret name and key (`tls-rancher-ingress-ca` / `tls.crt`). Rancher documents the CA bundle as the `tls-ca` secret with a `cacerts.pem` key, so I corrected the secret inspection command.
- The manual rotation section implied a Rancher deployment restart was always needed after replacing `tls-rancher-ingress`. Rancher only requires a Rancher pod restart when `tls-ca` changes, so I made the restart conditional and added the matching `tls-ca` update command for private CA changes.
- The `CATTLE_CA_CHECKSUM` section hashed the leaf server certificate and updated only the `cattle-cluster-agent` deployment in the management cluster. Rancher documents deriving the checksum from Rancher's published CA bundle and updating downstream cluster agents, so I changed the checksum source and updated both `cattle-cluster-agent` and `cattle-node-agent` commands to make the target context explicit.
- The conclusion implied Rancher's monitoring stack directly alerts on certificate expiry. I removed that implication because it was broader than the documentation directly supports.

## Review Notes
- The updated renewal command requires `cmctl` to be installed.
- The manual rotation steps assume Rancher is already using `ingress.tls.source=secret`. If you are changing certificate source, Rancher's docs require a Helm values update as part of the rotation.
- When `agent-tls-mode` is `strict`, Rancher's install docs note additional CA handling requirements for private CAs and Let's Encrypt in some setups.
