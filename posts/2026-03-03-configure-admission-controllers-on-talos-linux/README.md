# How to Configure Admission Controllers on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Admission Controller, Kubernetes, Security, Policy Enforcement

Description: Learn how to configure and manage Kubernetes admission controllers on Talos Linux for security and policy enforcement.

---

Admission controllers are plugins that intercept requests to the Kubernetes API server after authentication and authorization but before the object is persisted. They can validate requests, reject them, or even modify the objects being created. On Talos Linux, configuring admission controllers means modifying the API server settings through machine configuration, since you cannot directly edit API server manifests on the immutable filesystem.

This guide covers enabling and disabling built-in admission controllers, setting up webhook-based admission control, and configuring the Pod Security admission controller that replaced PodSecurityPolicy.

## How Admission Controllers Work

When a request hits the Kubernetes API server, it goes through this pipeline:

```text
Request -> Authentication -> Authorization -> Admission Controllers -> Persistence
```

There are two types of admission controllers. Mutating admission controllers can modify the request (for example, injecting sidecar containers). Validating admission controllers can only approve or reject the request. Mutating controllers always run before validating controllers.

## Viewing Active Admission Controllers

Check which admission controllers are currently enabled:

```bash
# View the API server configuration
talosctl -n 192.168.1.10 get machineconfig -o yaml | grep -A 5 "enable-admission-plugins"

# Check the API server pod spec for admission plugin flags
kubectl get pod -n kube-system kube-apiserver-talos-cp-1 -o yaml | grep admission
```

Kubernetes enables a set of default admission controllers. The exact list depends on the Kubernetes version, but it typically includes:

```text
# Default admission controllers (Kubernetes 1.29+)
CertificateApproval
CertificateSigning
CertificateSubjectRestriction
DefaultIngressClass
DefaultStorageClass
DefaultTolerationSeconds
LimitRanger
MutatingAdmissionWebhook
NamespaceLifecycle
NodeRestriction
PersistentVolumeClaimResize
PodSecurity
Priority
ResourceQuota
RuntimeClass
ServiceAccount
StorageObjectInUseProtection
TaintNodesByCondition
ValidatingAdmissionPolicy
ValidatingAdmissionWebhook
```

## Configuring Admission Controllers in Talos

Enable or disable specific admission controllers through the API server extra arguments:

```yaml
# admission-controllers.yaml
# Configure admission controllers on Talos Linux
cluster:
  apiServer:
    extraArgs:
      enable-admission-plugins: "NamespaceLifecycle,LimitRanger,ServiceAccount,DefaultStorageClass,DefaultTolerationSeconds,MutatingAdmissionWebhook,ValidatingAdmissionWebhook,ResourceQuota,PodSecurity,NodeRestriction,Priority"
```

Apply to all control plane nodes:

```bash
talosctl apply-config --nodes 192.168.1.10,192.168.1.11,192.168.1.12 \
  --patch @admission-controllers.yaml
```

## Configuring Pod Security Admission

Pod Security admission is the replacement for the deprecated PodSecurityPolicy. It enforces pod security standards at the namespace level using labels.

There are three security levels:

```text
# Pod Security Standards
privileged  - Unrestricted policy (no restrictions)
baseline    - Minimally restrictive (prevents known privilege escalations)
restricted  - Heavily restricted (follows current pod hardening best practices)
```

And three enforcement modes:

```text
# Enforcement modes
enforce - Violations reject the pod
audit   - Violations are logged but allowed
warn    - Violations trigger a warning but are allowed
```

### Setting Namespace-Level Policies

Apply security standards to namespaces using labels:

```yaml
# namespace-security.yaml
# Configure pod security standards for namespaces
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    # Enforce restricted policy - reject non-compliant pods
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    # Audit and warn for restricted violations
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    # Enforce baseline in staging
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/enforce-version: latest
    # Warn about restricted violations
    pod-security.kubernetes.io/warn: restricted
---
apiVersion: v1
kind: Namespace
metadata:
  name: kube-system
  labels:
    # System namespace needs privileged access
    pod-security.kubernetes.io/enforce: privileged
```

Apply the namespace configurations:

```bash
kubectl apply -f namespace-security.yaml
```

### Setting Cluster-Wide Defaults

Configure default Pod Security admission settings through the API server:

```yaml
# pod-security-defaults.yaml
# Set cluster-wide Pod Security admission defaults
cluster:
  apiServer:
    extraArgs:
      admission-control-config-file: /etc/kubernetes/admission/admission-config.yaml
    extraVolumes:
      - hostPath: /etc/kubernetes/admission
        mountPath: /etc/kubernetes/admission
        name: admission-config
        readOnly: true
machine:
  files:
    - content: |
        apiVersion: apiserver.config.k8s.io/v1
        kind: AdmissionConfiguration
        plugins:
          - name: PodSecurity
            configuration:
              apiVersion: pod-security.admission.config.k8s.io/v1
              kind: PodSecurityConfiguration
              defaults:
                enforce: baseline
                enforce-version: latest
                audit: restricted
                audit-version: latest
                warn: restricted
                warn-version: latest
              exemptions:
                usernames: []
                runtimeClasses: []
                namespaces:
                  - kube-system
                  - kube-node-lease
                  - kube-public
      permissions: 0644
      path: /etc/kubernetes/admission/admission-config.yaml
      op: create
```

