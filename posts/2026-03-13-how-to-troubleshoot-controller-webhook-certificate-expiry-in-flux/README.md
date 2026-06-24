# How to Troubleshoot Controller Webhook Certificate Expiry in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Webhook, TLS Certificates, Certificate Expiry, Security

Description: Learn how to diagnose and fix webhook certificate expiry issues in Flux controllers that cause admission webhook failures and blocked resource creation.

---

Flux itself does not install admission webhooks for its controllers by default. Some clusters add their own validating or mutating admission webhooks around Flux custom resources, for example through platform policy tooling or an operator-managed extension. These webhooks rely on TLS certificates to secure communication between the Kubernetes API server and the webhook endpoint. When these certificates expire, the API server can no longer communicate with the webhook, blocking create, update, and delete operations covered by that webhook. This guide explains how to diagnose and fix certificate expiry issues for admission webhooks that affect Flux resources.

## Prerequisites

Before you begin, ensure you have the following:

- A Kubernetes cluster with Flux installed
- kubectl configured to access your cluster
- openssl CLI tool (for certificate inspection)
- cmctl CLI tool if cert-manager manages the certificate
- Permissions to view and modify webhook configurations, secrets, and the namespace where the webhook service runs

## Step 1: Identify Webhook Certificate Issues

When webhook certificates expire, you will see errors when trying to create or modify Flux resources:

```bash
kubectl apply -f my-kustomization.yaml
```

The error message will typically contain:

- `failed calling webhook`
- `x509: certificate has expired or is not yet valid`
- `connection refused`
- `Internal error occurred: failed calling webhook`

Check all validating and mutating webhook configurations:

```bash
kubectl get validatingwebhookconfigurations,mutatingwebhookconfigurations | grep -i 'flux\|toolkit'
```

## Step 2: Inspect Certificate Expiry

Extract and inspect the webhook certificate:

```bash
WEBHOOK_SECRET_NAMESPACE=flux-system
WEBHOOK_SECRET_NAME=webhook-server-cert
kubectl get secret -n "$WEBHOOK_SECRET_NAMESPACE" "$WEBHOOK_SECRET_NAME" -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates
```

This shows the `notBefore` and `notAfter` dates. If `notAfter` is in the past, the certificate has expired.

Check the full certificate details:

```bash
kubectl get secret -n "$WEBHOOK_SECRET_NAMESPACE" "$WEBHOOK_SECRET_NAME" -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text
```

Verify the certificate matches what the webhook configuration expects:

```bash
WEBHOOK_CONFIGURATION=example-flux-validating-webhook
kubectl get validatingwebhookconfiguration "$WEBHOOK_CONFIGURATION" -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | base64 -d | openssl x509 -noout -dates
```

## Step 3: Identify the Certificate Manager

Admission webhook certificates can be managed by different mechanisms depending on your installation:

### cert-manager

If you are using cert-manager, check the Certificate resource:

```bash
CERTIFICATE_NAME=webhook-server-cert
kubectl get certificates -n "$WEBHOOK_SECRET_NAMESPACE"
kubectl describe certificate -n "$WEBHOOK_SECRET_NAMESPACE" "$CERTIFICATE_NAME"
```

Check if the Certificate resource shows any issues:

```bash
kubectl get certificates -n "$WEBHOOK_SECRET_NAMESPACE" -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.conditions[0].type}{"\t"}{.status.conditions[0].status}{"\t"}{.status.conditions[0].message}{"\n"}{end}'
```

If cert-manager is having trouble renewing, check its logs:

```bash
kubectl logs -n cert-manager deploy/cert-manager | grep -i "flux\|webhook\|error\|failed"
```

### Self-Signed Certificates

If the webhook uses self-signed certificates generated during installation, they may have a fixed expiry period:

```bash
kubectl get secret -n "$WEBHOOK_SECRET_NAMESPACE" "$WEBHOOK_SECRET_NAME" -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -issuer -subject
```

If the issuer and subject are the same, it is self-signed.

## Step 4: Renew Expired Certificates

### With cert-manager

Trigger a certificate renewal:

```bash
cmctl renew -n "$WEBHOOK_SECRET_NAMESPACE" "$CERTIFICATE_NAME"
```

cert-manager will create a new CertificateRequest. Wait for the certificate to become ready:

```bash
kubectl get certificate -n "$WEBHOOK_SECRET_NAMESPACE" "$CERTIFICATE_NAME" -w
```

