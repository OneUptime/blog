# Validation Summary: How to Configure ArgoCD with Custom Domain Name

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Ingress
- ingress-nginx
- cert-manager
- DNS and ExternalDNS
- OIDC, Dex, and SSO callbacks
- Argo CD CLI
- Git provider webhooks

## Sources Consulted
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD User Management and SSO: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD Git Webhook Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/webhook/
- Argo CD CLI Login Command Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Kubernetes Ingress API documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- ExternalDNS annotations documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/

## Issues Found
- The SSO section treated all identity providers as if they used `/auth/callback`. Argo CD direct OIDC integrations use `/auth/callback`, but Dex-backed connectors use `/api/dex/callback`. Updated the text, Dex section, and troubleshooting note to distinguish the two callback paths.
- The multiple-domain nginx example included `grpc.argocd.yourcompany.com` only in the TLS host list, but did not define a routing rule for that host or configure gRPC backend protocol. Replaced it with separate HTTP and gRPC Ingress resources using `nginx.ingress.kubernetes.io/backend-protocol: "HTTP"` for the UI and `"GRPC"` for the gRPC hostname, matching Argo CD's documented nginx pattern.

## Review Notes
The main single-domain ingress path remains valid for browser UI access and CLI use with `--grpc-web`. The cloud static IP commands are provider-specific examples and may require provider-specific Kubernetes service or ingress annotations in a real production deployment.
