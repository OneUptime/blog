# Validation Summary: Secure Argo Events Webhooks with Signatures, Tokens, and TLS

## Status
validated

## Post Type
Security Guide / Configuration Guide

## Technologies Covered
- Argo Events v1.9.11 EventSources and Sensors
- GitHub webhooks and HMAC-SHA256 signatures
- Kubernetes Secrets, Services, Ingress, RBAC, and NetworkPolicy
- HTTP bearer authentication
- TLS termination and certificate rotation
- OpenSSL command-line tools

## Sources Consulted
- Argo Events GitHub EventSource documentation: https://argoproj.github.io/argo-events/eventsources/setup/github/
- Argo Events webhook authentication documentation: https://argoproj.github.io/argo-events/eventsources/webhook-authentication/
- Argo Events EventSource Services documentation: https://argoproj.github.io/argo-events/eventsources/services/
- Argo Events API reference (`GithubEventSource`, `WebhookContext`, and `Service`): https://argoproj.github.io/argo-events/APIs/
- Argo Events v1.9.11 GitHub EventSource implementation: https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/eventsources/sources/github/start.go
- Argo Events v1.9.11 common webhook authentication and TLS implementation: https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/eventsources/common/webhook/webhook.go
- Argo Events v1.9.11 EventSource Service reconciliation: https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/reconciler/eventsource/resource.go
- GitHub validating webhook deliveries: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- GitHub webhook best practices: https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks
- GitHub REST API repository webhook configuration: https://docs.github.com/en/rest/repos/webhooks
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Secrets security guidance: https://kubernetes.io/docs/concepts/security/secrets-good-practices/
- Kubernetes Ingress TLS documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/#tls
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Go `net/http` TLS server documentation and source: https://pkg.go.dev/net/http and https://go.dev/src/net/http/server.go
- OpenSSL `s_client` and `x509` documentation: https://docs.openssl.org/master/man1/openssl-s_client/ and https://docs.openssl.org/master/man1/openssl-x509/

## Issues Found
- The GitHub example mixed a manually managed hook with fields that Argo only uses when it creates a hook through the GitHub API. I removed those no-op fields from the manual EventSource manifest and specified the corresponding URL, content type, event subscriptions, active state, and SSL verification settings that must be configured in GitHub.
- The post said `insecure` controls TLS verification for Argo's GitHub API client. In Argo Events v1.9.11 it sets GitHub's `insecure_ssl` webhook option, which determines whether GitHub verifies the delivery endpoint's certificate. I corrected the explanation and clarified that these provider-side fields do not filter incoming requests.
- The Ingress referenced `github-eventsource-svc`, but the shown EventSource had no `spec.service`, so Argo would not create that Service. I added an explicit ClusterIP Service with the current `eventsource-name: github` pod selector and port 12000.
- The rotation section stated that Argo reads all mounted secret material only when starting the webhook route. Current code loads the GitHub `webhookSecret` at listener startup, but reads a generic webhook's `authSecret` file on every request; Kubernetes updates mounted Secret volumes eventually. I corrected the rotation guidance to distinguish those behaviors.
- The direct-TLS rotation wording implied only that Argo retained certificate paths. Argo v1.9.11 calls Go's `ListenAndServeTLS`, which loads the certificate and key pair when the server starts. I made the restart requirement explicit for direct EventSource TLS renewal.
- The bearer-token `curl` example used a public HTTPS URL without stating that the generic EventSource still needs Service and Ingress routing. I added that prerequisite without expanding the example into a second networking manifest.

## Review Notes
- Argo Events still uses the `argoproj.io/v1alpha1` API for EventSource resources in v1.9.11; the fields used in the corrected manifests are current and not deprecated.
- The `openssl s_client` pipeline correctly inspects the certificate returned for the SNI hostname, but it is an inspection command rather than a strict certificate-validation test because it does not use `-verify_return_error` and suppresses diagnostic stderr. The post separately requires rejection testing with a normal client.
- Kubernetes Ingress is stable but frozen; Kubernetes recommends Gateway API for new feature development. The shown `networking.k8s.io/v1` Ingress remains supported and correct.
