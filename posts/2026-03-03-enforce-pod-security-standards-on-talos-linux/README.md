# How to Enforce Pod Security Standards on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Pod Security Standards, Kubernetes, Security, PSA

Description: Learn how to implement and enforce Pod Security Standards on Talos Linux using the built-in Pod Security Admission controller.

---

Pod Security Standards (PSS) define three levels of security for pods: Privileged, Baseline, and Restricted. These standards replaced the deprecated PodSecurityPolicy (PSP) in Kubernetes 1.25 and are enforced through the built-in Pod Security Admission (PSA) controller. On Talos Linux, where the operating system is already hardened, enforcing Pod Security Standards at the Kubernetes level adds another layer of defense to ensure workloads run with minimal privileges.

This guide covers how to configure and enforce Pod Security Standards on a Talos Linux cluster, from basic namespace-level settings to cluster-wide defaults.

## Understanding the Three Levels

The three Pod Security Standards levels are cumulative, with each stricter level including all restrictions from the previous one.

**Privileged**: Unrestricted. Allows all pod configurations. Meant for system-level workloads like CNI plugins and storage drivers that genuinely need elevated privileges.

**Baseline**: Prevents known privilege escalations. Blocks hostNetwork, hostPID, privileged containers, and other dangerous configurations. This is a reasonable starting point for most workloads.

**Restricted**: The most hardened level. Requires pods to run as non-root, with read-only root filesystems, drop all capabilities, and use specific seccomp profiles. This is the target for production workloads.

## Understanding PSA Modes

Each security level can be applied in three modes:

- **enforce**: Violations are rejected. Pods that do not comply cannot be created.
- **audit**: Violations are recorded in the audit log but allowed.
- **warn**: Violations trigger a warning to the user but are allowed.

You can combine modes. For example, enforce Baseline while warning about Restricted violations. This lets teams work toward stricter standards gradually.

## Namespace-Level Configuration

The simplest way to apply Pod Security Standards is through namespace labels.

```bash
# Apply Baseline enforcement with Restricted warnings
kubectl label namespace my-app \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/enforce-version=latest \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/warn-version=latest \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/audit-version=latest
```

Let us create a properly labeled namespace from scratch.

```yaml
# secure-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production-app
  labels:
    # Enforce Restricted standard
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    # Audit and warn on violations too
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
```

```bash
kubectl apply -f secure-namespace.yaml
```

## Testing Pod Security Enforcement

Let us test by trying to create pods with different security configurations.

```yaml
# privileged-pod.yaml - This will be REJECTED in a restricted namespace
apiVersion: v1
kind: Pod
metadata:
  name: privileged-test
  namespace: production-app
spec:
  containers:
    - name: nginx
      image: nginx:1.25
```

```bash
# This will fail because the restricted standard requires several security settings
kubectl apply -f privileged-pod.yaml
# Error: pods "privileged-test" is forbidden: violates PodSecurity "restricted:latest":
# allowPrivilegeEscalation != false, unrestricted capabilities, ...
```

Now create a pod that complies with the restricted standard.

```yaml
# restricted-pod.yaml - This will be ACCEPTED
apiVersion: v1
kind: Pod
metadata:
  name: restricted-test
  namespace: production-app
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: nginx
      image: nginx:1.25
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop:
            - ALL
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
        limits:
          cpu: 100m
          memory: 128Mi
      volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /var/cache/nginx
        - name: run
          mountPath: /var/run
  volumes:
    - name: tmp
      emptyDir: {}
    - name: cache
      emptyDir: {}
    - name: run
      emptyDir: {}
```

```bash
kubectl apply -f restricted-pod.yaml
# Pod created successfully
```

## Cluster-Wide Defaults with Talos

On Talos Linux, you can configure cluster-wide PSA defaults through the Talos machine configuration. This ensures every namespace gets a baseline level of protection even before namespace labels are applied.

```yaml
# psa-config-patch.yaml
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
            audit: restricted
            audit-version: latest
            warn: restricted
            warn-version: latest
          exemptions:
            usernames: []
            runtimeClasses: []
            namespaces:
              - kube-system
              - kube-public
              - kube-node-lease
```