If cert-manager itself is having issues, check its prerequisites:

```bash
kubectl get pods -n cert-manager
kubectl get clusterissuers
```

### Without cert-manager (Manual Renewal)

Generate a new self-signed certificate:

```bash
WEBHOOK_SERVICE_NAME=webhook-service
WEBHOOK_SERVICE_NAMESPACE=flux-system

openssl req -x509 -newkey rsa:4096 -keyout tls.key -out tls.crt -days 365 -nodes -subj "/CN=${WEBHOOK_SERVICE_NAME}.${WEBHOOK_SERVICE_NAMESPACE}.svc" -addext "subjectAltName=DNS:${WEBHOOK_SERVICE_NAME}.${WEBHOOK_SERVICE_NAMESPACE}.svc,DNS:${WEBHOOK_SERVICE_NAME}.${WEBHOOK_SERVICE_NAMESPACE}.svc.cluster.local"
```

Update the webhook server secret:

```bash
kubectl create secret tls "$WEBHOOK_SECRET_NAME" -n "$WEBHOOK_SECRET_NAMESPACE" --cert=tls.crt --key=tls.key --dry-run=client -o yaml | kubectl apply -f -
```

Update the CA bundle in the webhook configuration:

```bash
CA_BUNDLE=$(cat tls.crt | base64 | tr -d '\n')
kubectl patch validatingwebhookconfiguration "$WEBHOOK_CONFIGURATION" --type='json' -p="[{\"op\": \"replace\", \"path\": \"/webhooks/0/clientConfig/caBundle\", \"value\": \"$CA_BUNDLE\"}]"
```

### Reinstall the Webhook

If the webhook was installed by a Helm chart or operator, reinstalling or reconciling that webhook package may regenerate its certificates:

```bash
helm upgrade --install <release-name> <chart> -n <namespace>
```

Do not run `flux install` for this purpose unless the admission webhook is actually part of your own Flux installation manifests; the default Flux install does not create controller admission webhook certificates.

## Step 5: Restart Controllers

After renewing certificates, restart the affected controllers to pick up the new certificates:

```bash
kubectl rollout restart deployment -n "$WEBHOOK_SERVICE_NAMESPACE" -l app.kubernetes.io/name=<webhook-app-label>
kubectl rollout status deployment -n "$WEBHOOK_SERVICE_NAMESPACE" -l app.kubernetes.io/name=<webhook-app-label>
```

## Step 6: Verify the Fix

Check that Flux itself is healthy:

```bash
flux check
```

Try listing Flux resources:

```bash
flux get sources all --all-namespaces
```

Verify the new certificate expiry date:

```bash
kubectl get secret -n "$WEBHOOK_SECRET_NAMESPACE" "$WEBHOOK_SECRET_NAME" -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates
```

## Temporary Workaround

If you need to unblock operations immediately while fixing certificates, you can temporarily disable the webhook. This should only be done as a short-term measure:

```bash
# Set the failure policy to Ignore (allows resources through even if the webhook fails)
kubectl patch validatingwebhookconfiguration "$WEBHOOK_CONFIGURATION" --type='json' -p='[{"op": "replace", "path": "/webhooks/0/failurePolicy", "value": "Ignore"}]'
```

Revert this change after fixing the certificate:

```bash
kubectl patch validatingwebhookconfiguration "$WEBHOOK_CONFIGURATION" --type='json' -p='[{"op": "replace", "path": "/webhooks/0/failurePolicy", "value": "Fail"}]'
```

## Prevention Tips

- Use cert-manager with automatic renewal to manage webhook certificates
- Set up alerts for certificate expiry at least 30 days before expiration
- Monitor certificate expiry using Prometheus with cert-manager metrics or custom exporters
- Document the certificate management approach used in your cluster
- Include certificate renewal in your cluster maintenance runbooks
- Run `flux check` regularly as part of cluster monitoring
- If using self-signed certificates, set a calendar reminder before the expiry date
- Test certificate renewal procedures in a staging environment

## Summary

Certificate expiry in an admission webhook that targets Flux custom resources can block operations covered by that webhook. The issue is diagnosed by inspecting the certificate dates in the webhook server secret and the CA bundle in the webhook configuration. The fix depends on how certificates are managed: cert-manager handles automatic renewal, while manual setups require regenerating certificates and updating webhook configurations. Using cert-manager with automatic renewal and monitoring certificate expiry are the best prevention strategies.
