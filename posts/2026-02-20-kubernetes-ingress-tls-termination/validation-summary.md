# Validation Summary: How to Configure TLS Termination at the Kubernetes Ingress

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Ingress
- Kubernetes TLS Secrets
- ingress-nginx annotations and ConfigMap settings
- cert-manager and ACME HTTP-01 issuers
- Let's Encrypt
- OpenSSL
- kubectl
- curl

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager HTTP-01 ACME solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager v1.20.2 release manifest: https://github.com/cert-manager/cert-manager/releases/download/v1.20.2/cert-manager.yaml
- ingress-nginx TLS/HTTPS documentation: https://kubernetes.github.io/ingress-nginx/user-guide/tls/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Let's Encrypt challenge types documentation: https://letsencrypt.org/docs/challenge-types/
- Local OpenSSL command help for `openssl req`, `openssl s_client`, and `openssl x509`

## Issues Found
- The self-signed certificate example only set the certificate Common Name and used `openssl req -nodes`. Modern hostname validation requires a Subject Alternative Name, and local OpenSSL marks `-nodes` as deprecated. Changed the command to use `-noenc` and add `subjectAltName=DNS:app.example.com`.
- The cert-manager installation command pinned `v1.16.0`, which is outdated relative to the current official static manifest. Updated it to `v1.20.2`.
- The cert-manager readiness command waited only for pods with `app=cert-manager`, which does not cover the webhook and cainjector deployments. Changed it to wait for all deployments in the `cert-manager` namespace to become available.
- The multiple-host example included a wildcard host while using an HTTP-01 ClusterIssuer. Let's Encrypt wildcard certificates require DNS-based validation, not HTTP-01. Removed the wildcard TLS entry from that HTTP-01 based Ingress example.
- The TLS protocol version example used `nginx.ingress.kubernetes.io/ssl-protocols` as an Ingress annotation. ingress-nginx documents `ssl-protocols` as a ConfigMap setting, while `ssl-ciphers` and `ssl-prefer-server-ciphers` are valid annotations. Reworked the snippet to set protocol versions in the ingress-nginx ConfigMap and keep cipher settings on the Ingress.

## Review Notes
- The ingress-nginx `ssl-redirect` annotations are valid, but ingress-nginx already redirects HTTP to HTTPS by default when a TLS section is present unless disabled globally or per Ingress.
- TLS passthrough in ingress-nginx is valid with `nginx.ingress.kubernetes.io/ssl-passthrough: "true"` and requires the controller `--enable-ssl-passthrough` flag. ingress-nginx documents that this works at layer 4 and bypasses normal HTTP annotation behavior.
- `kubectl` was not installed in the local environment, so kubectl commands were checked against the official Kubernetes generated reference instead of local `--help` output.