Apply this to your Talos control plane nodes.

```bash
# Patch the machine configuration
talosctl machineconfig patch controlplane.yaml --patch @psa-config-patch.yaml --output controlplane-psa.yaml

# Apply to each control plane node
talosctl apply-config --nodes 10.0.0.10 --file controlplane-psa.yaml
talosctl apply-config --nodes 10.0.0.11 --file controlplane-psa.yaml
talosctl apply-config --nodes 10.0.0.12 --file controlplane-psa.yaml
```

## Exemptions

Some workloads legitimately need elevated privileges. Configure exemptions carefully.

```yaml
# Exemptions in the PodSecurityConfiguration
exemptions:
  # Exempt specific namespaces
  namespaces:
    - kube-system
    - monitoring
    - ingress-nginx

  # Exempt specific users (service accounts)
  usernames:
    - "system:serviceaccount:kube-system:*"

  # Exempt specific runtime classes
  runtimeClasses:
    - kata-containers
```

For individual namespaces that need a lower security level, override with labels.

```bash
# Allow privileged pods in the monitoring namespace
kubectl label namespace monitoring \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/warn=baseline \
  --overwrite
```

## Gradual Migration Strategy

Moving an existing cluster to Pod Security Standards should be done incrementally.

### Step 1: Audit Current State

```bash
# Apply audit and warn labels to all namespaces
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  kubectl label namespace "$ns" \
    pod-security.kubernetes.io/audit=restricted \
    pod-security.kubernetes.io/warn=restricted \
    --overwrite 2>/dev/null
done
```

### Step 2: Review Violations

```bash
# Check the audit log for violations
# On Talos, check the API server logs
talosctl logs kube-apiserver --nodes 10.0.0.10 | grep "PodSecurity"
```

### Step 3: Fix Workloads

Update your deployments to comply with the target security level.

```yaml
# Updated deployment for restricted compliance
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production-app
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
      securityContext:
        runAsNonRoot: true
        runAsUser: 65534
        fsGroup: 65534
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: app
          image: my-app:v1.2.3
          ports:
            - containerPort: 8080
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi
```

### Step 4: Enforce Baseline, Warn Restricted

```bash
kubectl label namespace production-app \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/warn=restricted \
  --overwrite
```

### Step 5: Enforce Restricted

Once all workloads are compliant:

```bash
kubectl label namespace production-app \
  pod-security.kubernetes.io/enforce=restricted \
  --overwrite
```

## Common Restricted Standard Requirements

Here is a quick reference for what the restricted standard requires:

```yaml
# Pod-level security context
spec:
  securityContext:
    runAsNonRoot: true          # Must run as non-root user
    seccompProfile:
      type: RuntimeDefault      # Must use RuntimeDefault or Localhost seccomp

  containers:
    - securityContext:
        allowPrivilegeEscalation: false  # Must be false
        capabilities:
          drop:
            - ALL                # Must drop ALL capabilities
        readOnlyRootFilesystem: true     # Recommended but not required by PSS
        runAsNonRoot: true               # Container-level confirmation
```

Fields that are NOT allowed under the restricted standard:
- `hostNetwork: true`
- `hostPID: true`
- `hostIPC: true`
- `privileged: true`
- `hostPath` volumes
- Container port `hostPort`
- Adding any capabilities

## Monitoring Compliance

Use Kyverno or OPA Gatekeeper alongside PSA for richer reporting. PSA provides enforcement, while policy engines provide detailed compliance reports.

```bash
# Quick compliance check using dry-run
kubectl auth can-i create pods \
  --namespace production-app \
  --as system:serviceaccount:production-app:default
```

## Wrapping Up

Pod Security Standards on Talos Linux provide a built-in, zero-dependency way to restrict what pods can do in your cluster. Combined with Talos's immutable OS, you get security from the kernel up through the Kubernetes API. Start by auditing your current workloads, fix violations incrementally, and work toward enforcing the restricted standard across all production namespaces. The gradual approach using warn and audit modes before enforce mode makes the migration manageable without disrupting running services.
