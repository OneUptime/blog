# How to Fix 'webhook validation failed' Error in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Webhook, Admission Controller, Troubleshooting, Kubernetes, Cert-Manager, OPA

Description: A step-by-step guide to diagnosing and resolving webhook validation failures in Flux CD, covering admission webhooks, cert-manager integration, and OPA policy issues.

---

## Introduction

Admission webhooks in Kubernetes validate or mutate resources before they are persisted to etcd. When these webhooks are misconfigured, unavailable, or reject resources, Flux CD Kustomizations and HelmReleases fail with "webhook validation failed" errors. This guide walks through the common causes and fixes for webhook-related failures in Flux CD.

## Identifying the Error

Check the Kustomization or HelmRelease status:

```bash
# Check Kustomization status
kubectl get kustomizations -A

# Get detailed error
kubectl describe kustomization <name> -n flux-system
```

Typical error messages:

```yaml
Status:
  Conditions:
    - Type: Ready
      Status: "False"
      Reason: ReconciliationFailed
      Message: 'Internal error occurred: failed calling webhook "validate.cert-manager.io":
        failed to call webhook: Post "https://cert-manager-webhook.cert-manager.svc:443/validate":
        dial tcp 10.96.xxx.xxx:443: connect: connection refused'
```

Or for policy rejections:

```yaml
Message: 'admission webhook "validation.gatekeeper.sh" denied the request:
  [container-must-have-limits] container "my-app" does not have resource limits'
```

## Cause 1: Webhook Service Not Ready

The most common cause is that the webhook service endpoint is not available when Flux tries to apply resources. This frequently happens during initial cluster bootstrap.

### Diagnosing Webhook Service Health

```bash
# List all validating webhooks in the cluster
kubectl get validatingwebhookconfigurations

# List all mutating webhooks
kubectl get mutatingwebhookconfigurations

# Check if the webhook service has ready endpoints
kubectl get endpoints -n cert-manager cert-manager-webhook

# Check the webhook pod status
kubectl get pods -n cert-manager -l app=webhook
```

### Fix: Use Dependency Ordering

Ensure the webhook controller is fully ready before Flux applies resources that the webhook validates:

```yaml
# clusters/my-cluster/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/cert-manager
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Health check ensures the webhook is ready
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: cert-manager-webhook
      namespace: cert-manager
  timeout: 5m
```

```yaml
# clusters/my-cluster/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Wait for cert-manager webhook to be ready
  dependsOn:
    - name: cert-manager
```

## Cause 2: Webhook TLS Certificate Issues

Webhooks communicate over TLS. If the TLS certificate is expired, not yet issued, or uses a CA that the API server does not trust, webhook calls fail.

### Diagnosing Certificate Issues

```bash
# Check the webhook configuration for CA bundle
kubectl get validatingwebhookconfiguration cert-manager-webhook \
  -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | base64 -d | openssl x509 -text -noout

# Check if cert-manager has issued the webhook certificate
kubectl get certificates -n cert-manager

# Check certificate status
kubectl describe certificate cert-manager-webhook-ca -n cert-manager
```

### Fix: Restart the Webhook to Regenerate Certificates

```bash
# Restart the webhook deployment to regenerate its TLS certificate
kubectl rollout restart deployment cert-manager-webhook -n cert-manager

# Wait for the rollout to complete
kubectl rollout status deployment cert-manager-webhook -n cert-manager
```

### Fix: Manually Inject CA Bundle

If the CA bundle in the webhook configuration is stale:

```bash
# Get the current CA from the webhook service secret
CA_BUNDLE=$(kubectl get secret cert-manager-webhook-ca \
  -n cert-manager \
  -o jsonpath='{.data.ca\.crt}')

# Patch the webhook configuration with the correct CA
kubectl patch validatingwebhookconfiguration cert-manager-webhook \
  --type='json' \
  -p="[{\"op\": \"replace\", \"path\": \"/webhooks/0/clientConfig/caBundle\", \"value\": \"$CA_BUNDLE\"}]"
```

### Fix: Use cert-manager cainjector

Ensure the cainjector component is running, as it automatically updates CA bundles:

```bash
# Check if cainjector is running
kubectl get pods -n cert-manager -l app=cainjector

# Restart cainjector if needed
kubectl rollout restart deployment cert-manager-cainjector -n cert-manager
```

## Cause 3: OPA/Gatekeeper Policy Rejections

OPA Gatekeeper or Kyverno policies may reject resources that Flux is trying to apply.

### Diagnosing Policy Rejections

```bash
# List all Gatekeeper constraints
kubectl get constraints

# Check constraint violations
kubectl get constraints -o json | jq '.items[] | {name: .metadata.name, violations: .status.totalViolations}'

# For Kyverno, check policy reports
kubectl get policyreports -A
kubectl get clusterpolicyreports
```

