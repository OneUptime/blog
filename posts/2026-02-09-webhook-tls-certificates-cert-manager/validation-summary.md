# Validation Summary: How to Manage Webhook TLS Certificates with cert-manager Automatically

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes admission webhooks
- cert-manager
- cert-manager Issuer, ClusterIssuer, Certificate, CA issuer, and cainjector
- Kubernetes Deployment, Service, Secret, CronJob, ValidatingWebhookConfiguration, and MutatingWebhookConfiguration resources
- Go TLS server certificate reloading
- PrometheusRule monitoring
- kubectl and cmctl

## Sources Consulted
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager SelfSigned issuer documentation: https://cert-manager.io/docs/configuration/selfsigned/
- cert-manager CA Injector documentation: https://cert-manager.io/v1.14-docs/concepts/ca-injector/
- cert-manager Certificate API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager Certificate usage and renewal documentation: https://cert-manager.io/v1.14-docs/usage/certificate/
- cert-manager annotations reference: https://cert-manager.io/docs/reference/annotations/
- cert-manager cmctl command reference: https://cert-manager.io/v1.11-docs/reference/cmctl/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/v1.15-docs/devops-tips/prometheus-metrics/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kubernetes MutatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/mutating-webhook-configuration-v1/
- Kubernetes dynamic admission control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Go net/http package documentation: https://pkg.go.dev/net/http

## Issues Found
- The cert-manager installation command used the older `v1.14.0` manifest. Updated it to the current official static manifest version, `v1.20.2`.
- The post described a self-signed issuer as working "perfectly" for webhook certificates and implied a cluster-wide self-signed issuer was appropriate for production. Updated the wording to limit self-signed issuers to quick test environments, matching cert-manager's documentation that SelfSigned issuers are mainly for bootstrapping or ad-hoc use.
- The webhook deployment example referenced `webhook-service` in the webhook configurations but did not create a Service. Added a minimal Service that selects the deployment pods and exposes port 443 to the named container port.
- The Go certificate reloader example used `http.Server` but did not import `net/http`. Added the missing import so the sample is syntactically complete.
- The troubleshooting section used `cert-manager.io/issue-temporary-certificate` as a manual renewal command. That annotation creates a temporary certificate and does not manually renew the Certificate. Replaced it with `cmctl renew webhook-cert -n webhook-system`.

## Review Notes
- The Kubernetes and cert-manager resource API versions used in the post are current and not deprecated.
- The `cmctl check api --wait=2m` command is the official cert-manager readiness check, but the existing `kubectl wait` command is still a valid Kubernetes command for waiting on pods.
- I could not run a local Go compile check because the `go` binary is not installed in this environment.
