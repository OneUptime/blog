# How to Configure Webhook FailurePolicy and TimeoutSeconds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Webhooks, Configuration, Reliability

Description: Learn how to configure webhook failure policies and timeout settings to balance reliability and cluster availability when admission webhooks fail or respond slowly.

---

Webhooks are external services that can fail. Networks have latency. Pods crash. When your admission webhook is unreachable or slow, Kubernetes needs to make a decision: allow the request anyway, or deny it for safety?

The failurePolicy and timeoutSeconds settings control this behavior. Choose wrong and either your cluster locks up when webhooks fail, or security policies get bypassed. This guide helps you configure these settings appropriately.

## Understanding Failure Policies

Kubernetes supports two failure policies for admission webhooks: Fail and Ignore.

With Fail policy, if the webhook is unavailable or returns an error, Kubernetes denies the admission request. This provides strong guarantees that your policies are enforced, but can prevent cluster operations if the webhook has issues.

With Ignore policy, if the webhook is unavailable, Kubernetes allows the request through as if the webhook wasn't configured. This keeps the cluster operational but means policies might not be enforced during outages.

## Configuring Failure Policy

Set the failurePolicy field in your webhook configuration.

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: security-webhook
webhooks:
- name: validate-security.example.com
  clientConfig:
    service:
      name: security-webhook
      namespace: webhook-system
      path: /validate
    caBundle: LS0tLS1CRUdJTi...
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  failurePolicy: Fail # Deny requests if webhook fails
  timeoutSeconds: 10
```

For critical security policies, use Fail:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: image-policy-webhook
webhooks:
- name: validate-images.example.com
  failurePolicy: Fail # Must enforce image policies
  timeoutSeconds: 5
  # ... rest of configuration
```

For optional enhancements like adding labels or metrics, use Ignore:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: labeling-webhook
webhooks:
- name: add-labels.example.com
  failurePolicy: Ignore # Don't block if labeling service is down
  timeoutSeconds: 3
  # ... rest of configuration
```

## Setting Appropriate Timeouts

The timeoutSeconds field determines how long Kubernetes waits for a webhook response before considering it failed. Valid values are 1 to 30 seconds, with a default of 10.

For fast, simple validations:

```yaml
webhooks:
- name: fast-validation.example.com
  timeoutSeconds: 3 # Simple field validation should be quick
  failurePolicy: Fail
```

For webhooks that call external APIs:

```yaml
webhooks:
- name: external-validation.example.com
  timeoutSeconds: 15 # Allow time for external API calls
  failurePolicy: Ignore # Don't block if external service is slow
```

For database lookups or complex logic:

```yaml
webhooks:
- name: complex-validation.example.com
  timeoutSeconds: 20
  failurePolicy: Fail
```

Balance timeout duration against user experience. Long timeouts make kubectl commands feel slow. Short timeouts can cause false failures on network hiccups.

## Implementing Webhook Timeouts

Your webhook server should respect timeout settings and return responses quickly.

```go
package main

import (
    "context"
    "encoding/json"
    "net/http"
    "time"

    admissionv1 "k8s.io/api/admission/v1"
)

func (ws *WebhookServer) serve(w http.ResponseWriter, r *http.Request) {
    // Create a context with timeout slightly less than webhook timeout
    ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
    defer cancel()

    // Process the admission request with timeout
    admissionResponse := ws.validateWithTimeout(ctx, r)

    // Return response
    respondJSON(w, admissionResponse)
}

func (ws *WebhookServer) validateWithTimeout(ctx context.Context, r *http.Request) *admissionv1.AdmissionResponse {
    // Channel to receive validation result
    resultCh := make(chan *admissionv1.AdmissionResponse, 1)

    go func() {
        // Perform validation
        result := ws.validate(r)
        select {
        case resultCh <- result:
        case <-ctx.Done():
            // Context cancelled, don't send result
        }
    }()

    // Wait for result or timeout
    select {
    case result := <-resultCh:
        return result
    case <-ctx.Done():
        // Timeout - return failure
        return &admissionv1.AdmissionResponse{
            Allowed: false,
            Result: &metav1.Status{
                Message: "validation timeout",
                Code:    500,
            },
        }
    }
}
```

## Combining with Namespace Selectors

Use namespace selectors to apply different policies to different parts of your cluster.

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: environment-specific-policies
webhooks:
# Strict policy for production
- name: validate-prod.example.com
  failurePolicy: Fail
  timeoutSeconds: 5
  namespaceSelector:
    matchLabels:
      environment: production
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: ["apps"]
    apiVersions: ["v1"]
    resources: ["deployments"]
  # ... client config

# Lenient policy for development
- name: validate-dev.example.com
  failurePolicy: Ignore
  timeoutSeconds: 3
  namespaceSelector:
    matchLabels:
      environment: development
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: ["apps"]
    apiVersions: ["v1"]
    resources: ["deployments"]
  # ... client config
```

