# How to Fix 'values merge failed' Error in Flux CD HelmRelease

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, HelmRelease, Helm, Kubernetes, Troubleshooting, GitOps, Values Merge

Description: A step-by-step guide to diagnosing and resolving the 'values merge failed' error in Flux CD HelmRelease, covering values syntax issues, ConfigMap/Secret references, and schema validation.

---

## Introduction

The "values merge failed" error occurs when Flux CD's helm-controller cannot merge the values provided in a HelmRelease resource. This can happen due to YAML syntax errors in inline values, broken references to ConfigMaps or Secrets used in `valuesFrom`, or values that fail Helm chart schema validation.

This guide walks through each scenario with practical examples and fixes.

## Understanding the Error

When a values merge fails, your HelmRelease will show a status like this:

```bash
# Check the HelmRelease status
kubectl get helmrelease -n my-namespace my-release -o yaml
```

```yaml
status:
  conditions:
    - type: Ready
      status: "False"
      reason: ValuesError
      message: 'values merge failed: unable to merge values from "my-namespace/my-config"'
```

## Common Cause 1: YAML Syntax Errors in Inline Values

The most common cause is a YAML formatting issue within the `spec.values` block of the HelmRelease.

### Example of Incorrect Configuration

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  values:
    # Wrong: inconsistent indentation causes parse errors
    replicaCount: 3
    image:
      repository: my-app
       tag: "v1.2.3"  # Extra space causes YAML parse error
    resources:
      limits:
      cpu: "500m"      # Missing indentation under limits
      memory: "256Mi"
```

### Fix: Correct the YAML Indentation

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  values:
    # Fixed: proper YAML indentation throughout
    replicaCount: 3
    image:
      repository: my-app
      tag: "v1.2.3"
    resources:
      limits:
        cpu: "500m"
        memory: "256Mi"
```

### Validating YAML Locally

```bash
# Validate your YAML file before committing
yamllint helmrelease.yaml

# Or use kubectl dry-run to validate the resource
kubectl apply --dry-run=client -f helmrelease.yaml

# You can also use yq to check YAML parsing
yq eval '.' helmrelease.yaml
```

## Common Cause 2: Broken valuesFrom ConfigMap Reference

When using `valuesFrom` to reference a ConfigMap, the merge will fail if the ConfigMap does not exist, is in the wrong namespace, or contains invalid YAML data.

### Diagnosing the Issue

```bash
# Check if the ConfigMap exists in the correct namespace
kubectl get configmap -n my-namespace my-values-config

# Inspect the ConfigMap data to ensure it contains valid YAML
kubectl get configmap -n my-namespace my-values-config -o yaml
```

### Example of Incorrect Configuration

```yaml
---
# ConfigMap with invalid YAML in the values key
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-values-config
  namespace: default
data:
  # Wrong: the YAML data contains a tab character which breaks parsing
  values.yaml: |
    replicaCount: 3
    	image:
      repository: my-app
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  valuesFrom:
    - kind: ConfigMap
      name: my-values-config
      # This key must match a key in the ConfigMap data
      valuesKey: values.yaml
```

### Fix: Correct the ConfigMap Data

```yaml
---
# Fixed: ConfigMap with properly formatted YAML
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-values-config
  namespace: default
data:
  values.yaml: |
    replicaCount: 3
    image:
      repository: my-app
      tag: "v1.2.3"
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  valuesFrom:
    - kind: ConfigMap
      name: my-values-config
      valuesKey: values.yaml
```

## Common Cause 3: Broken valuesFrom Secret Reference

Similar to ConfigMaps, Secrets referenced in `valuesFrom` must exist and contain valid base64-encoded YAML data.

### Diagnosing the Issue

```bash
# Check if the Secret exists
kubectl get secret -n my-namespace my-values-secret

# Decode and inspect the Secret data
kubectl get secret -n my-namespace my-values-secret -o jsonpath='{.data.values\.yaml}' | base64 -d
```

### Example of Correct Secret-Based Configuration

