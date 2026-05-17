# Validation Summary: How to Configure TLS Termination for Ingress on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, secretbox encryption)
- Kubernetes Ingress (`networking.k8s.io/v1`)
- NGINX Ingress Controller (annotations: `ssl-redirect`, `force-ssl-redirect`, `ssl-protocols`, `ssl-passthrough`)
- Traefik Ingress (IngressRoute, Middleware, TLSOption — `traefik.io/v1alpha1`)
- Helm (for installing/configuring ingress-nginx)
- OpenSSL (self-signed cert generation, `s_client` verification)
- kubectl (TLS secret creation)
- curl (TLS verification with `--resolve`)

## Sources Consulted
- Kubernetes Ingress API reference: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx TLS / SSL passthrough docs: https://kubernetes.github.io/ingress-nginx/user-guide/tls/
- Traefik v3 IngressRoute reference: https://doc.traefik.io/traefik/routing/providers/kubernetes-crd/
- Traefik TLS Options reference: https://doc.traefik.io/traefik/reference/routing-configuration/http/tls/tls-options/
- Traefik v2→v3 migration / API group change: https://doc.traefik.io/traefik/v3.4/migrate/v2/
- Traefik community forum — `noop@internal` service: https://community.traefik.io/t/noop-internal-service/5165
- Talos Linux v1alpha1 config reference (Sidero Labs): https://docs.siderolabs.com/talos/v1.8/reference/configuration/v1alpha1/config/
- OpenSSL `req` and `s_client` man pages

## Issues Found
No technical issues found.

Verifications performed:
- `openssl req -x509 -nodes -days 365 -newkey rsa:2048 ...` — valid syntax for generating a self-signed certificate.
- `kubectl create secret tls ... --cert=... --key=...` — correct imperative form.
- NGINX Ingress annotations (`nginx.ingress.kubernetes.io/ssl-redirect`, `force-ssl-redirect`, `ssl-protocols`, `ssl-passthrough`) — all are valid, current annotations.
- Traefik `apiVersion: traefik.io/v1alpha1` — correct; the legacy `traefik.containo.us/v1alpha1` was deprecated in Traefik v2.10 and removed in v3.
- Traefik `TLSOption` with `minVersion: VersionTLS12` and a `cipherSuites` list — matches the official format.
- Traefik `noop@internal` (`kind: TraefikService`) — confirmed by a Traefik maintainer as the canonical placeholder for redirect-only IngressRoutes.
- `helm upgrade ... --set controller.extraArgs.enable-ssl-passthrough=true` — valid Helm syntax for the ingress-nginx chart's `--enable-ssl-passthrough` controller flag.
- Talos `cluster.secretboxEncryptionSecret` — valid field in the v1alpha1 machine config used for Kubernetes secret encryption at rest in etcd.
- `curl --resolve host:port:ip` and `openssl s_client -connect ip:port -servername host` — correct flags.

## Review Notes
- The `cipherSuites` list in the Traefik `TLSOption` example only affects TLS 1.2 connections. Per Traefik/Go behavior, TLS 1.3 cipher suites are not configurable, so the list has no effect on the TLS 1.3 handshake. Worth a caveat in a future revision but not technically wrong.
- Traefik allows only one `TLSOption` named `default` cluster-wide (it is the implicit fallback). The example uses a custom name (`tls-options`) referenced explicitly from the IngressRoute, which is fine.
- The post references "covered in a separate post" for cert-manager + Let's Encrypt; no link is provided. Not a technical error, but a cross-link would improve the reader experience.
- The Talos note recommends enabling `secretboxEncryptionSecret` but does not explicitly call out that it must be set at cluster bootstrap time (rotating/adding it on an existing cluster is more involved). Accurate as written, but a future revision could mention this.
- The NGINX `ssl-passthrough` example sets `tls.hosts` without a `secretName`; with passthrough enabled this is acceptable because no termination happens at the ingress, but readers occasionally find this surprising. Technically correct.
