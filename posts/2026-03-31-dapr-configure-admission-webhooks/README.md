# How to Configure Dapr Admission Webhooks on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Admission Webhook, Sidecar Injection, Security

Description: Configure and troubleshoot the Dapr MutatingAdmissionWebhook for sidecar injection, including TLS certificates, namespace selectors, and timeout settings.

---

## How Dapr Uses Admission Webhooks

Dapr registers a `MutatingAdmissionWebhook` called `dapr-sidecar-injector` that intercepts pod creation requests. When a pod has `dapr.io/enabled: "true"`, the webhook mutates the pod spec to inject the daprd sidecar container.

## Viewing the Webhook Configuration

```bash
# Get the webhook configuration
kubectl get mutatingwebhookconfiguration dapr-sidecar-injector -o yaml

# Key fields to check:
# - namespaceSelector (which namespaces are targeted)
# - caBundle (TLS certificate for webhook server)
# - failurePolicy (what happens if webhook is unreachable)
# - timeoutSeconds (how long API server waits for webhook response)
```

## Understanding the Default Configuration

```yaml
# Simplified view of the webhook
webhooks:
- name: sidecar-injector.dapr.io
  admissionReviewVersions: ["v1", "v1beta1"]
  clientConfig:
    service:
      name: dapr-sidecar-injector
      namespace: dapr-system
      path: /mutate
    caBundle: <base64-encoded-ca>
  rules:
  - apiGroups: [""]
    apiVersions: ["v1"]
    operations: ["CREATE"]
    resources: ["pods"]
  failurePolicy: Ignore
  timeoutSeconds: 10
```

## Changing the Failure Policy

```bash
# Default is Ignore (pods still start without sidecar if webhook fails)
# Change to Fail to prevent pods from starting if injection fails
kubectl patch mutatingwebhookconfiguration dapr-sidecar-injector \
  --type=json \
  -p='[{"op":"replace","path":"/webhooks/0/failurePolicy","value":"Fail"}]'

# Revert to Ignore (safer for production)
kubectl patch mutatingwebhookconfiguration dapr-sidecar-injector \
  --type=json \
  -p='[{"op":"replace","path":"/webhooks/0/failurePolicy","value":"Ignore"}]'
```

## Updating the Namespace Selector

Restrict webhook to specific namespaces:

```bash
kubectl patch mutatingwebhookconfiguration dapr-sidecar-injector \
  --type=json \
  -p='[{
    "op": "replace",
    "path": "/webhooks/0/namespaceSelector",
    "value": {
      "matchLabels": {"dapr-enabled": "true"}
    }
  }]'

# Label namespaces where injection should occur
kubectl label namespace default dapr-enabled=true
kubectl label namespace team-a dapr-enabled=true
```

## Refreshing the Webhook TLS Certificate

Dapr auto-generates and rotates the webhook TLS certificate. If it expires:

```bash
# Check certificate expiry
kubectl get secret dapr-sidecar-injector-cert -n dapr-system \
  -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -enddate

# Restart injector to regenerate the certificate
kubectl rollout restart deployment/dapr-sidecar-injector -n dapr-system

# Verify the caBundle was updated in the webhook config
kubectl get mutatingwebhookconfiguration dapr-sidecar-injector \
  -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | base64 -d | \
  openssl x509 -noout -enddate
```

## Summary

The Dapr MutatingAdmissionWebhook is the mechanism behind automatic sidecar injection. Keep `failurePolicy: Ignore` in production to prevent webhook outages from blocking pod creation. Periodically verify the webhook TLS certificate has not expired, and restart the sidecar injector deployment to trigger automatic certificate regeneration.
