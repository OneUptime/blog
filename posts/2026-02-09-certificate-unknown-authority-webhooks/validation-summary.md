# Validation Summary: How to Fix Kubernetes Certificate Signed by Unknown Authority Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes admission webhooks
- Kubernetes ValidatingWebhookConfiguration
- Kubernetes Services and Deployments
- cert-manager Certificates, Issuers, cainjector, and cmctl
- OpenSSL certificate inspection
- Prometheus alerting

## Sources Consulted
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager CA injector documentation: https://cert-manager.io/v1.9-docs/concepts/ca-injector/
- cert-manager cmctl documentation: https://cert-manager.io/v1.11-docs/reference/cmctl/
- cert-manager supported releases: https://cert-manager.io/docs/releases/
- cert-manager Go package metrics reference: https://pkg.go.dev/github.com/cert-manager/cert-manager

## Issues Found
- The introduction implied all webhook TLS verification failures reject API writes. Updated it to clarify that write failures happen when the webhook uses `failurePolicy: Fail`, which is the default.
- The webhook TLS explanation implied `caBundle` is always the only trust source. Updated it to account for URL-based webhooks that omit `caBundle` and use API server system trust roots.
- The OpenSSL example omitted SNI. Added `-servername webhook.default.svc` so the certificate inspection works correctly for servers that choose certificates by SNI.
- The cert-manager install command used `v1.13.0`, which is no longer a supported current release. Updated it to `v1.20.2`, matching current cert-manager installation documentation.
- The cert-manager readiness check used generic Deployment waits. Replaced it with `cmctl check api --wait=2m`, the cert-manager-documented readiness check, and noted that it requires `cmctl`.
- The Deployment manifest was not a valid `apps/v1` Deployment because it omitted `spec.selector` and matching pod template labels. Added the required selector and labels.
- The certificate rotation section deleted and recreated the Certificate resource on a schedule. Replaced this with cert-manager's automatic renewal behavior and the documented `cmctl renew` command for manual renewal.
- The admission webhook Prometheus metric used `type="validating"`, but Kubernetes documents the label value as `validate`. Updated the alert and renamed it from call failures to webhook rejections.

## Review Notes
The YAML snippets parse successfully. `kubectl` and `ruby` were not installed in the local workspace, so CLI behavior was checked against official documentation rather than local `--help` output.
