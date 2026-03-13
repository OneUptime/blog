# How to Troubleshoot Controller Webhook Certificate Expiry in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Webhook, TLS Certificates, Certificate Expiry, Security

Description: Learn how to diagnose and fix webhook certificate expiry issues in Flux controllers that cause admission webhook failures and blocked resource creation.

---

Flux controllers use admission webhooks for validating and mutating custom resources. These webhooks rely on TLS certificates to secure communication between the Kubernetes API server and the webhook endpoint. When these certificates expire, the API server can no longer communicate with the webhook, blocking all create, update, and delete operations on Flux resources. This guide explains how to diagnose and fix webhook certificate expiry issues.

## Prerequisites

Before you begin, ensure you have the following:

- A Kubernetes cluster with Flux installed
- kubectl configured to access your cluster
- openssl CLI tool (for certificate inspection)
- Permissions to view and modify webhook configurations, secrets, and pods in the flux-system namespace

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
kubectl get validatingwebhookconfigurations | grep flux
kubectl get mutatingwebhookconfigurations | grep flux
```

## Step 2: Inspect Certificate Expiry

Extract and inspect the webhook certificate:

```bash
kubectl get secret -n flux-system webhook-server-cert -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates
```

This shows the `notBefore` and `notAfter` dates. If `notAfter` is in the past, the certificate has expired.

Check the full certificate details:

```bash
kubectl get secret -n flux-system webhook-server-cert -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text
```

Verify the certificate matches what the webhook configuration expects:

```bash
kubectl get validatingwebhookconfiguration flux-system -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | base64 -d | openssl x509 -noout -dates
```

## Step 3: Identify the Certificate Manager

Flux webhook certificates can be managed by different mechanisms depending on your installation:

### cert-manager

If you are using cert-manager, check the Certificate resource:

```bash
kubectl get certificates -n flux-system
kubectl describe certificate -n flux-system webhook-server-cert
```

Check if the Certificate resource shows any issues:

```bash
kubectl get certificates -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.conditions[0].type}{"\t"}{.status.conditions[0].status}{"\t"}{.status.conditions[0].message}{"\n"}{end}'
```

If cert-manager is having trouble renewing, check its logs:

```bash
kubectl logs -n cert-manager deploy/cert-manager | grep -i "flux\|webhook\|error\|failed"
```

### Self-Signed Certificates

If Flux uses self-signed certificates generated during installation, they may have a fixed expiry period:

```bash
kubectl get secret -n flux-system webhook-server-cert -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -issuer -subject
```

If the issuer and subject are the same, it is self-signed.

## Step 4: Renew Expired Certificates

### With cert-manager

Trigger a certificate renewal:

```bash
kubectl delete certificate -n flux-system webhook-server-cert
```

cert-manager will automatically create a new certificate. Wait for it to become ready:

```bash
kubectl get certificate -n flux-system webhook-server-cert -w
```

If cert-manager itself is having issues, check its prerequisites:

```bash
kubectl get pods -n cert-manager
kubectl get clusterissuers
```

### Without cert-manager (Manual Renewal)

Generate a new self-signed certificate:

```bash
# Generate a new CA and server certificate
openssl req -x509 -newkey rsa:4096 -keyout tls.key -out tls.crt -days 365 -nodes -subj "/CN=webhook-server" -addext "subjectAltName=DNS:source-controller.flux-system.svc,DNS:source-controller.flux-system.svc.cluster.local"
```

Update the webhook server secret:

```bash
kubectl create secret tls webhook-server-cert -n flux-system --cert=tls.crt --key=tls.key --dry-run=client -o yaml | kubectl apply -f -
```

Update the CA bundle in the webhook configuration:

```bash
CA_BUNDLE=$(cat tls.crt | base64 | tr -d '\n')
kubectl patch validatingwebhookconfiguration flux-system --type='json' -p="[{\"op\": \"replace\", \"path\": \"/webhooks/0/clientConfig/caBundle\", \"value\": \"$CA_BUNDLE\"}]"
```

### Reinstall Flux

The simplest approach to fix certificate issues is to reinstall Flux, which regenerates all certificates:

```bash
flux install
```

This will reinstall all Flux components with fresh certificates without affecting your existing Flux resources like GitRepository, Kustomization, or HelmRelease.

## Step 5: Restart Controllers

After renewing certificates, restart the affected controllers to pick up the new certificates:

```bash
kubectl rollout restart deployment -n flux-system -l app.kubernetes.io/part-of=flux
kubectl rollout status deployment -n flux-system -l app.kubernetes.io/part-of=flux
```

## Step 6: Verify the Fix

Test that webhook validation works:

```bash
flux check
```

Try creating or modifying a Flux resource:

```bash
flux get sources all --all-namespaces
```

Verify the new certificate expiry date:

```bash
kubectl get secret -n flux-system webhook-server-cert -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates
```

## Temporary Workaround

If you need to unblock operations immediately while fixing certificates, you can temporarily disable the webhook. This should only be done as a short-term measure:

```bash
# Set the failure policy to Ignore (allows resources through even if the webhook fails)
kubectl patch validatingwebhookconfiguration flux-system --type='json' -p='[{"op": "replace", "path": "/webhooks/0/failurePolicy", "value": "Ignore"}]'
```

Revert this change after fixing the certificate:

```bash
kubectl patch validatingwebhookconfiguration flux-system --type='json' -p='[{"op": "replace", "path": "/webhooks/0/failurePolicy", "value": "Fail"}]'
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

Webhook certificate expiry in Flux blocks all operations on Flux custom resources. The issue is diagnosed by inspecting the certificate dates in the webhook server secret. The fix depends on how certificates are managed: cert-manager handles automatic renewal, while manual setups require regenerating certificates and updating webhook configurations. Using cert-manager with automatic renewal and monitoring certificate expiry are the best prevention strategies.