## Handling Webhook High Availability

For webhooks with Fail policy, ensure high availability to prevent cluster lockups.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-webhook
  namespace: webhook-system
spec:
  replicas: 3 # Multiple replicas for HA
  selector:
    matchLabels:
      app: critical-webhook
  template:
    metadata:
      labels:
        app: critical-webhook
    spec:
      affinity:
        # Spread across nodes
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: critical-webhook
            topologyKey: kubernetes.io/hostname
        # Prefer different availability zones
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: critical-webhook
              topologyKey: topology.kubernetes.io/zone
      containers:
      - name: webhook
        image: registry.example.com/critical-webhook:v1.0.0
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8443
            scheme: HTTPS
          initialDelaySeconds: 5
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8443
            scheme: HTTPS
          initialDelaySeconds: 15
          periodSeconds: 10
```

## Testing Failure Scenarios

Test how your cluster behaves when webhooks fail.

Test timeout behavior:

```bash
# Deploy a webhook that always times out
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: slow-webhook
  namespace: webhook-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: slow-webhook
  template:
    metadata:
      labels:
        app: slow-webhook
    spec:
      containers:
      - name: webhook
        image: registry.example.com/slow-webhook:v1.0.0
        env:
        - name: DELAY_SECONDS
          value: "30" # Longer than timeout
EOF
```

Test with failurePolicy: Fail:

```bash
# Try to create a pod - should timeout and be denied
kubectl run test-pod --image=nginx
```

Test with failurePolicy: Ignore:

```bash
# Try to create a pod - should succeed after timeout
kubectl run test-pod --image=nginx
```

Test webhook unavailability:

```bash
# Scale webhook to zero
kubectl scale deployment critical-webhook -n webhook-system --replicas=0

# Try operations - behavior depends on failurePolicy
kubectl run test-pod --image=nginx
```

## Monitoring Webhook Performance

Monitor webhook latency and failure rates.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: webhook-alerts
  namespace: webhook-system
spec:
  groups:
  - name: webhooks
    interval: 30s
    rules:
    - alert: WebhookHighLatency
      expr: |
        histogram_quantile(0.95,
          rate(apiserver_admission_webhook_admission_duration_seconds_bucket[5m])
        ) > 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Webhook {{ $labels.name }} has high latency"

    - alert: WebhookFailureRate
      expr: |
        rate(apiserver_admission_webhook_rejection_count[5m]) > 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Webhook {{ $labels.name }} has high failure rate"

    - alert: WebhookTimeout
      expr: |
        rate(apiserver_admission_webhook_request_total{result="timeout"}[5m]) > 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Webhook {{ $labels.name }} timing out"
```

## Best Practices

Use Fail for security-critical policies like image validation, pod security policies, and resource quotas. These should never be bypassed.

Use Ignore for optional features like adding labels, injecting documentation annotations, or logging. These enhance operations but shouldn't block them.

Set timeouts based on actual webhook performance. Monitor p95 and p99 latencies and set timeouts accordingly. Leave headroom for network variability.

Deploy webhooks with Fail policy in high availability mode. Use multiple replicas with pod anti-affinity. Monitor health probes.

Test failure scenarios regularly. Verify that Fail policies actually block operations and that Ignore policies allow them through.

Document your webhook policies. Make it clear which webhooks are required vs optional.

## Conclusion

Failure policy and timeout configuration determine how your cluster behaves when webhooks fail. These settings balance security enforcement against operational availability.

Use Fail for critical policies you must enforce. Use Ignore for optional enhancements. Set timeouts based on measured performance. Deploy critical webhooks with high availability. Monitor webhook latency and failure rates. Test failure scenarios to verify behavior.

Getting these settings right prevents both security bypasses and cluster lockups. Review them regularly as your webhook implementations evolve.
