# Validation Summary: How to Configure TLS Certificates for ArgoCD Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Secrets and Ingress
- TLS certificates
- ingress-nginx
- Traefik
- cert-manager
- Let's Encrypt ACME HTTP-01
- Argo CD CLI

## Sources Consulted
- Argo CD TLS configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD ingress configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Kubernetes `kubectl create secret tls` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- ingress-nginx annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx TLS/HTTPS guide: https://kubernetes.github.io/ingress-nginx/user-guide/tls/
- cert-manager installation guide: https://cert-manager.io/docs/installation/
- cert-manager ACME HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- Traefik Kubernetes Ingress TLS documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/ingress/

## Issues Found
- The post said the default Argo CD server certificate is stored in `argocd-server-tls`. Updated this to explain the actual lookup order: Argo CD uses `argocd-server-tls` when present and valid, otherwise falls back to `argocd-secret` or generates a self-signed certificate in `argocd-secret`.
- The architecture diagram showed Argo CD server connecting to the application controller over internal TLS. Updated the diagram so both server and application controller connect to the repo server, which matches Argo CD's documented repo-server TLS endpoint.
- The post instructed readers to restart `argocd-server` after updating `argocd-server-tls`. Replaced this with Argo CD's documented hot-reload behavior for that secret.
- The ingress-nginx TLS termination section implied a single HTTP ingress covers all CLI gRPC cases. Added a clarification that this works for gRPC-Web, while native gRPC generally needs TLS passthrough or a separate gRPC ingress because ingress-nginx uses one backend protocol per Ingress.
- The TLS passthrough section omitted the ingress-nginx controller prerequisite. Added the requirement to enable SSL passthrough with `--enable-ssl-passthrough`.
- The cert-manager install command used the floating GitHub `latest` URL. Updated it to the current official static manifest URL, `v1.20.2`, from cert-manager documentation.
- The HTTP-01 solver example used `class: nginx`. Updated it to `ingressClassName: nginx`, which cert-manager documents as the recommended field for most ingress controllers.
- The Argo CD CLI troubleshooting command used the non-existent `--certificate-authority` flag. Changed it to the documented `--server-crt` flag.

## Review Notes
- The ingress-nginx examples use valid Kubernetes Ingress syntax and documented annotations. Argo CD's latest ingress documentation marks the kubernetes/ingress-nginx section as deprecated/archived as of 2026, so future revisions may want to prefer another maintained ingress controller or clearly label ingress-nginx as legacy.
- Traefik's standard Kubernetes Ingress TLS annotation is valid, but Argo CD's official Traefik guidance uses `IngressRoute` for richer routing of HTTP and gRPC on the same host.
