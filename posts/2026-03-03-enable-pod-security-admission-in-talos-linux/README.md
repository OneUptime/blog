# How to Enable Pod Security Admission in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Pod Security Admission, Kubernetes, Security, Admission Control

Description: A practical guide to enabling and configuring the Pod Security Admission controller in Talos Linux for enforcing security policies on workloads.

---

Pod Security Admission (PSA) is the built-in Kubernetes admission controller that enforces Pod Security Standards. It replaced the deprecated PodSecurityPolicy and is the recommended way to control what security contexts pods can use. On Talos Linux, PSA is available by default but needs to be configured to actually enforce policies. Without configuration, it operates in a permissive mode that allows everything.

This guide walks through enabling PSA, configuring it at the cluster level and namespace level, and handling the transition from no enforcement to production-grade security.

## What Pod Security Admission Does

PSA intercepts every pod creation request and checks it against the configured security standard for that namespace. It operates in three modes:

- **enforce**: Reject the pod if it violates the standard
- **warn**: Allow the pod but return a warning to the user
- **audit**: Allow the pod but log the violation

Each mode can target a different security level (Privileged, Baseline, or Restricted), giving you flexibility to be strict about some things while being lenient about others during migration.

## Checking Current PSA Status

Before making changes, check what is currently configured.

```bash
# Check if the PodSecurity admission plugin is enabled
talosctl -n 10.0.1.10 read /etc/kubernetes/manifests/kube-apiserver.yaml | \
  grep -A5 "admission"

# Check namespace labels for existing PSA configuration
kubectl get namespaces -L \
  pod-security.kubernetes.io/enforce,\
  pod-security.kubernetes.io/warn,\
  pod-security.kubernetes.io/audit
```

## Enabling PSA at the Cluster Level

Configure PSA through the Talos machine configuration. This sets defaults that apply to all namespaces unless overridden.

```yaml
# talos-config-psa.yaml
cluster:
  apiServer:
    admissionControl:
      - name: PodSecurity
        configuration:
          apiVersion: pod-security.admission.config.k8s.io/v1
          kind: PodSecurityConfiguration
          defaults:
            enforce: baseline
            enforce-version: v1.31
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

Apply this configuration to your control plane nodes:

```bash
# Apply to each control plane node
for cp in 10.0.1.10 10.0.1.11 10.0.1.12; do
  echo "Applying PSA config to $cp..."
  talosctl -n $cp apply-config --file talos-config-psa.yaml

  # Wait for the API server to restart
  sleep 30

  # Verify the API server is healthy
  talosctl -n $cp health
  kubectl get nodes
done
```

### Verify the Configuration

```bash
# Check that PSA is enforcing
# Try to create a privileged pod in a non-exempt namespace
kubectl run test-privileged \
  --image=alpine \
  --restart=Never \
  --overrides='{
    "spec": {
      "containers": [{
        "name": "test",
        "image": "alpine",
        "securityContext": {"privileged": true}
      }]
    }
  }' \
  -n default

# This should be rejected with a message about violating the baseline policy
```

## Namespace-Level Configuration

Override cluster defaults for specific namespaces using labels.

### Strict Production Namespace

```bash
kubectl create namespace production

kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/warn-version=latest \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/audit-version=latest
```

### System Namespace (Needs Privileges)

```bash
kubectl label namespace kube-system \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/enforce-version=latest

# Also for CNI namespaces
kubectl label namespace cilium \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/enforce-version=latest
```

### Development Namespace (Relaxed)

```bash
kubectl label namespace development \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/enforce-version=latest \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/warn-version=latest
```

## Working with PSA Exemptions

Sometimes specific workloads need exemptions from the enforced standards. You can exempt based on namespaces, usernames, or runtime classes.

### Namespace Exemptions

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
              - ingress-nginx
              - cert-manager
```

### Runtime Class Exemptions

For workloads using specific runtime classes (like kata containers or gVisor):

```yaml
exemptions:
  runtimeClasses:
    - kata-runtime
    - gvisor
```

### User Exemptions

For specific service accounts that need elevated privileges:

```yaml
exemptions:
  usernames:
    - system:serviceaccount:monitoring:prometheus-node-exporter
    - system:serviceaccount:storage:csi-driver
```

## Handling PSA Violations

