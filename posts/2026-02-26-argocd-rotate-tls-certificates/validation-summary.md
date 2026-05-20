# Validation Summary: How to Rotate TLS Certificates in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Secrets and ConfigMaps
- cert-manager and cmctl
- OpenSSL
- Prometheus Operator PrometheusRule
- X.509 certificate monitoring

## Sources Consulted
- Argo CD TLS configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD private repository TLS certificates: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/private-repositories/
- cert-manager Certificate resource documentation: https://cert-manager.io/v1.16-docs/usage/certificate/
- cert-manager cmctl reference: https://cert-manager.io/docs/reference/cmctl/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap
- OpenSSL req and x509 command documentation: https://docs.openssl.org/master/man1/openssl-req/ and https://docs.openssl.org/3.4/man1/openssl-x509/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- x509-certificate-exporter metrics reference: https://github.com/enix/x509-certificate-exporter

## Issues Found
- The post claimed it covered every ArgoCD component that uses TLS and included Redis TLS in the diagram without covering Redis rotation. I narrowed the scope language to common ArgoCD components and integrations, and removed the Redis node from the diagram.
- The post said the repo server's default self-signed certificate is stored in `argocd-repo-server-tls`. Argo CD documentation says the default certificate is non-persistent and generated on startup; the Secret is only used when configuring a persistent certificate. I updated the wording and rotation steps accordingly.
- The repo server rotation instructions told readers to delete an auto-generated `argocd-repo-server-tls` Secret. That Secret may not exist in the default setup, so I changed the default rotation procedure to a repo-server restart.
- The post said ArgoCD clients pick up a new repo-server certificate through TLS trust configuration. By default, Argo CD uses non-validating TLS to repo-server; strict verification requires a persistent certificate and workload restarts. I corrected that explanation.
- The cert-manager section suggested deleting the certificate Secret to force re-issuance. cert-manager documentation explicitly says this is not the recommended manual rotation method; `cmctl renew` is recommended. I removed the Secret deletion command.
- The repository certificate section said Argo CD watches the ConfigMap and picks up changes automatically. Official docs note that propagation can take up to a couple of minutes, so I clarified that no restart is needed but propagation is not necessarily immediate.
- The monitoring section referred to an `x509_cert_expiry` exporter while the metric shown is from `x509-certificate-exporter`. I corrected the exporter name.

## Review Notes
The remaining Kubernetes, OpenSSL, cert-manager, and PrometheusRule snippets are syntactically plausible for current tooling. The CronJob example is intentionally alerting-only and assumes the referenced ServiceAccount has RBAC to read the TLS Secret.