```yaml
---
# Create the secret with valid YAML values
apiVersion: v1
kind: Secret
metadata:
  name: my-values-secret
  namespace: default
type: Opaque
stringData:
  # Use stringData for human-readable YAML input
  values.yaml: |
    database:
      host: db.example.com
      port: 5432
      username: admin
      password: supersecretpassword
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  valuesFrom:
    - kind: Secret
      name: my-values-secret
      valuesKey: values.yaml
```

## Common Cause 4: Values Failing Schema Validation

Many Helm charts include a `values.schema.json` file that validates the provided values. If your values do not conform to the schema, the merge will fail.

### Diagnosing the Issue

```bash
# Check helm-controller logs for schema validation errors
kubectl logs -n flux-system deploy/helm-controller | grep "schema"

# Download the chart locally and inspect its schema
helm pull my-repo/my-chart --untar
cat my-chart/values.schema.json
```

### Example of Schema Violation

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  values:
    # Wrong: schema expects replicaCount to be an integer, not a string
    replicaCount: "three"
    # Wrong: schema expects service.port to be a number
    service:
      type: ClusterIP
      port: "eighty"
```

### Fix: Match the Schema Requirements

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  values:
    # Fixed: use correct types that match the chart schema
    replicaCount: 3
    service:
      type: ClusterIP
      port: 80
```

## Common Cause 5: Conflicting Values from Multiple Sources

When combining inline `values` with `valuesFrom`, conflicts can arise if the same keys are defined in multiple places with incompatible types.

### Understanding Merge Order

Flux merges values in this order (last wins):

1. Chart default values
2. `valuesFrom` entries (in order they appear)
3. Inline `values` block

### Example of Proper Multi-Source Values

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  # valuesFrom is applied first, in order
  valuesFrom:
    # Base configuration from a ConfigMap
    - kind: ConfigMap
      name: base-values
      valuesKey: values.yaml
    # Secrets override base configuration
    - kind: Secret
      name: secret-values
      valuesKey: values.yaml
      # Optional: make the reference optional so it does not fail if missing
      optional: true
  # Inline values override everything from valuesFrom
  values:
    replicaCount: 3
```

## Debugging Workflow

```bash
# Step 1: Get detailed error message from HelmRelease status
kubectl describe helmrelease -n my-namespace my-release

# Step 2: Check helm-controller logs for merge errors
kubectl logs -n flux-system deploy/helm-controller --tail=50 | grep -i "values"

# Step 3: Verify all referenced ConfigMaps exist
kubectl get configmap -n my-namespace

# Step 4: Verify all referenced Secrets exist
kubectl get secret -n my-namespace

# Step 5: Validate values locally using helm template
helm template my-release my-repo/my-chart -f values.yaml

# Step 6: Force reconciliation after fixing
flux reconcile helmrelease my-release -n my-namespace
```

## Using the Optional Flag

If you want to prevent a missing ConfigMap or Secret from causing a failure, use the `optional` flag:

```yaml
spec:
  valuesFrom:
    - kind: ConfigMap
      name: maybe-exists
      valuesKey: values.yaml
      # Setting optional to true means Flux will not fail if this
      # ConfigMap does not exist
      optional: true
    - kind: Secret
      name: maybe-exists-secret
      valuesKey: values.yaml
      optional: true
```

## Targeting a Specific Key in a ConfigMap

You can also specify a `targetPath` to place the value at a specific path in the values tree:

```yaml
spec:
  valuesFrom:
    - kind: Secret
      name: db-credentials
      valuesKey: password
      # This places the Secret value at .Values.database.password
      targetPath: database.password
```

## Conclusion

The "values merge failed" error in Flux CD typically stems from YAML syntax errors, missing or misconfigured ConfigMap/Secret references, schema validation failures, or type conflicts between multiple value sources. Use the debugging workflow above to systematically identify the root cause. Always validate your YAML locally before committing, use the `optional` flag for non-critical value sources, and pay attention to the merge order when combining multiple value sources.
