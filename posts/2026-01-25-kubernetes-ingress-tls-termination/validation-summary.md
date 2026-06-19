# Validation Summary: How to Set Up Kubernetes Ingress with TLS Termination

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Ingress
- Kubernetes Secrets
- ingress-nginx
- TLS termination
- cert-manager
- Let's Encrypt ACME HTTP-01 and DNS-01 challenges
- Cloudflare DNS-01 solver
- kubectl
- OpenSSL
- Prometheus alerting

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- ingress-nginx installation guide: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx TLS/HTTPS documentation: https://kubernetes.github.io/ingress-nginx/user-guide/tls/
- ingress-nginx TLS termination example: https://kubernetes.github.io/ingress-nginx/examples/tls-termination/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- Kubernetes Ingress NGINX retirement announcement: https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/
- cert-manager installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager Cloudflare DNS-01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/

## Issues Found
- Updated the ingress-nginx static manifest URL from `controller-v1.9.0` to `controller-v1.15.1`, because the original version was outdated and older than the current patched release line referenced by the upstream release artifacts.
- Added a caveat that community ingress-nginx was retired after March 2026, because recommending it generally for new production deployments without that context is no longer technically accurate.
- Updated the cert-manager install manifest from `v1.13.0` to `v1.20.2`, matching the current official static install documentation.
- Changed cert-manager HTTP-01 solver examples from `class: nginx` to `ingressClassName: nginx`, because current cert-manager API docs list `ingressClassName` as the recommended field and `class` as the legacy annotation-based option.
- Changed HSTS and `ssl-protocols` examples from Ingress annotations to ingress-nginx ConfigMap settings, because those keys are controller ConfigMap options in current ingress-nginx documentation. Kept `ssl-ciphers` with the same value but moved it into the same ConfigMap example for consistency.

## Review Notes
- `kubectl` was not installed in the local environment, so CLI behavior was verified against official kubectl documentation instead of local `--help` output.
- All YAML blocks in the post were parsed successfully with PyYAML after the edits.
