# Validation Summary: How to Handle ArgoCD During Certificate Rotation Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubeadm
- kubectl
- cert-manager
- TLS certificates
- PrometheusRule / Prometheus alerting
- OpenSSL

## Sources Consulted
- Argo CD TLS configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD cluster command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster/
- Argo CD declarative setup for repositories with self-signed TLS certificates: https://argo-cd.readthedocs.io/en/release-1.8/operator-manual/declarative-setup/#repositories-using-self-signed-tls-certificates-or-are-signed-by-custom-ca
- cert-manager Certificate resource documentation: https://cert-manager.io/v1.16-docs/usage/certificate/
- Kubernetes kubeadm certificate management: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/
- Kubernetes kubeadm certs command reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-certs/
- OneUptime linked companion article: https://oneuptime.com/blog/post/2026-02-26-argocd-external-certificate-managers/view

## Issues Found
- The manual ArgoCD server certificate rotation section said the server must be restarted to pick up `argocd-server-tls`. Official Argo CD documentation states `argocd-server` picks up changes to this Secret automatically. Updated the restart commands to be optional force-reload commands.
- The internal certificate section described `argocd-secret` as the internal component certificate source and advised deleting the whole Secret. This is unsafe and inaccurate because `argocd-secret` also stores other Argo CD state, and repo-server/Dex TLS use their own endpoint certificates. Replaced the example with `argocd-repo-server-tls` update commands and a repo-server restart.
- The Dex section said rotating `argocd-secret` handles Dex built-in TLS. Argo CD documentation says Dex either uses a generated startup certificate or the `argocd-dex-server-tls` Secret. Updated the wording accordingly.
- The cert-manager automation example for repo-server omitted the short service DNS name that Argo CD documentation recommends as a SAN. Added `argocd-repo-server`.
- The automation section implied cert-manager alone is enough for all Argo CD component certificate rotation. Argo CD server hot reloads its Secret, but repo-server and Dex do not hot reload their TLS Secrets. Added a note to restart those Deployments after renewal or use a restart controller.

## Review Notes
- The repository TLS ConfigMap guidance is correct: `argocd-tls-certs-cm` is keyed by repository server hostname and stores PEM certificates or CA certificates.
- The kubeadm commands shown are current. `kubeadm certs renew all` renews certificates unconditionally, and renewed certificates require restarting control-plane components to take effect.
- The `argocd cluster add`, `argocd cluster rm`, and cluster Secret examples align with Argo CD's documented cluster credential model.
- The PrometheusRule examples are structurally valid, but they assume cert-manager metrics are scraped by Prometheus and that `certmanager_certificate_expiration_timestamp_seconds` is present in the environment.
