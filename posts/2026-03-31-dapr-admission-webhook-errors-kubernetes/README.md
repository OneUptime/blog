# How to Fix Dapr Admission Webhook Errors on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Webhook, Admission Control, Sidecar Injection

Description: Troubleshoot Dapr admission webhook errors that prevent pod creation or sidecar injection in Kubernetes clusters.

---

Dapr uses a Mutating Admission Webhook to inject the `daprd` sidecar into annotated pods. When the webhook fails, pod creation is blocked and Kubernetes returns admission errors.

## How the Dapr Webhook Works

When a pod with `dapr.io/enabled: "true"` is created, Kubernetes calls the Dapr injector webhook service. The webhook mutates the pod spec to add the `daprd` container. If this call fails or times out, the pod is rejected.

## Common Error Messages

```text
Error from server (InternalError): error when creating "deployment.yaml":
Internal error occurred: failed calling webhook "sidecar-injector.dapr.io":
Post "https://dapr-sidecar-injector.dapr-system.svc:443/mutate":
dial tcp: lookup dapr-sidecar-injector.dapr-system.svc: no such host
```

Or:

```text
admission webhook "sidecar-injector.dapr.io" denied the request:
namespace not found
```

## Checking Webhook Configuration

Inspect the MutatingWebhookConfiguration:

```bash
kubectl get mutatingwebhookconfiguration
kubectl describe mutatingwebhookconfiguration dapr-sidecar-injector
```

Check the `caBundle` is populated and the service endpoint is correct.

## Verifying the Injector Service

Ensure the sidecar injector deployment and service are healthy:

```bash
kubectl get pods -n dapr-system | grep injector
kubectl get svc -n dapr-system | grep injector
kubectl logs -l app=dapr-sidecar-injector -n dapr-system --tail=50
```

## Webhook CA Bundle Expiry

The webhook uses a TLS certificate signed by the Dapr CA. If the CA bundle in the webhook configuration is stale, webhook calls fail. Refresh it:

```bash
kubectl rollout restart deployment dapr-sidecar-injector -n dapr-system
```

Dapr automatically updates the caBundle on restart. Verify after rollout:

```bash
kubectl get mutatingwebhookconfiguration dapr-sidecar-injector \
  -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | base64 --decode | \
  openssl x509 -noout -dates
```

## Namespace Label Requirements

For Dapr to inject sidecars, the target namespace may need a label (depending on webhook `namespaceSelector`):

```bash
kubectl label namespace mynamespace dapr-injection=enabled
```

Check what the webhook expects:

```bash
kubectl get mutatingwebhookconfiguration dapr-sidecar-injector \
  -o jsonpath='{.webhooks[0].namespaceSelector}'
```

## Bypassing the Webhook for Debugging

To test pod creation without sidecar injection temporarily, remove the Dapr annotation or explicitly disable it:

```yaml
metadata:
  annotations:
    dapr.io/enabled: "false"
```

Or set the webhook to `failurePolicy: Ignore` during troubleshooting (not for production):

```bash
kubectl patch mutatingwebhookconfiguration dapr-sidecar-injector \
  --type json -p '[{"op":"replace","path":"/webhooks/0/failurePolicy","value":"Ignore"}]'
```

## Summary

Dapr admission webhook errors are caused by injector pod failures, expired CA bundles, missing namespace labels, or network issues preventing Kubernetes from reaching the webhook service. Restart the sidecar injector deployment to refresh certificates, verify the injector service is healthy, and ensure namespace selectors match your target namespaces.
