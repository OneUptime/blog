# Validation Summary: ArgoCD Runbook: Certificate Expired

## Status
validated

## Post Type
Runbook

## Technologies Covered
- Argo CD
- Kubernetes
- TLS and X.509 certificates
- cert-manager
- Dex LDAP/OIDC configuration
- Prometheus alerting
- Blackbox Exporter certificate expiry metrics
- AWS EKS and Google GKE CLI certificate data retrieval

## Sources Consulted
- Argo CD TLS configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD private repository TLS certificate documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD declarative cluster secret documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- cert-manager Certificate resource documentation: https://cert-manager.io/v1.14-docs/usage/certificate/
- Dex LDAP connector documentation: https://dexidp.io/docs/connectors/ldap/
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap
- Prometheus template reference: https://prometheus.io/docs/prometheus/3.3/configuration/template_reference/
- Prometheus Blackbox Exporter TLS expiry guidance: https://www.robustperception.io/get-alerted-before-your-ssl-certificates-expire

## Issues Found
- The repository certificate inspection command treated multi-line PEM values as single shell lines, which would break certificate parsing. Updated it to iterate over base64-encoded JSON entries and extract each key/value with `jq`.
- The cluster certificate inspection command decoded all cluster configs as one stream, which can fail when multiple secrets are present. Updated it to process each cluster secret independently and print the secret name with its CA expiry.
- The cert-manager renewal instructions deleted the target Secret as the renewal mechanism. Replaced that with `cmctl renew`, which cert-manager documents as the manual reissuance command.
- The Argo CD server TLS instructions said to restart `argocd-server` after updating `argocd-server-tls`. Argo CD documents that this secret is hot-reloaded, so the restart instruction was removed for that case.
- The self-signed certificate regeneration instructions deleted `argocd-server-tls`, but Argo CD stores its default generated self-signed server certificate in `argocd-secret`. Updated the command to remove `tls.crt` and `tls.key` from `argocd-secret` before restarting `argocd-server`.
- The repository certificate listing command used `jq 'keys'`, which lists top-level Kubernetes object fields instead of certificate host keys. Changed it to `jq '.data // {} | keys'`.
- The repository certificate update command recreated `argocd-tls-certs-cm` with a single file, which can overwrite other configured repository certificates. Replaced it with the official `argocd cert add-tls ... --upsert` command.
- The Prometheus alert expressions divided the duration by 86400 but still used `humanizeDuration`, which expects seconds. Updated the expressions to compare seconds directly so the annotation renders the duration correctly.

## Review Notes
The runbook is technically relevant and accurate after the targeted corrections. The managed-cluster CA refresh process can vary by cloud provider and cluster authentication mode, so operators should still confirm their provider-specific rotation procedure during incident response.
