# How to Secure Istio Webhooks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, Webhooks, Kubernetes, Admission Control

Description: How to secure Istio's mutating and validating admission webhooks to prevent tampering, injection bypasses, and denial of service.

---

Istio uses Kubernetes admission webhooks for two critical functions: sidecar injection and configuration validation. The mutating webhook intercepts pod creation requests and injects the Envoy sidecar. The validating webhook checks Istio resource configurations before they are applied. If either webhook is compromised or misconfigured, the consequences range from pods running without sidecars to arbitrary traffic manipulation.

Securing these webhooks is a key part of a hardened Istio deployment.

## Understanding Istio Webhooks

Check what webhooks Istio has installed:

```bash
kubectl get mutatingwebhookconfigurations | grep istio
kubectl get validatingwebhookconfigurations | grep istio
```

Look at the details:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o yaml
kubectl get validatingwebhookconfiguration istio-validator-istio-system -o yaml
```

The mutating webhook typically has:
- A `namespaceSelector` that matches namespaces labeled with `istio-injection=enabled`
- A `failurePolicy` set to `Fail` or `Ignore`
- A `caBundle` for TLS verification

## Setting Failure Policy

The `failurePolicy` determines what happens when the webhook is unreachable. There are two options:

- `Fail` - Reject the request if the webhook is unavailable
- `Ignore` - Allow the request through without webhook processing

For security, the sidecar injection webhook should use `Fail` in production. This prevents pods from being created without sidecars when istiod is temporarily unavailable:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: istio-sidecar-injector
webhooks:
- name: rev.namespace.sidecar-injector.istio.io
  failurePolicy: Fail
  timeoutSeconds: 10
  namespaceSelector:
    matchExpressions:
    - key: istio-injection
      operator: In
      values: ["enabled"]
  objectSelector:
    matchExpressions:
    - key: sidecar.istio.io/inject
      operator: NotIn
      values: ["false"]
```

The tradeoff is that if istiod goes down, no new pods can be created in injected namespaces. Make sure you run multiple istiod replicas and have proper health monitoring.

For the validating webhook, `Fail` is also recommended:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: istio-validator-istio-system
webhooks:
- name: validation.istio.io
  failurePolicy: Fail
  timeoutSeconds: 5
```

## Protecting the CA Bundle

The `caBundle` in the webhook configuration tells the API server how to verify the webhook's TLS certificate. If an attacker can modify this, they could redirect webhook calls to their own server.

Lock down who can modify webhook configurations:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: webhook-readonly
rules:
- apiGroups: ["admissionregistration.k8s.io"]
  resources: ["mutatingwebhookconfigurations", "validatingwebhookconfigurations"]
  verbs: ["get", "list", "watch"]
```

Only istiod and cluster admins should be able to update webhooks. Check who currently has access:

```bash
kubectl auth can-i update mutatingwebhookconfigurations --all-namespaces --as=system:serviceaccount:istio-system:istiod
```

Review all ClusterRoleBindings that grant webhook modification:

```bash
kubectl get clusterrolebindings -o json | \
  jq '.items[] | select(.roleRef.name as $role |
    ["cluster-admin", "admin"] | index($role) //
    ($role | test("istio"))) |
    {name: .metadata.name, role: .roleRef.name, subjects: .subjects}'
```

## Namespace Selector Security

The namespace selector on the webhook determines which namespaces get sidecar injection. An attacker who can modify namespace labels could bypass injection:

```bash
# Check if any non-admin users can label namespaces
kubectl auth can-i update namespaces --as=system:serviceaccount:default:default
```

Restrict who can label namespaces:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-label-editor
rules:
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list", "watch"]
  # Note: "update" and "patch" are intentionally missing
```

You can also use a validating webhook or admission controller to prevent removal of the `istio-injection` label:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: protect-istio-injection-label
spec:
  validationFailureAction: Enforce
  rules:
  - name: prevent-label-removal
    match:
      any:
      - resources:
          kinds:
          - Namespace
          selector:
            matchLabels:
              istio-injection: enabled
    validate:
      message: "Cannot remove istio-injection label from namespaces"
      pattern:
        metadata:
          labels:
            istio-injection: enabled
```

## Webhook TLS Security

