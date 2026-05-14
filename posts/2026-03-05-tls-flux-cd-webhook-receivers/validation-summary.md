# Validation Summary: How to Configure TLS for Flux CD Webhook Receivers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller Receivers
- Kubernetes Ingress and Secrets
- cert-manager Certificates
- NGINX Ingress Controller annotations
- OpenSSL
- GitHub webhooks and GitHub CLI

## Sources Consulted
- Flux Receivers documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux notification API reference: https://fluxcd.io/flux/components/notification/api/v1/
- cert-manager Certificate API reference: https://cert-manager.io/docs/reference/api-docs/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- GitHub REST API repository webhooks documentation: https://docs.github.com/en/rest/repos/webhooks
- GitHub webhook signature validation documentation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- GitHub CLI `gh api` manual: https://cli.github.com/manual/gh_api
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/

## Issues Found
- The cert-manager example requested both a public DNS name and `webhook-receiver.flux-system.svc.cluster.local` from a Let's Encrypt `ClusterIssuer`. Public ACME issuers cannot issue certificates for Kubernetes internal `.cluster.local` names, so the production certificate example now requests only the external DNS name.
- The self-signed OpenSSL example set only a Common Name. Modern TLS clients validate Subject Alternative Names, so the command now adds SAN entries for the external host and internal service DNS name.
- The Receiver introduction said the Receiver referenced the TLS secret. Flux Receiver `.spec.secretRef` is for the webhook token used to validate payload authenticity, so the text now says webhook token secret.
- The Receiver resource omitted the `apiVersion` for the reconciled `GitRepository`. Flux allows this field to be omitted, but the official example includes `source.toolkit.fluxcd.io/v1`; the snippet now uses the explicit current API version.
- The Ingress backend pointed to the `notification-controller` Service. Flux documentation says public Ingress should expose the `webhook-receiver` Service, so the backend service name was corrected.
- The GitHub CLI example used `gh webhook create`, which is not a GitHub CLI command. It was replaced with `gh api repos/myorg/myrepo/hooks` using the GitHub REST API webhook fields.
- The manual curl webhook test used a fake signature and omitted the GitHub event header. It now computes an HMAC signature with the webhook secret and sends `X-GitHub-Event: push` plus the Flux-documented `X-Hub-Signature` header.

## Review Notes
- `kubectl` and `flux` were not installed in the local environment, so Kubernetes and Flux CLI details were validated against official documentation rather than executed locally.
- GitHub recommends `X-Hub-Signature-256` for new webhook validation, while current Flux Receiver documentation describes GitHub receiver validation through `X-Hub-Signature`. The post's manual test follows the Flux Receiver documentation.
