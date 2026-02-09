# How to Configure Webhook Namespace Selectors to Limit Scope

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Webhooks, Namespaces

Description: Learn how to use namespace selectors in webhook configurations to control which namespaces trigger your admission webhooks, improving performance and avoiding unintended side effects.

---

Admission webhooks intercept requests for all matching resources across your cluster by default. This can create performance problems and trigger webhooks unnecessarily. Namespace selectors let you limit which namespaces activate your webhooks, reducing overhead and preventing webhooks from processing resources they shouldn't modify.

By configuring namespace selectors, you can target specific namespaces, exclude system namespaces, or implement progressive rollout strategies where webhooks only affect certain environments or teams.

## Basic Namespace Selector Configuration

Add a namespaceSelector to your webhook configuration:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: application-validator
webhooks:
- name: validate.application.example.com
  clientConfig:
    service:
      name: webhook-service
      namespace: webhook-system
      path: /validate
    caBundle: <BASE64_CA_CERT>
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: ["example.com"]
    apiVersions: ["v1"]
    resources: ["applications"]
  namespaceSelector:
    matchLabels:
      webhook: enabled
  admissionReviewVersions: ["v1"]
  sideEffects: None
```

Now the webhook only runs for resources in namespaces with the `webhook: enabled` label.

## Excluding System Namespaces

Prevent webhooks from processing kube-system and other critical namespaces:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: pod-defaulting
webhooks:
- name: default.pod.example.com
  clientConfig:
    service:
      name: webhook-service
      namespace: default
      path: /mutate
    caBundle: <BASE64_CA_CERT>
  rules:
  - operations: ["CREATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  namespaceSelector:
    matchExpressions:
    - key: kubernetes.io/metadata.name
      operator: NotIn
      values:
      - kube-system
      - kube-public
      - kube-node-lease
  admissionReviewVersions: ["v1"]
  sideEffects: None
```

This selector matches all namespaces except the system ones.

## Enabling Webhooks Per Environment

Use namespace labels to control which environments get webhook processing:

```yaml
# Label namespaces by environment
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
    webhook-policy: strict
---
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    environment: staging
    webhook-policy: standard
---
apiVersion: v1
kind: Namespace
metadata:
  name: development
  labels:
    environment: development
    webhook-policy: relaxed
```

Create environment-specific webhooks:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: strict-validation
webhooks:
- name: strict.validator.example.com
  clientConfig:
    service:
      name: webhook-service
      namespace: webhook-system
      path: /validate-strict
    caBundle: <BASE64_CA_CERT>
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: ["apps"]
    apiVersions: ["v1"]
    resources: ["deployments"]
  namespaceSelector:
    matchLabels:
      webhook-policy: strict
  admissionReviewVersions: ["v1"]
  sideEffects: None
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: standard-validation
webhooks:
- name: standard.validator.example.com
  clientConfig:
    service:
      name: webhook-service
      namespace: webhook-system
      path: /validate-standard
    caBundle: <BASE64_CA_CERT>
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: ["apps"]
    apiVersions: ["v1"]
    resources: ["deployments"]
  namespaceSelector:
    matchExpressions:
    - key: webhook-policy
      operator: In
      values:
      - standard
      - strict
  admissionReviewVersions: ["v1"]
  sideEffects: None
```

## Progressive Webhook Rollout

Roll out webhooks gradually by labeling namespaces:

```bash
# Phase 1: Enable for a canary namespace
kubectl label namespace canary webhook-version=v2

# Phase 2: Enable for staging
kubectl label namespace staging webhook-version=v2

# Phase 3: Enable for production after validation
kubectl label namespace production webhook-version=v2
```

Configure the webhook to target these labeled namespaces:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: new-webhook-v2
webhooks:
- name: v2.webhook.example.com
  clientConfig:
    service:
      name: webhook-service-v2
      namespace: webhook-system
      path: /mutate
    caBundle: <BASE64_CA_CERT>
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  namespaceSelector:
    matchLabels:
      webhook-version: v2
  admissionReviewVersions: ["v1"]
  sideEffects: None
```

## Combining Multiple Selectors

Use matchExpressions for complex selection logic:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: security-validator
webhooks:
- name: security.validator.example.com
  clientConfig:
    service:
      name: webhook-service
      namespace: webhook-system
      path: /validate-security
    caBundle: <BASE64_CA_CERT>
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  namespaceSelector:
    matchExpressions:
    # Include production and staging
    - key: environment
      operator: In
      values:
      - production
      - staging
    # Exclude internal tooling namespaces
    - key: exempt-from-security-policy
      operator: DoesNotExist
    # Must have security scanning enabled
    - key: security-scanning
      operator: In
      values:
      - enabled
  admissionReviewVersions: ["v1"]
  sideEffects: None
```

## Team-Based Webhook Scoping

Assign webhooks to specific teams:

```yaml
# Team namespace labels
apiVersion: v1
kind: Namespace
metadata:
  name: team-platform
  labels:
    team: platform
    managed-by: platform-team