## Setting Up Webhook Admission Controllers

External admission controllers use webhooks to process admission requests. They are deployed as regular Kubernetes services.

### Validating Webhook Example

```yaml
# validating-webhook.yaml
# Webhook that rejects pods without resource limits
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: resource-limits-validator
webhooks:
  - name: resource-limits.example.com
    admissionReviewVersions: ["v1"]
    sideEffects: None
    clientConfig:
      service:
        name: resource-validator
        namespace: admission-system
        path: /validate
      caBundle: BASE64_CA_CERT
    rules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE"]
        resources: ["pods"]
    failurePolicy: Fail
    timeoutSeconds: 10
    namespaceSelector:
      matchExpressions:
        - key: skip-validation
          operator: DoesNotExist
```

### Mutating Webhook Example

```yaml
# mutating-webhook.yaml
# Webhook that injects default labels into pods
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: label-injector
webhooks:
  - name: label-injector.example.com
    admissionReviewVersions: ["v1"]
    sideEffects: None
    clientConfig:
      service:
        name: label-injector
        namespace: admission-system
        path: /mutate
      caBundle: BASE64_CA_CERT
    rules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE"]
        resources: ["pods"]
    failurePolicy: Ignore
    timeoutSeconds: 5
    reinvocationPolicy: IfNeeded
```

## Deploying a Webhook Admission Controller

Here is a simple example of a validating webhook service:

```yaml
# admission-service.yaml
# Admission webhook service deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resource-validator
  namespace: admission-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: resource-validator
  template:
    metadata:
      labels:
        app: resource-validator
    spec:
      containers:
        - name: validator
          image: resource-validator:1.0
          ports:
            - containerPort: 8443
          volumeMounts:
            - name: tls
              mountPath: /etc/webhook/tls
              readOnly: true
      volumes:
        - name: tls
          secret:
            secretName: resource-validator-tls
---
apiVersion: v1
kind: Service
metadata:
  name: resource-validator
  namespace: admission-system
spec:
  ports:
    - port: 443
      targetPort: 8443
  selector:
    app: resource-validator
```

## Using LimitRanger

The LimitRanger admission controller enforces resource limits on pods that do not specify them:

```yaml
# limit-range.yaml
# Default resource limits for a namespace
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
    - default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: 2000m
        memory: 2Gi
      min:
        cpu: 50m
        memory: 64Mi
      type: Container
```

## Using ResourceQuota

The ResourceQuota admission controller enforces namespace-level resource limits:

```yaml
# resource-quota.yaml
# Namespace resource quota
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
  namespace: production
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "50"
    services: "20"
    persistentvolumeclaims: "10"
```

## Troubleshooting Admission Controller Issues

When pods are being rejected or modified unexpectedly:

```bash
# Check if a webhook is rejecting requests
kubectl get events --all-namespaces | grep -i "admission\|denied\|rejected"

# View webhook configurations
kubectl get validatingwebhookconfigurations
kubectl get mutatingwebhookconfigurations

# Check webhook service health
kubectl get endpoints -n admission-system resource-validator

# Test a dry-run to see if admission would reject
kubectl apply -f my-pod.yaml --dry-run=server -v=6

# Check API server logs for admission errors
talosctl -n 192.168.1.10 logs kube-apiserver | grep -i "admission\|webhook"
```

## Performance Considerations

Webhook admission controllers add latency to every API request that matches their rules. Keep these practices in mind:

```yaml
# Set appropriate timeouts
webhooks:
  - name: my-webhook.example.com
    timeoutSeconds: 5  # Keep low, default is 10
    failurePolicy: Ignore  # Use Ignore for non-critical webhooks

    # Use specific rules to minimize webhook calls
    rules:
      - apiGroups: ["apps"]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["deployments"]
        scope: Namespaced  # Don't match cluster-scoped resources

    # Exclude system namespaces
    namespaceSelector:
      matchExpressions:
        - key: kubernetes.io/metadata.name
          operator: NotIn
          values: ["kube-system", "kube-node-lease"]
```

Admission controllers on Talos Linux give you powerful tools for enforcing security policies and standards across your cluster. The combination of built-in admission controllers (configured through Talos machine config), Pod Security admission (configured through namespace labels), and webhook-based controllers (deployed as Kubernetes workloads) provides multiple layers of policy enforcement that work together to keep your cluster secure and well-governed.
