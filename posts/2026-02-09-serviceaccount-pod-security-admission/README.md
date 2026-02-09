# How to Use ServiceAccount with Pod Security Admission

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, PSA

Description: Configure ServiceAccounts with Pod Security Admission standards to enforce security policies and best practices for Kubernetes workloads at the namespace level.

---

Pod Security Admission (PSA) is a built-in admission controller that enforces Pod Security Standards. Understanding how ServiceAccounts interact with PSA helps you implement comprehensive security policies that cover both identity and runtime security for your Kubernetes workloads.

## Understanding Pod Security Admission

Pod Security Admission replaced Pod Security Policies as the standard way to enforce pod security. It operates at the namespace level and enforces three security profiles: privileged, baseline, and restricted. Each profile defines increasingly strict security requirements for pods.

ServiceAccounts play a role in PSA enforcement. The restricted profile discourages (but doesn't require) automatic ServiceAccount token mounting. It requires dropping all capabilities and running as non-root. Understanding these interactions ensures your ServiceAccount configurations align with security policies.

PSA operates in three modes: enforce blocks non-compliant pods, audit logs violations without blocking, and warn displays warnings for non-compliant pods. You can apply different modes simultaneously to gradually introduce stricter policies.

## Configuring Namespaces with Pod Security Standards

Apply Pod Security Standards at the namespace level:

```yaml
# production-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

The restricted standard is the most secure:

```bash
kubectl apply -f production-namespace.yaml

# Verify the configuration
kubectl get namespace production -o yaml
```

## ServiceAccount Configuration for Restricted Standard

Create ServiceAccounts that comply with the restricted standard:

```yaml
# restricted-serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: restricted-app
  namespace: production
automountServiceAccountToken: false  # Recommended by restricted profile
```

Deploy a pod that meets restricted requirements:

```yaml
# restricted-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
  namespace: production
spec:
  serviceAccountName: restricted-app
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      allowPrivilegeEscalation: false
      runAsNonRoot: true
      runAsUser: 1000
      capabilities:
        drop:
        - ALL
      seccompProfile:
        type: RuntimeDefault
```

This pod complies with all restricted requirements.

## Baseline Standard Configuration

For less strict requirements, use the baseline standard:

```yaml
# staging-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/warn: baseline
```

Baseline allows some additional capabilities:

```yaml
# baseline-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: staging-app
  namespace: staging
spec:
  serviceAccountName: staging-app
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      allowPrivilegeEscalation: false
      runAsNonRoot: true
```

Baseline is more permissive than restricted but still enforces basic security.

## Handling ServiceAccount Token Mounting with PSA

The restricted profile encourages disabling automatic token mounting:

```yaml
# token-mounting-examples.yaml
# Compliant with restricted - no token mounted
apiVersion: v1
kind: Pod
metadata:
  name: no-token-app
  namespace: production
spec:
  serviceAccountName: restricted-app
  automountServiceAccountToken: false
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop: ["ALL"]
---
# Also compliant - token explicitly needed
apiVersion: v1
kind: Pod
metadata:
  name: api-client-app
  namespace: production
spec:
  serviceAccountName: api-client-app
  automountServiceAccountToken: true  # Explicitly enabled
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
  containers:
  - name: app
    image: api-client:latest
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop: ["ALL"]
```

Both configurations work with restricted, but the first is preferred when API access isn't needed.

## Progressive Enforcement Strategy

Start with audit mode, then move to enforce:

```yaml
# progressive-enforcement.yaml
# Stage 1: Audit only
apiVersion: v1
kind: Namespace
metadata:
  name: app-namespace
  labels:
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
# Stage 2: Add baseline enforcement
apiVersion: v1
kind: Namespace
metadata:
  name: app-namespace
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
# Stage 3: Full restricted enforcement
apiVersion: v1
kind: Namespace
metadata:
  name: app-namespace
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

This gradual approach helps identify issues before blocking deployments.

## Deployment Configuration for PSA Compliance

Create deployments that comply with restricted standards:

```yaml
# psa-compliant-deployment.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: web-app
  namespace: production
automountServiceAccountToken: false
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      serviceAccountName: web-app
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: app
        image: web-app:latest
        ports:
        - containerPort: 8080
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          runAsUser: 1000
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
          seccompProfile:
            type: RuntimeDefault
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /app/cache
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
```

This deployment meets all restricted requirements.

## StatefulSet Configuration

StatefulSets also need PSA compliance:

```yaml
# psa-statefulset.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: database
  namespace: production
automountServiceAccountToken: false
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
  namespace: production
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      serviceAccountName: database
      securityContext:
        runAsNonRoot: true
        runAsUser: 999
        fsGroup: 999
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: postgres
        image: postgres:14
        ports:
        - containerPort: 5432
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          runAsUser: 999
          capabilities:
            drop:
            - ALL
          seccompProfile:
            type: RuntimeDefault
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

## Handling Legacy Workloads

For workloads that can't meet restricted requirements:

```yaml
# exemption-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: legacy-apps
  labels:
    # Enforce baseline, but audit against restricted
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

This allows legacy apps to run while tracking compliance gaps.

## Using Pod Security Standards with Admission Webhooks

Combine PSA with custom admission logic:

```yaml
# validating-webhook.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: pod-security-validator
webhooks:
- name: validate.pod.security
  clientConfig:
    service:
      name: security-webhook
      namespace: webhook-system
      path: /validate
    caBundle: <base64-ca-cert>
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  failurePolicy: Fail
  sideEffects: None
  admissionReviewVersions: ["v1"]
```

The webhook can enforce additional ServiceAccount requirements beyond PSA.

## Monitoring PSA Violations

Track PSA audit events:

```bash
# Query for PSA warnings
kubectl get events -A | grep "pod-security"

# Check specific namespace violations
kubectl get events -n production --field-selector reason=PodSecurity

# View audit logs
kubectl logs -n kube-system -l component=kube-apiserver | \
  grep "pod-security-webhook"
```

Set up alerts for violations:

```yaml
# prometheus-alert.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: psa-violations
spec:
  groups:
  - name: pod-security
    rules:
    - alert: PSAViolation
      expr: increase(apiserver_admission_webhook_admission_duration_seconds_count{name="pod-security-webhook",rejected="true"}[5m]) > 0
      annotations:
        summary: "Pod Security Admission violations detected"
```

## Validating PSA Compliance

Test pods against PSA standards:

```bash
#!/bin/bash
# validate-psa-compliance.sh

NAMESPACE="production"
STANDARD="restricted"

# Try to create a test pod
kubectl run test-pod \
  --image=nginx:latest \
  --dry-run=server \
  --namespace=$NAMESPACE

# Check if it would be admitted
if [ $? -eq 0 ]; then
    echo "Pod would be admitted under $STANDARD standard"
else
    echo "Pod violates $STANDARD standard"
fi

# Clean up
kubectl delete pod test-pod -n $NAMESPACE --ignore-not-found
```

## Creating Policy Documentation

Document your PSA policies:

```yaml
# policy-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: security-policy
  namespace: kube-system
data:
  policy.md: |
    # Pod Security Admission Policy

    ## Namespaces
    - production: restricted (enforce)
    - staging: baseline (enforce), restricted (audit)
    - development: privileged (warn only)

    ## ServiceAccount Requirements
    - Must disable automountServiceAccountToken unless API access needed
    - Must use dedicated ServiceAccounts (no 'default')
    - Must have appropriate RBAC bindings

    ## Container Requirements (Restricted)
    - runAsNonRoot: true
    - allowPrivilegeEscalation: false
    - capabilities: drop ALL
    - seccompProfile: RuntimeDefault

    ## Exemptions
    - system-namespaces: kube-system, kube-public
    - monitoring: prometheus, grafana operators
```

## Troubleshooting PSA Issues

Common issues and solutions:

```bash
# Check namespace PSA labels
kubectl get namespace production -o jsonpath='{.metadata.labels}'

# View pod events for PSA errors
kubectl describe pod pod-name -n production | grep -A 10 Events

# Test pod against PSA
kubectl auth can-i create pods \
  --namespace=production \
  --as=system:serviceaccount:production:restricted-app

# Dry-run to check compliance
kubectl apply -f pod.yaml --dry-run=server

# Common errors:
# - "pod would violate PodSecurity restricted:latest"
# - "allowPrivilegeEscalation != false"
# - "unrestricted capabilities"
# - "running as root"
```

## Best Practices

Start with audit mode to identify violations. Use restricted standard for production workloads. Disable automatic token mounting when not needed. Run containers as non-root users. Drop all capabilities unless specifically required. Use seccomp RuntimeDefault profile. Implement readOnlyRootFilesystem when possible. Document exemptions and their justification.

Create ServiceAccount templates that comply with your target security standard:

```yaml
# template-restricted-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: REPLACE_WITH_APP_NAME
  namespace: production
  labels:
    security.standard: restricted
automountServiceAccountToken: false
```

## Conclusion

Pod Security Admission provides built-in security policy enforcement for Kubernetes. By configuring ServiceAccounts to comply with Pod Security Standards, you create a cohesive security posture that covers both identity and runtime security. Use the restricted standard for production workloads, disable automatic token mounting when API access isn't needed, and implement proper container security contexts. Combine PSA with RBAC and network policies for defense in depth. Start with audit mode, address violations, then move to enforcement for a smooth transition to stronger security policies.