When PSA blocks a pod, it returns an error message explaining the violation. Here is how to interpret and fix common violations.

### Violation: Privileged Container

```
Error: pods "my-pod" is forbidden: violates PodSecurity "baseline:latest":
  privileged (container "app" must not set securityContext.privileged=true)
```

Fix:

```yaml
# Remove privileged mode
containers:
  - name: app
    securityContext:
      privileged: false  # or just remove this field
```

### Violation: Host Namespace

```
Error: pods "my-pod" is forbidden: violates PodSecurity "baseline:latest":
  hostNetwork (must not set spec.hostNetwork=true)
```

Fix:

```yaml
# Remove host namespace usage
spec:
  hostNetwork: false  # or remove the field
  hostPID: false
  hostIPC: false
```

### Violation: Running as Root

```
Error: pods "my-pod" is forbidden: violates PodSecurity "restricted:latest":
  runAsNonRoot (pod or container must set securityContext.runAsNonRoot=true)
```

Fix:

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
  containers:
    - name: app
      securityContext:
        runAsNonRoot: true
        allowPrivilegeEscalation: false
```

### Violation: Capabilities

```
Error: pods "my-pod" is forbidden: violates PodSecurity "restricted:latest":
  unrestricted capabilities (container "app" must set securityContext.capabilities.drop=["ALL"])
```

Fix:

```yaml
containers:
  - name: app
    securityContext:
      capabilities:
        drop:
          - ALL
      # Add back only what you truly need
      # capabilities:
      #   add:
      #     - NET_BIND_SERVICE
```

## Gradual Migration Strategy

Moving from no enforcement to full enforcement should be done gradually.

### Phase 1: Audit Mode Only

Start by just logging violations without blocking anything.

```bash
# Set audit mode for all non-system namespaces
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  if [[ "$ns" != "kube-system" && "$ns" != "kube-public" && "$ns" != "kube-node-lease" ]]; then
    kubectl label namespace $ns \
      pod-security.kubernetes.io/audit=restricted \
      pod-security.kubernetes.io/audit-version=latest \
      --overwrite
  fi
done
```

Review the audit logs:

```bash
# Check API server logs for violations
talosctl -n 10.0.1.10 logs kube-apiserver | grep "pod-security.kubernetes.io/audit"
```

### Phase 2: Warning Mode

Add warnings so developers see violations in their kubectl output.

```bash
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  if [[ "$ns" != "kube-system" && "$ns" != "kube-public" && "$ns" != "kube-node-lease" ]]; then
    kubectl label namespace $ns \
      pod-security.kubernetes.io/warn=restricted \
      pod-security.kubernetes.io/warn-version=latest \
      --overwrite
  fi
done
```

### Phase 3: Baseline Enforcement

Enforce the Baseline standard, which blocks the most dangerous configurations.

```bash
for ns in production staging; do
  kubectl label namespace $ns \
    pod-security.kubernetes.io/enforce=baseline \
    pod-security.kubernetes.io/enforce-version=latest \
    --overwrite
done
```

### Phase 4: Restricted Enforcement

Once all workloads are compliant, enforce the Restricted standard.

```bash
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest \
  --overwrite
```

## Monitoring PSA Enforcement

Track PSA violations over time using Prometheus metrics.

```bash
# The API server exposes metrics about admission decisions
# Look for:
# apiserver_admission_controller_admission_duration_seconds
# apiserver_admission_webhook_rejection_count

# Query the API server metrics endpoint
kubectl get --raw /metrics | grep "admission"
```

Set up alerts for PSA rejections:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: psa-alerts
  namespace: monitoring
spec:
  groups:
    - name: pod-security
      rules:
        - alert: PodSecurityViolation
          expr: increase(apiserver_admission_controller_admission_duration_seconds_count{rejected="true", name="PodSecurity"}[5m]) > 0
          for: 1m
          labels:
            severity: warning
          annotations:
            summary: "Pod Security Admission is rejecting pods"
```

## Conclusion

Pod Security Admission is a straightforward way to enforce security policies on your Talos Linux cluster. Enable it through the machine configuration, set sensible cluster-wide defaults, and use namespace labels for fine-grained control. Migrate gradually from audit-only to full enforcement, fixing workloads as you go. The combination of PSA with Talos Linux's immutable OS creates a strong security boundary at both the host and workload levels.
