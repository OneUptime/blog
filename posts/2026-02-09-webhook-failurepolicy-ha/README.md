# How to Configure Webhook FailurePolicy for High Availability Admission Control

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Admission Webhooks, High Availability, Reliability, Operations

Description: Learn how to configure webhook failure policies, implement high availability for admission webhooks, handle webhook failures gracefully, and ensure reliable admission control without blocking cluster operations.

---

Admission webhooks can become single points of failure in Kubernetes clusters. If a webhook is unavailable, all matching requests might be blocked, preventing deployments and causing outages. Proper failure policy configuration and high availability design ensure admission control remains reliable without compromising cluster availability. This guide shows you how to build resilient webhook infrastructure.

## Understanding Failure Policies

Kubernetes provides two failure policies for webhooks: Fail and Ignore. The Fail policy blocks requests when webhooks are unavailable, providing strong security guarantees but risking availability. The Ignore policy allows requests through on webhook failure, prioritizing availability over security enforcement.

Choose failure policies based on the criticality of each policy. Security-critical validations should use Fail, while nice-to-have mutations can use Ignore.

## Configuring Failure Policies

Set different policies for different webhooks:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: critical-security-validator
webhooks:
  - name: security.webhook.svc
    clientConfig:
      service:
        name: security-webhook
        namespace: webhooks
        path: /validate-security
      caBundle: <ca-bundle>
    rules:
      - operations: ["CREATE", "UPDATE"]
        apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["pods"]
    admissionReviewVersions: ["v1"]
    sideEffects: None
    failurePolicy: Fail  # Block on webhook failure
    timeoutSeconds: 5
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: compliance-audit-validator
webhooks:
  - name: audit.webhook.svc
    clientConfig:
      service:
        name: audit-webhook
        namespace: webhooks
        path: /validate-compliance
      caBundle: <ca-bundle>
    rules:
      - operations: ["CREATE", "UPDATE"]
        apiGroups: ["apps"]
        apiVersions: ["v1"]
        resources: ["deployments"]
    admissionReviewVersions: ["v1"]
    sideEffects: None
    failurePolicy: Ignore  # Allow on webhook failure
    timeoutSeconds: 10
```

Security webhooks use Fail to prevent bypassing security policies. Audit webhooks use Ignore to avoid blocking deployments when auditing is temporarily unavailable.

## Implementing Webhook Timeouts

Set appropriate timeouts to prevent slow webhooks from blocking requests:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: fast-validator
webhooks:
  - name: fast.webhook.svc
    clientConfig:
      service:
        name: webhook
        namespace: webhooks
        path: /validate
      caBundle: <ca-bundle>
    rules:
      - operations: ["CREATE"]
        apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["configmaps"]
    admissionReviewVersions: ["v1"]
    sideEffects: None
    failurePolicy: Fail
    timeoutSeconds: 3  # Fast timeout for simple validation
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: external-api-validator
webhooks:
  - name: external.webhook.svc
    clientConfig:
      service:
        name: webhook
        namespace: webhooks
        path: /validate-external
      caBundle: <ca-bundle>
    rules:
      - operations: ["CREATE"]
        apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["secrets"]
    admissionReviewVersions: ["v1"]
    sideEffects: None
    failurePolicy: Fail
    timeoutSeconds: 15  # Longer timeout for external API calls
```

Simple validation should timeout quickly (3-5 seconds), while webhooks calling external services need longer timeouts (10-15 seconds).

## High Availability Deployment

Deploy webhooks with multiple replicas and proper resource allocation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admission-webhook
  namespace: webhooks
spec:
  replicas: 3  # Multiple replicas for HA
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1  # Always keep majority available
      maxSurge: 1
  selector:
    matchLabels:
      app: admission-webhook
  template:
    metadata:
      labels:
        app: admission-webhook
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: admission-webhook
                topologyKey: kubernetes.io/hostname
      containers:
        - name: webhook
          image: admission-webhook:v1.0.0
          ports:
            - containerPort: 8443
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 8443
              scheme: HTTPS
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 8443
              scheme: HTTPS
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 2
      terminationGracePeriodSeconds: 30
```

Use pod anti-affinity to spread replicas across nodes. Configure rolling updates to maintain availability during deployments.

## Implementing Circuit Breakers

Add circuit breaker logic to webhook code:

```go
import (
    "sync/atomic"
    "time"
)

type CircuitBreaker struct {
    failures     uint64
    lastFailure  time.Time
    threshold    uint64
    resetTimeout time.Duration
}

func NewCircuitBreaker(threshold uint64, resetTimeout time.Duration) *CircuitBreaker {
    return &CircuitBreaker{
        threshold:    threshold,
        resetTimeout: resetTimeout,
    }
}

func (cb *CircuitBreaker) Call(fn func() error) error {
    // Check if circuit is open
    if cb.IsOpen() {
        return fmt.Errorf("circuit breaker open")
    }

    // Execute function
    err := fn()
    if err != nil {
        cb.RecordFailure()
        return err
    }

    cb.RecordSuccess()
    return nil
}

func (cb *CircuitBreaker) IsOpen() bool {
    failures := atomic.LoadUint64(&cb.failures)
    if failures >= cb.threshold {
        if time.Since(cb.lastFailure) > cb.resetTimeout {
            atomic.StoreUint64(&cb.failures, 0)
            return false
        }
        return true
    }
    return false
}

