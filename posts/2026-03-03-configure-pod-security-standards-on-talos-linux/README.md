# How to Configure Pod Security Standards on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Pod Security Standards, Kubernetes, Security, Container Security

Description: Learn how to configure and enforce Kubernetes Pod Security Standards on Talos Linux clusters to control container privileges and security contexts.

---

Pod Security Standards define three levels of security for Kubernetes pods: Privileged, Baseline, and Restricted. They replaced the older PodSecurityPolicy (PSP) system and provide a standardized way to control what containers can and cannot do. On a Talos Linux cluster, configuring Pod Security Standards is an important hardening step that prevents containers from running with excessive privileges.

This guide covers what the standards are, how to configure them, and practical examples for production Talos Linux clusters.

## Understanding the Three Security Levels

### Privileged

The most permissive level. Places no restrictions on pods. This is appropriate only for system-level workloads that genuinely need full host access, like CNI plugins or storage drivers.

### Baseline

A minimally restrictive policy that prevents known privilege escalations. It blocks things like:

- HostProcess containers
- Host namespaces (hostNetwork, hostPID, hostIPC)
- Privileged containers
- Capabilities beyond the default set
- Certain volume types (hostPath)

This is a good starting point for most workloads.

### Restricted

The most restrictive policy. Follows current best practices for pod hardening:

- Everything in Baseline, plus:
- Must run as non-root
- Must drop ALL capabilities
- Seccomp profile must be set
- Cannot use certain volume types

This is the target for production workloads.

## How Pod Security Standards Are Enforced

Kubernetes uses Pod Security Admission (PSA) to enforce these standards. PSA operates at the namespace level using labels. Each namespace can have three modes:

- **enforce**: Reject pods that violate the standard
- **warn**: Allow pods but print a warning
- **audit**: Allow pods but log a violation

## Configuring Pod Security on Talos Linux

### Cluster-Wide Defaults

Configure default Pod Security Admission through the Talos machine configuration.

```yaml
# Machine configuration
cluster:
  apiServer:
    admissionControl:
      - name: PodSecurity
        configuration:
          apiVersion: pod-security.admission.config.k8s.io/v1
          kind: PodSecurityConfiguration
          defaults:
            enforce: baseline
            enforce-version: latest
            warn: restricted
            warn-version: latest
            audit: restricted
            audit-version: latest
          exemptions:
            namespaces:
              - kube-system
            runtimeClasses: []
            usernames: []
```

This configuration:

- **Enforces** the Baseline standard (rejects pods that violate it)
- **Warns** about Restricted standard violations (shows warnings but allows)
- **Audits** Restricted standard violations (logs them)
- **Exempts** the kube-system namespace (system pods need elevated privileges)

Apply the configuration:

```bash
talosctl -n 10.0.1.10 apply-config --file config-with-pss.yaml
```

### Per-Namespace Configuration

Even with cluster-wide defaults, you can override settings per namespace using labels.

```bash
# Set a namespace to enforce the Restricted standard
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/warn-version=latest \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/audit-version=latest

# Set a namespace to allow Privileged (for system workloads)
kubectl label namespace cni-plugins \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/enforce-version=latest
```

### Creating Namespace Templates

Create a standard set of namespaces with appropriate security levels.

```yaml
# namespace-templates.yaml

# Production - Restricted
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted

---
# Staging - Baseline with Restricted warnings
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted

---
# Development - Baseline
apiVersion: v1
kind: Namespace
metadata:
  name: development
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/warn: baseline
    pod-security.kubernetes.io/audit: baseline

---
# Monitoring - Baseline (some tools need host access)
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted
```

```bash
kubectl apply -f namespace-templates.yaml
```

## Writing Pods That Meet Each Standard

### Baseline-Compliant Pod

```yaml
# baseline-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: baseline-app
  namespace: staging
spec:
  containers:
    - name: app
      image: nginx:1.27
      ports:
        - containerPort: 8080
      # Baseline allows running as root
      # Baseline allows default capabilities
      # Just avoid hostNetwork, hostPID, privileged mode
```

### Restricted-Compliant Pod

```yaml
# restricted-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: restricted-app
  namespace: production
spec:
  securityContext:
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      image: nginx:1.27-unprivileged
      ports:
        - containerPort: 8080
      securityContext:
        allowPrivilegeEscalation: false
        runAsNonRoot: true
        runAsUser: 1000
        capabilities:
          drop:
            - ALL
        seccompProfile:
          type: RuntimeDefault
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 256Mi
```

### Restricted-Compliant Deployment

```yaml
# restricted-deployment.yaml
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
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: app
          image: myapp:latest
          ports:
            - containerPort: 8080
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: cache
              mountPath: /var/cache
      volumes:
        - name: tmp
          emptyDir: {}
        - name: cache
          emptyDir: {}
```

## Testing Pod Security Standards

### Dry-Run Testing

Before enforcing a standard, test your workloads against it.

```bash
# Test if a pod would be allowed under the Restricted standard
kubectl label namespace test-ns \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest \
  --dry-run=server

# Or use the warn mode to see violations without blocking
kubectl label namespace staging \
  pod-security.kubernetes.io/warn=restricted

# Try deploying and watch for warnings
kubectl apply -f my-deployment.yaml -n staging
# Warnings will appear in the output if violations exist
```

### Checking Violations

```bash
# See audit violations in API server logs
talosctl -n 10.0.1.10 logs kube-apiserver | grep "pod-security"

# Check warnings for existing workloads
kubectl get pods -n staging -o yaml | \
  kubectl apply --dry-run=server -f - 2>&1 | grep "Warning"
```

## Migrating Existing Workloads

If you have existing workloads that need to comply with stricter standards, follow this process:

### Step 1: Audit Current State

```bash
# Run a dry-run label change to see what would break
kubectl label --dry-run=server namespace production \
  pod-security.kubernetes.io/enforce=restricted

# Or enable warn mode first
kubectl label namespace production \
  pod-security.kubernetes.io/warn=restricted
```

### Step 2: Fix Violations

Common fixes for Restricted compliance:

```yaml
# Before (non-compliant)
spec:
  containers:
    - name: app
      image: myapp:latest

# After (Restricted compliant)
spec:
  securityContext:
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      image: myapp:latest
      securityContext:
        allowPrivilegeEscalation: false
        capabilities:
          drop:
            - ALL
        runAsNonRoot: true
```

### Step 3: Enforce Gradually

```bash
# Start with audit only
kubectl label namespace production \
  pod-security.kubernetes.io/audit=restricted

# Then add warnings
kubectl label namespace production \
  pod-security.kubernetes.io/warn=restricted

# Finally enforce
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted
```

## Exemptions for System Workloads

Some workloads legitimately need elevated privileges. Use exemptions in the cluster-wide configuration.

```yaml
cluster:
  apiServer:
    admissionControl:
      - name: PodSecurity
        configuration:
          apiVersion: pod-security.admission.config.k8s.io/v1
          kind: PodSecurityConfiguration
          defaults:
            enforce: baseline
          exemptions:
            namespaces:
              - kube-system
              - cilium
              - metallb-system
              - storage-system
            usernames:
              - system:serviceaccount:kube-system:*
```

## Conclusion

Pod Security Standards on Talos Linux provide a clean, standardized way to control container privileges. Start with Baseline enforcement across the cluster and Restricted warnings, then gradually tighten the standards as you update your workloads to comply. Use per-namespace labels for fine-grained control and exempt only those system namespaces that genuinely need elevated privileges. Combined with Talos Linux's immutable OS security, Pod Security Standards create a strong defense against container breakout attacks.
