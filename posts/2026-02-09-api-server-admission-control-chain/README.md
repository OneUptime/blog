# How to Configure API Server Admission Control Chain Order and Plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API Server, Security

Description: Master Kubernetes API server admission control configuration, including plugin ordering, built-in controllers, and webhook integration to enforce policies and modify objects before persistence.

---

Admission controllers are gatekeepers in the Kubernetes API server request pipeline, intercepting requests after authentication and authorization but before object persistence to etcd. They can validate, mutate, or reject requests based on custom logic and policies. Understanding how to configure the admission control chain is essential for implementing security policies, resource quotas, and custom business logic.

This guide covers how to configure admission controllers, understand execution order, and implement custom admission webhooks.

## Understanding Admission Control Flow

The API server processes requests through this pipeline:

```
1. Authentication
2. Authorization
3. Admission Control
   ├─ Mutating Admission
   └─ Validating Admission
4. Persistence to etcd
```

Admission controllers run in two phases:

- **Mutating phase**: Can modify objects (runs first)
- **Validating phase**: Can only accept or reject (runs second)

## Viewing Current Admission Controllers

Check which admission controllers are enabled:

```bash
# View API server configuration
kubectl get pods -n kube-system kube-apiserver-<node-name> -o yaml | grep enable-admission-plugins

# Example output:
# --enable-admission-plugins=NodeRestriction,PodSecurityPolicy,ResourceQuota

# Check disabled plugins
kubectl get pods -n kube-system kube-apiserver-<node-name> -o yaml | grep disable-admission-plugins
```

List all available admission plugins:

```bash
kube-apiserver -h | grep -A 100 "enable-admission-plugins"
```

## Recommended Admission Controllers for Production

Configure essential admission controllers via kubeadm:

```yaml
# kubeadm-admission-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
apiServer:
  extraArgs:
    enable-admission-plugins: "NodeRestriction,NamespaceLifecycle,LimitRanger,ServiceAccount,DefaultStorageClass,ResourceQuota,MutatingAdmissionWebhook,ValidatingAdmissionWebhook,PodSecurityPolicy,Priority,DefaultTolerationSeconds,StorageObjectInUseProtection,PersistentVolumeClaimResize,RuntimeClass,CertificateApproval,CertificateSigning,CertificateSubjectRestriction,TaintNodesByCondition"
    disable-admission-plugins: "AlwaysPullImages"
```

Or edit the static pod manifest directly:

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
spec:
  containers:
  - command:
    - kube-apiserver
    - --enable-admission-plugins=NodeRestriction,NamespaceLifecycle,LimitRanger,ServiceAccount,DefaultStorageClass,ResourceQuota,MutatingAdmissionWebhook,ValidatingAdmissionWebhook
```

## Essential Built-in Admission Controllers

### NodeRestriction

Limits what kubelets can modify:

```yaml
enable-admission-plugins: "NodeRestriction"
```

This prevents kubelets from:
- Modifying node objects they don't own
- Accessing secrets/configmaps not bound to their pods
- Modifying pods scheduled to other nodes

### NamespaceLifecycle

Prevents operations on namespaces being deleted:

```yaml
enable-admission-plugins: "NamespaceLifecycle"
```

Rejects:
- Creating objects in non-existent namespaces
- Creating objects in namespaces being deleted
- Deleting system namespaces (default, kube-system, kube-public)

### LimitRanger

Enforces resource limits from LimitRange objects:

```yaml
# Enable controller
enable-admission-plugins: "LimitRanger"
```

Create LimitRange to set defaults:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: mem-limit-range
  namespace: production
spec:
  limits:
  - default:
      memory: 512Mi
      cpu: 500m
    defaultRequest:
      memory: 256Mi
      cpu: 250m
    max:
      memory: 2Gi
      cpu: 2000m
    min:
      memory: 128Mi
      cpu: 100m
    type: Container
```

### ResourceQuota

Enforces namespace resource quotas:

```yaml
enable-admission-plugins: "ResourceQuota"
```

Example quota:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: production
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 200Gi
    limits.cpu: "200"
    limits.memory: 400Gi
    persistentvolumeclaims: "20"
    pods: "100"
```

### PodSecurityPolicy (Deprecated in 1.21, removed in 1.25)

For older clusters, use PSP:

```yaml
enable-admission-plugins: "PodSecurityPolicy"
```

For 1.23+, use Pod Security Admission:

```yaml
enable-admission-plugins: "PodSecurity"
```

Configure pod security:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

## Understanding Plugin Execution Order

Admission plugins execute in specific order regardless of configuration:

**Mutating plugins run first (order matters):**
1. MutatingAdmissionWebhook
2. NamespaceLifecycle
3. LimitRanger
4. ServiceAccount
5. (other mutating plugins)

**Validating plugins run second:**
1. LimitRanger (validation phase)
2. ResourceQuota
3. PodSecurityPolicy/PodSecurity
4. ValidatingAdmissionWebhook
5. (other validating plugins)

The order in `--enable-admission-plugins` doesn't change execution order, only which plugins are active.

## Configuring Admission Webhooks

Enable webhook admission controllers:

```yaml
apiServer:
  extraArgs:
    enable-admission-plugins: "MutatingAdmissionWebhook,ValidatingAdmissionWebhook"