func (cb *CircuitBreaker) RecordFailure() {
    atomic.AddUint64(&cb.failures, 1)
    cb.lastFailure = time.Now()
}

func (cb *CircuitBreaker) RecordSuccess() {
    atomic.StoreUint64(&cb.failures, 0)
}

// Use in webhook handler
var externalAPICircuit = NewCircuitBreaker(5, 30*time.Second)

func validateWithExternalAPI(pod *corev1.Pod) (bool, error) {
    err := externalAPICircuit.Call(func() error {
        // Call external API
        return callExternalAPI(pod)
    })

    if err != nil {
        log.Printf("external API unavailable, allowing request: %v", err)
        return true, nil  // Fail open
    }

    return true, nil
}
```

Circuit breakers prevent cascading failures by stopping requests to unhealthy dependencies.

## Namespace Exemptions

Exclude critical namespaces from webhook enforcement:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: app-validator
webhooks:
  - name: validate.webhook.svc
    clientConfig:
      service:
        name: webhook
        namespace: webhooks
        path: /validate
      caBundle: <ca-bundle>
    rules:
      - operations: ["CREATE", "UPDATE"]
        apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["pods"]
    admissionReviewVersions: ["v1"]
    sideEffects: None
    failurePolicy: Fail
    namespaceSelector:
      matchExpressions:
        - key: webhook-exempt
          operator: NotIn
          values: ["true"]
```

Label critical namespaces to bypass webhooks:

```bash
kubectl label namespace kube-system webhook-exempt=true
kubectl label namespace webhooks webhook-exempt=true
```

This prevents webhook failures from affecting system components.

## Implementing Graceful Degradation

Build webhooks that degrade gracefully on dependency failures:

```go
func validatePod(pod *corev1.Pod) (allowed bool, message string) {
    // Always perform local validation
    if localErr := validateLocal(pod); localErr != nil {
        return false, localErr.Error()
    }

    // Try external validation with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
    defer cancel()

    externalValid, err := validateExternal(ctx, pod)
    if err != nil {
        // Log error but allow request (fail open)
        log.Printf("external validation failed, allowing: %v", err)
        return true, "external validation unavailable, allowed by default"
    }

    if !externalValid {
        return false, "rejected by external validation"
    }

    return true, ""
}

func validateExternal(ctx context.Context, pod *corev1.Pod) (bool, error) {
    // Check circuit breaker
    if externalAPICircuit.IsOpen() {
        return false, fmt.Errorf("circuit breaker open")
    }

    // Call external API with context timeout
    result := make(chan bool, 1)
    errChan := make(chan error, 1)

    go func() {
        valid, err := callExternalValidationAPI(pod)
        if err != nil {
            errChan <- err
            return
        }
        result <- valid
    }()

    select {
    case <-ctx.Done():
        return false, ctx.Err()
    case err := <-errChan:
        return false, err
    case valid := <-result:
        return valid, nil
    }
}
```

This implements multiple fallback layers, failing open when external dependencies are unavailable.

## Monitoring Webhook Health

Export metrics for webhook performance:

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    webhookRequests = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "webhook_requests_total",
            Help: "Total webhook requests",
        },
        []string{"type", "result"},
    )

    webhookDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "webhook_duration_seconds",
            Help:    "Webhook request duration",
            Buckets: prometheus.DefBuckets,
        },
        []string{"type"},
    )

    webhookErrors = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "webhook_errors_total",
            Help: "Total webhook errors",
        },
        []string{"type", "error"},
    )
)

func init() {
    prometheus.MustRegister(webhookRequests)
    prometheus.MustRegister(webhookDuration)
    prometheus.MustRegister(webhookErrors)
}

func validateHandler(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    defer func() {
        webhookDuration.WithLabelValues("validate").Observe(time.Since(start).Seconds())
    }()

    // ... validation logic ...

    if allowed {
        webhookRequests.WithLabelValues("validate", "allowed").Inc()
    } else {
        webhookRequests.WithLabelValues("validate", "denied").Inc()
    }
}

// Add metrics endpoint
http.Handle("/metrics", promhttp.Handler())
```

Monitor these metrics to detect webhook issues before they cause outages.

## Testing Failure Scenarios

Test webhook behavior under various failure conditions:

```bash
# Scale webhook to zero to simulate failure
kubectl scale deployment admission-webhook -n webhooks --replicas=0

# Try creating a pod with Fail policy (should be blocked)
kubectl run test-fail --image=nginx

# Try creating a pod with Ignore policy (should succeed)
kubectl run test-ignore --image=nginx

# Restore webhook
kubectl scale deployment admission-webhook -n webhooks --replicas=3

# Verify recovery
kubectl run test-recovery --image=nginx
```

Test different failure scenarios regularly to ensure proper configuration.

## Conclusion

Configure webhook failure policies based on policy criticality, using Fail for security-critical rules and Ignore for non-essential validations. Deploy webhooks with high availability using multiple replicas, pod anti-affinity, and rolling updates. Implement circuit breakers and graceful degradation to handle dependency failures. Exempt critical namespaces from webhook enforcement, and set appropriate timeouts for different validation types. Monitor webhook performance and test failure scenarios regularly to ensure reliable admission control without blocking cluster operations.

Proper failure policy configuration ensures admission control enhances security without becoming a single point of failure.
