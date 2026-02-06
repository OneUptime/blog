# How to Fix OpenTelemetry Operator Webhook Timeout Errors in Large Clusters with Slow API Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Operator, Webhook, Performance

Description: Fix webhook timeout errors in the OpenTelemetry Operator caused by slow API server responses in large Kubernetes clusters.

In large Kubernetes clusters with thousands of pods, the OpenTelemetry Operator's mutating webhook can become a bottleneck. Pod creation requests time out waiting for the webhook to respond, causing failures across the cluster. This post covers how to diagnose and fix these timeout issues.

## The Symptoms

```bash
# Pod creation fails with timeout errors
kubectl apply -f my-pod.yaml
# Error from server (InternalError): Internal error occurred: failed calling webhook
# "mpod.kb.io": context deadline exceeded

# Or in events:
kubectl get events --sort-by=.lastTimestamp | grep webhook
# Warning  FailedCreate  replicaset/my-app-xyz  Error creating: Internal error occurred:
# failed calling webhook "mpod.kb.io": Post "...": context deadline exceeded (Client.Timeout exceeded)
```

## Understanding the Webhook Flow

When any pod is created in the cluster (if the webhook has a broad scope), the Kubernetes API server sends the pod spec to the Operator's webhook for potential mutation. The webhook:

1. Receives the admission request
2. Checks annotations for auto-instrumentation
3. Looks up the Instrumentation CR
4. Modifies the pod spec if needed
5. Returns the response

In a large cluster, this happens for every pod creation. If the webhook is slow or overloaded, it creates a cascading delay.

## Fix 1: Scope the Webhook to Specific Namespaces

The most impactful fix is to limit which namespaces the webhook intercepts. By default, it might intercept all pod creation requests:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: opentelemetry-operator-mutating-webhook-configuration
webhooks:
  - name: mpod.kb.io
    namespaceSelector:
      matchLabels:
        # Only intercept pods in namespaces with this label
        opentelemetry-instrumentation: enabled
    # ... rest of webhook config
```

Then label only the namespaces that need auto-instrumentation:

```bash
kubectl label namespace my-app-namespace opentelemetry-instrumentation=enabled
```

This dramatically reduces the webhook's load because it only processes pods in labeled namespaces.

## Fix 2: Increase the Webhook Timeout

The default webhook timeout is 10 seconds. In a slow cluster, this might not be enough:

```yaml
webhooks:
  - name: mpod.kb.io
    timeoutSeconds: 30  # Increase from default 10s
```

Apply the patch:

```bash
kubectl patch mutatingwebhookconfiguration \
  opentelemetry-operator-mutating-webhook-configuration \
  --type='json' -p='[{"op": "replace", "path": "/webhooks/0/timeoutSeconds", "value": 30}]'
```

## Fix 3: Scale the Operator

A single Operator replica can become a bottleneck. Scale it up:

```bash
kubectl scale deployment opentelemetry-operator-controller-manager \
  -n opentelemetry-operator-system --replicas=3
```

Make sure the Operator supports leader election (it does by default) so that multiple replicas can serve webhook requests:

```yaml
# In the Operator deployment
args:
  - --leader-elect=true
  - --health-probe-bind-address=:8081
  - --metrics-bind-address=127.0.0.1:8080
```

Add a PodDisruptionBudget to keep the webhook available during upgrades:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: opentelemetry-operator
  namespace: opentelemetry-operator-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: opentelemetry-operator
```

## Fix 4: Increase Operator Resources

The Operator might be CPU or memory constrained:

```yaml
resources:
  requests:
    cpu: 500m       # Increase from default 100m
    memory: 256Mi   # Increase from default 64Mi
  limits:
    cpu: 1
    memory: 512Mi
```

## Fix 5: Change failurePolicy to Ignore

If auto-instrumentation is not critical and you prefer pod creation to succeed even when the webhook is slow:

```yaml
webhooks:
  - name: mpod.kb.io
    failurePolicy: Ignore  # Pod creation succeeds even if webhook times out
```

The trade-off: pods created during webhook failures will not get auto-instrumentation injected. But at least they will start.

## Fix 6: Use objectSelector for Finer Control

Instead of namespace-level filtering, filter by pod labels:

```yaml
webhooks:
  - name: mpod.kb.io
    objectSelector:
      matchExpressions:
        # Only intercept pods that have an OTel annotation
        - key: instrumentation.opentelemetry.io/inject-java
          operator: Exists
```

This is the most precise approach because the webhook only fires for pods that actually need instrumentation. However, note that annotations are not supported in objectSelector, only labels. You would need to add a label to pods that need instrumentation.

## Monitoring Webhook Performance

```bash
# Check webhook latency via API server metrics
kubectl get --raw /metrics | grep apiserver_admission_webhook_admission_duration_seconds

# Check the Operator's own metrics
kubectl port-forward -n opentelemetry-operator-system \
  deployment/opentelemetry-operator-controller-manager 8080:8080
curl localhost:8080/metrics | grep webhook
```

Set up alerts for high webhook latency:

```yaml
# Alert when webhook latency exceeds 5 seconds
- alert: OtelOperatorWebhookSlow
  expr: |
    histogram_quantile(0.99,
      rate(apiserver_admission_webhook_admission_duration_seconds_bucket{
        name="opentelemetry-operator-mutating-webhook-configuration"
      }[5m])
    ) > 5
  for: 5m
  labels:
    severity: warning
```

## Summary

Webhook timeouts in large clusters are primarily a scaling problem. Start by scoping the webhook to only the namespaces that need it (Fix 1), as this alone often resolves the issue. If that is not enough, scale the Operator replicas and increase its resources. Changing failurePolicy to Ignore is a quick workaround but should not be the permanent solution.