```

Create a mutating webhook:

```yaml
# mutating-webhook.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: pod-defaults
webhooks:
- name: defaults.example.com
  clientConfig:
    service:
      name: webhook-service
      namespace: webhooks
      path: "/mutate"
    caBundle: <base64-encoded-ca-cert>
  rules:
  - operations: ["CREATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  timeoutSeconds: 10
  failurePolicy: Fail
```

Create a validating webhook:

```yaml
# validating-webhook.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: pod-policy
webhooks:
- name: policy.example.com
  clientConfig:
    service:
      name: webhook-service
      namespace: webhooks
      path: "/validate"
    caBundle: <base64-encoded-ca-cert>
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  timeoutSeconds: 5
  failurePolicy: Ignore
```

## Advanced Admission Configuration

Use admission configuration file for complex setups:

```yaml
# admission-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
- name: PodSecurity
  configuration:
    apiVersion: pod-security.admission.config.k8s.io/v1
    kind: PodSecurityConfiguration
    defaults:
      enforce: "baseline"
      enforce-version: "latest"
      audit: "restricted"
      audit-version: "latest"
      warn: "restricted"
      warn-version: "latest"
    exemptions:
      usernames: []
      runtimeClasses: []
      namespaces: ["kube-system"]
- name: EventRateLimit
  configuration:
    apiVersion: eventratelimit.admission.k8s.io/v1alpha1
    kind: Configuration
    limits:
    - type: Namespace
      qps: 50
      burst: 100
      cacheSize: 2000
    - type: User
      qps: 10
      burst: 50
```

Reference the configuration file:

```yaml
apiServer:
  extraArgs:
    admission-control-config-file: "/etc/kubernetes/admission-config.yaml"
  extraVolumes:
  - name: admission-config
    hostPath: "/etc/kubernetes/admission-config.yaml"
    mountPath: "/etc/kubernetes/admission-config.yaml"
    readOnly: true
```

## Testing Admission Control

Test admission controller behavior:

```bash
# Create test pod that should be rejected
kubectl run test-pod --image=nginx --dry-run=server -o yaml

# Check admission webhook calls in API server logs
kubectl logs -n kube-system kube-apiserver-<node> | grep admission

# Test specific resource quota enforcement
kubectl create deployment test --image=nginx --replicas=100 -n production
# Should fail if exceeds quota
```

Debug webhook issues:

```bash
# Check webhook configuration
kubectl get validatingwebhookconfigurations
kubectl get mutatingwebhookconfigurations

# Describe webhook for details
kubectl describe validatingwebhookconfiguration pod-policy

# Check webhook service endpoints
kubectl get endpoints -n webhooks webhook-service

# View webhook server logs
kubectl logs -n webhooks -l app=webhook-server
```

## Monitoring Admission Controller Performance

Track admission controller metrics:

```promql
# Admission controller latency
histogram_quantile(0.99,
  rate(apiserver_admission_controller_admission_duration_seconds_bucket[5m])
)

# Admission webhook call duration
histogram_quantile(0.99,
  rate(apiserver_admission_webhook_admission_duration_seconds_bucket[5m])
)

# Rejected admission requests
rate(apiserver_admission_webhook_rejection_count[5m])
```

Create alerts for admission issues:

```yaml
groups:
- name: admission_control
  rules:
  - alert: SlowAdmissionWebhook
    expr: |
      histogram_quantile(0.99,
        rate(apiserver_admission_webhook_admission_duration_seconds_bucket[5m])
      ) > 1
    for: 5m
    annotations:
      summary: "Slow admission webhook"
      description: "Webhook {{ $labels.name }} taking {{ $value }}s at P99"

  - alert: HighAdmissionRejectionRate
    expr: rate(apiserver_admission_webhook_rejection_count[5m]) > 10
    for: 2m
    annotations:
      summary: "High admission rejection rate"
```

## Common Admission Controller Issues

**Problem: Webhook timing out**
```yaml
# Increase timeout
webhooks:
- name: slow-webhook.example.com
  timeoutSeconds: 30  # Increase from default 10s
  failurePolicy: Ignore  # Don't block on timeout
```

**Problem: Webhook causing cluster outage**
```yaml
# Use failure policy wisely
failurePolicy: Ignore  # For non-critical webhooks
failurePolicy: Fail    # Only for essential validation
```

**Problem: Circular dependency**
```yaml
# Exclude webhook pods from webhook processing
namespaceSelector:
  matchExpressions:
  - key: admission.example.com/webhook
    operator: DoesNotExist
```

Admission controllers are powerful tools for enforcing policies and modifying objects in Kubernetes. Configure essential built-in controllers for security and resource management, use webhooks for custom business logic, monitor admission controller performance, and always set appropriate failure policies to prevent webhooks from causing cluster-wide outages.