### Fix: Update Resources to Meet Policy Requirements

If your policy requires resource limits:

```yaml
# deployment-with-limits.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          # Add resource limits to satisfy the policy
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          securityContext:
            # Common policy requirements
            runAsNonRoot: true
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
```

### Fix: Exempt Flux System Resources from Policies

If policies are blocking Flux system resources, add exemptions:

```yaml
# Gatekeeper: Exempt flux-system namespace
apiVersion: config.gatekeeper.sh/v1alpha1
kind: Config
metadata:
  name: config
  namespace: gatekeeper-system
spec:
  match:
    - excludedNamespaces:
        - flux-system
        - gatekeeper-system
      processes:
        - "*"
```

```yaml
# Kyverno: Exclude flux-system from policy
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: check-limits
      match:
        any:
          - resources:
              kinds:
                - Deployment
      exclude:
        any:
          - resources:
              namespaces:
                - flux-system
      validate:
        message: "Resource limits are required"
        pattern:
          spec:
            template:
              spec:
                containers:
                  - resources:
                      limits:
                        memory: "?*"
                        cpu: "?*"
```

## Cause 4: Webhook Timeout

Webhooks have a default timeout (usually 10 or 30 seconds). If the webhook service is slow to respond, requests time out.

### Fix: Increase Webhook Timeout

```bash
# Check current timeout setting
kubectl get validatingwebhookconfiguration <name> -o jsonpath='{.webhooks[0].timeoutSeconds}'

# Increase the timeout
kubectl patch validatingwebhookconfiguration <name> \
  --type='json' \
  -p='[{"op": "replace", "path": "/webhooks/0/timeoutSeconds", "value": 30}]'
```

### Fix: Set Failure Policy to Ignore

For non-critical webhooks, you can set the failure policy to Ignore so that webhook failures do not block resource creation:

```bash
# Check current failure policy
kubectl get validatingwebhookconfiguration <name> \
  -o jsonpath='{.webhooks[0].failurePolicy}'

# Change to Ignore (use with caution)
kubectl patch validatingwebhookconfiguration <name> \
  --type='json' \
  -p='[{"op": "replace", "path": "/webhooks/0/failurePolicy", "value": "Ignore"}]'
```

## Cause 5: Webhook Blocks During Cluster Restoration

When restoring a cluster from backup or during disaster recovery, webhooks may prevent resources from being created because the webhook services are not yet running.

### Fix: Temporarily Remove Webhooks During Bootstrap

```bash
# Save webhook configurations before removal
kubectl get validatingwebhookconfigurations -o yaml > /tmp/validating-webhooks-backup.yaml
kubectl get mutatingwebhookconfigurations -o yaml > /tmp/mutating-webhooks-backup.yaml

# Remove blocking webhooks temporarily
kubectl delete validatingwebhookconfiguration cert-manager-webhook

# Let Flux reconcile and deploy cert-manager
flux reconcile kustomization infrastructure --with-source

# The webhook will be recreated by the cert-manager deployment
```

### Fix: Use Flux Kustomization Retry

Configure the Kustomization to retry on failure, which handles transient webhook issues:

```yaml
# kustomization-with-retry.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # Short retry interval helps with transient webhook failures
  retryInterval: 1m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
```

## Quick Troubleshooting Commands

```bash
# 1. List all webhooks and their endpoints
kubectl get validatingwebhookconfigurations -o custom-columns=NAME:.metadata.name,WEBHOOKS:.webhooks[*].name
kubectl get mutatingwebhookconfigurations -o custom-columns=NAME:.metadata.name,WEBHOOKS:.webhooks[*].name

# 2. Check webhook endpoint health
kubectl get endpoints -A | grep webhook

# 3. Test a webhook directly
kubectl apply --dry-run=server -f resource.yaml

# 4. Check API server logs for webhook errors (if accessible)
kubectl logs -n kube-system kube-apiserver-<node> | grep webhook

# 5. Check webhook certificate expiry
kubectl get secret <webhook-secret> -n <namespace> -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -enddate -noout

# 6. Force reconciliation after fixing
flux reconcile kustomization <name> --with-source
```

## Summary

Webhook validation failures in Flux CD typically fall into five categories: unavailable webhook services, TLS certificate issues, policy rejections, timeouts, and bootstrap ordering problems. The most effective prevention strategy is to use Flux Kustomization dependencies with health checks to ensure webhook controllers are fully operational before applying resources they validate. For policy rejections, update your manifests to comply with policies or add appropriate exemptions for system namespaces. Always test webhook connectivity with `kubectl apply --dry-run=server` before investigating more complex causes.