The webhook endpoint uses TLS. Make sure the TLS configuration is strong:

```bash
# Check the webhook's certificate
kubectl get secret -n istio-system istio-ca-secret -o jsonpath='{.data.ca-cert\.pem}' | \
  base64 -d | openssl x509 -text -noout
```

Verify the certificate is not expired:

```bash
kubectl get secret -n istio-system istio-ca-secret -o jsonpath='{.data.ca-cert\.pem}' | \
  base64 -d | openssl x509 -enddate -noout
```

## Timeout Configuration

Webhook timeouts affect both security and availability. A too-long timeout can cause API server slowdowns. A too-short timeout can cause false rejections.

Recommended settings:

```yaml
webhooks:
- name: rev.namespace.sidecar-injector.istio.io
  timeoutSeconds: 10
  reinvocationPolicy: IfNeeded
```

The `reinvocationPolicy: IfNeeded` setting tells the API server to call the webhook again if another mutating webhook modifies the object afterward.

## Monitoring Webhook Health

Set up monitoring for webhook availability and performance:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: webhook-alerts
  namespace: monitoring
spec:
  groups:
  - name: istio-webhooks
    rules:
    - alert: IstioWebhookErrors
      expr: |
        sum(rate(apiserver_admission_webhook_rejection_count{
          name=~".*istio.*"
        }[5m])) > 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Istio webhook is rejecting requests"

    - alert: IstioWebhookLatency
      expr: |
        histogram_quantile(0.99,
          sum(rate(apiserver_admission_webhook_admission_duration_seconds_bucket{
            name=~".*istio.*"
          }[5m])) by (le, name)
        ) > 5
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Istio webhook latency is high"
```

## Preventing Injection Bypass

An attacker might try to create pods that bypass sidecar injection. There are several ways to do this:

1. **Creating pods in non-injected namespaces**
2. **Using the `sidecar.istio.io/inject: "false"` annotation**
3. **Using hostNetwork: true (which Istio skips by default)**

Protect against these:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: prevent-injection-bypass
spec:
  validationFailureAction: Enforce
  rules:
  - name: block-injection-disable
    match:
      any:
      - resources:
          kinds:
          - Pod
          namespaces:
          - myapp
    validate:
      message: "Cannot disable sidecar injection"
      pattern:
        metadata:
          =(annotations):
            =(sidecar.istio.io/inject): "!false"

  - name: block-host-network
    match:
      any:
      - resources:
          kinds:
          - Pod
          namespaces:
          - myapp
    validate:
      message: "Host networking is not allowed"
      pattern:
        spec:
          =(hostNetwork): false
```

## Network Policies for Webhook Traffic

Protect the webhook endpoint with network policies:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: webhook-network-policy
  namespace: istio-system
spec:
  podSelector:
    matchLabels:
      app: istiod
  policyTypes:
  - Ingress
  ingress:
  # Allow webhook calls from the API server
  - from: []
    ports:
    - port: 15017
      protocol: TCP
  # Allow xDS from sidecar proxies
  - from:
    - namespaceSelector: {}
    ports:
    - port: 15012
      protocol: TCP
```

## Regular Verification

Periodically verify that webhooks have not been tampered with:

```bash
#!/bin/bash
# Check webhook configuration integrity

echo "Checking mutating webhooks..."
MUTATING_COUNT=$(kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o json | \
  jq '.webhooks | length')
echo "Mutating webhook rules: $MUTATING_COUNT"

echo "Checking validating webhooks..."
VALIDATING_COUNT=$(kubectl get validatingwebhookconfiguration istio-validator-istio-system -o json | \
  jq '.webhooks | length')
echo "Validating webhook rules: $VALIDATING_COUNT"

echo "Checking failure policies..."
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o json | \
  jq '.webhooks[] | {name: .name, failurePolicy: .failurePolicy}'

echo "Checking CA bundle..."
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o json | \
  jq -r '.webhooks[0].clientConfig.caBundle' | base64 -d | \
  openssl x509 -enddate -noout
```

Webhook security is often overlooked but critically important. A misconfigured or compromised webhook can undermine your entire service mesh security posture. Regular monitoring, strict RBAC, and admission controller policies work together to keep your webhooks safe.