---
apiVersion: v1
kind: Namespace
metadata:
  name: team-data
  labels:
    team: data
    managed-by: data-team
```

Team-specific webhook:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: platform-team-defaults
webhooks:
- name: platform.defaults.example.com
  clientConfig:
    service:
      name: platform-webhook
      namespace: platform-system
      path: /mutate
    caBundle: <BASE64_CA_CERT>
  rules:
  - operations: ["CREATE"]
    apiGroups: ["apps"]
    apiVersions: ["v1"]
    resources: ["deployments"]
  namespaceSelector:
    matchLabels:
      team: platform
  admissionReviewVersions: ["v1"]
  sideEffects: None
```

## Excluding the Webhook's Own Namespace

Prevent circular dependencies by excluding the webhook's namespace:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: pod-validator
webhooks:
- name: validate.pod.example.com
  clientConfig:
    service:
      name: webhook-service
      namespace: webhook-system
      path: /validate
    caBundle: <BASE64_CA_CERT>
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  namespaceSelector:
    matchExpressions:
    - key: kubernetes.io/metadata.name
      operator: NotIn
      values:
      - webhook-system  # Exclude webhook's own namespace
  admissionReviewVersions: ["v1"]
  sideEffects: None
  failurePolicy: Fail
```

This prevents the webhook from validating its own pods, which could cause deadlocks during startup.

## Using Object Selectors in Addition to Namespace Selectors

Combine namespace and object selectors for fine-grained control:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: privileged-pod-validator
webhooks:
- name: privileged.validator.example.com
  clientConfig:
    service:
      name: webhook-service
      namespace: webhook-system
      path: /validate-privileged
    caBundle: <BASE64_CA_CERT>
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  namespaceSelector:
    matchLabels:
      environment: production
  objectSelector:
    matchExpressions:
    - key: security.example.com/requires-validation
      operator: In
      values:
      - "true"
  admissionReviewVersions: ["v1"]
  sideEffects: None
```

The webhook only runs for pods with specific labels in production namespaces.

## Dynamic Namespace Labeling

Automatically label namespaces based on criteria:

```bash
#!/bin/bash

# Enable webhooks for all namespaces managed by a specific team
kubectl get namespaces -l managed-by=platform-team -o name | while read ns; do
  kubectl label $ns webhook-enabled=true --overwrite
done

# Disable webhooks for development namespaces
kubectl get namespaces -l environment=development -o name | while read ns; do
  kubectl label $ns webhook-enabled-
done
```

## Testing Namespace Selectors

Verify namespace selector behavior:

```bash
# Create test namespaces with different labels
kubectl create namespace test-enabled
kubectl label namespace test-enabled webhook=enabled

kubectl create namespace test-disabled
# No label

# Deploy test resources to both namespaces
kubectl apply -n test-enabled -f test-resource.yaml
kubectl apply -n test-disabled -f test-resource.yaml

# Check webhook logs to confirm it only processed test-enabled
kubectl logs -n webhook-system deployment/webhook-service
```

## Monitoring Webhook Scope

Track which namespaces trigger webhooks:

```go
package main

import (
    "net/http"

    admissionv1 "k8s.io/api/admission/v1"
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    webhookRequests = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "webhook_requests_total",
            Help: "Total webhook requests by namespace",
        },
        []string{"namespace", "resource", "operation"},
    )
)

func (w *Webhook) ServeHTTP(rw http.ResponseWriter, r *http.Request) {
    // ... decode admission review ...

    namespace := review.Request.Namespace
    resource := review.Request.Resource.Resource
    operation := string(review.Request.Operation)

    // Track metrics
    webhookRequests.WithLabelValues(namespace, resource, operation).Inc()

    // ... process request ...
}
```

Query metrics to see namespace distribution:

```promql
# Requests per namespace
sum by (namespace) (webhook_requests_total)

# Namespaces not hitting webhook (need namespace labels exported separately)
```

## Common Patterns

**Opt-in model**: Require explicit label to enable webhooks.

```yaml
namespaceSelector:
  matchLabels:
    webhook-enabled: "true"
```

**Opt-out model**: Enable for all namespaces except those labeled to opt out.

```yaml
namespaceSelector:
  matchExpressions:
  - key: webhook-disabled
    operator: DoesNotExist
```

**Environment-based**: Enable only for specific environments.

```yaml
namespaceSelector:
  matchLabels:
    environment: production
```

## Troubleshooting

If webhooks aren't triggering, check:

```bash
# Verify namespace labels
kubectl get namespace production -o yaml

# Check webhook configuration
kubectl get validatingwebhookconfiguration application-validator -o yaml

# Ensure labels match selector
# namespaceSelector.matchLabels should match namespace labels
```

If webhooks trigger unexpectedly:

```bash
# List all namespaces matching the selector
kubectl get namespaces -l webhook=enabled

# Check for label inheritance or default labels
kubectl describe namespace suspicious-namespace
```

Namespace selectors provide precise control over webhook scope, improving performance, reducing unintended side effects, and enabling sophisticated deployment strategies.
