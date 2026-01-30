# How to Build Kyverno Policy Mutation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kyverno, Kubernetes, Policy, Security

Description: Create Kyverno mutation policies to automatically modify Kubernetes resources with labels, annotations, sidecars, and default values.

---

Kyverno is a policy engine designed specifically for Kubernetes. Unlike Open Policy Agent (OPA) which uses Rego, Kyverno policies are written in plain YAML. This makes them accessible to anyone familiar with Kubernetes manifests. Mutation policies automatically modify resources as they are created or updated, enforcing standards without requiring developers to remember every detail.

## Prerequisites

Install Kyverno using Helm:

```bash
helm repo add kyverno https://kyverno.github.io/kyverno/
helm repo update
helm install kyverno kyverno/kyverno -n kyverno --create-namespace
```

Verify the installation:

```bash
kubectl get pods -n kyverno
```

## Understanding Mutation Rules

Mutation policies intercept Kubernetes API requests and modify resources before they are persisted. Kyverno supports three mutation methods:

| Method | Use Case | Complexity |
|--------|----------|------------|
| patchStrategicMerge | Add or modify fields using Kubernetes strategic merge | Low |
| patchesJson6902 | RFC 6902 JSON patch operations | Medium |
| foreach | Iterate over arrays and apply mutations | Medium-High |

Start with patchStrategicMerge for simple additions, move to patchesJson6902 when you need precise control, and use foreach when dealing with arrays.

## Basic Mutation with patchStrategicMerge

The strategic merge patch works like kubectl apply. It merges your patch with the existing resource.

### Adding Default Labels

This policy adds standard labels to all pods that lack them:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-default-labels
spec:
  rules:
    - name: add-team-label
      match:
        any:
          - resources:
              kinds:
                - Pod
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              # Add label only if not present
              +(team): platform
              +(managed-by): kyverno
```

The `+()` syntax means "add if not present" and will not overwrite existing labels.

### Setting Default Resource Requests

Pods without resource requests cause scheduling problems. This policy sets sensible defaults:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-default-resources
spec:
  rules:
    - name: set-resource-defaults
      match:
        any:
          - resources:
              kinds:
                - Pod
      mutate:
        patchStrategicMerge:
          spec:
            containers:
              - (name): "*"
                resources:
                  requests:
                    +(memory): "64Mi"
                    +(cpu): "100m"
                  limits:
                    +(memory): "128Mi"
                    +(cpu): "200m"
```

## Precise Control with patchesJson6902

JSON Patch gives you surgical control. Each operation specifies exactly what to do.

| Operation | Description | Example |
|-----------|-------------|---------|
| add | Insert value at path | Add sidecar to containers array |
| remove | Delete value at path | Remove a specific annotation |
| replace | Overwrite value at path | Change image registry |
| copy | Duplicate value to new path | Copy label to annotation |
| move | Relocate value | Move annotation to label |

### Injecting a Sidecar Container

This policy injects a logging sidecar into every deployment:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: inject-logging-sidecar
spec:
  rules:
    - name: add-fluentbit-sidecar
      match:
        any:
          - resources:
              kinds:
                - Deployment
              namespaces:
                - production
                - staging
      exclude:
        any:
          - resources:
              selector:
                matchLabels:
                  sidecar.logging/injected: "true"
      mutate:
        patchesJson6902: |-
          - op: add
            path: /spec/template/spec/containers/-
            value:
              name: fluentbit
              image: fluent/fluent-bit:2.2
              resources:
                requests:
                  memory: "32Mi"
                  cpu: "10m"
              volumeMounts:
                - name: varlog
                  mountPath: /var/log
          - op: add
            path: /spec/template/spec/volumes/-
            value:
              name: varlog
              emptyDir: {}
          - op: add
            path: /spec/template/metadata/labels/sidecar.logging~1injected
            value: "true"
```

Note the `~1` escape sequence. JSON Pointer uses `~1` to represent `/` in keys.

## Conditional Mutations

Real-world policies need conditions. Only mutate when certain criteria are met.

### Using Preconditions

Preconditions evaluate before mutation. If they fail, the mutation is skipped. This policy adds node affinity only for GPU workloads:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-gpu-affinity
spec:
  rules:
    - name: schedule-on-gpu-nodes
      match:
        any:
          - resources:
              kinds:
                - Pod
      preconditions:
        all:
          - key: "{{ request.object.spec.containers[0].resources.limits.nvidia\\.com/gpu || '' }}"
            operator: GreaterThan
            value: "0"
      mutate:
        patchStrategicMerge:
          spec:
            affinity:
              nodeAffinity:
                requiredDuringSchedulingIgnoredDuringExecution:
                  nodeSelectorTerms:
                    - matchExpressions:
                        - key: nvidia.com/gpu
                          operator: Exists
            tolerations:
              - key: nvidia.com/gpu
                operator: Exists
                effect: NoSchedule
```

### Conditional Based on Namespace Labels

Mutate differently based on environment:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: environment-specific-config
spec:
  rules:
    - name: production-settings
      match:
        any:
          - resources:
              kinds:
                - Deployment
              namespaceSelector:
                matchLabels:
                  environment: production
      mutate:
        patchStrategicMerge:
          spec:
            replicas: 3
            template:
              spec:
                containers:
                  - (name): "*"
                    resources:
                      requests:
                        memory: "256Mi"
                        cpu: "250m"
```

## Foreach Mutations

When you need to iterate over arrays, foreach is your tool. It lets you apply mutations to each element.

### Rewriting All Container Images

Replace the registry for every container in a pod:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: rewrite-container-images
spec:
  rules:
    - name: replace-registry
      match:
        any:
          - resources:
              kinds:
                - Pod
      mutate:
        foreach:
          - list: "request.object.spec.containers"
            patchStrategicMerge:
              spec:
                containers:
                  - name: "{{ element.name }}"
                    image: "registry.internal.company.com/{{ images.containers.{{element.name}}.path }}:{{ images.containers.{{element.name}}.tag }}"
```

### Iterating Over Init Containers

Apply mutations to both regular and init containers:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: mutate-all-containers
spec:
  rules:
    - name: add-security-to-containers
      match:
        any:
          - resources:
              kinds:
                - Pod
      mutate:
        foreach:
          - list: "request.object.spec.containers"
            patchStrategicMerge:
              spec:
                containers:
                  - name: "{{ element.name }}"
                    securityContext:
                      allowPrivilegeEscalation: false
                      readOnlyRootFilesystem: true
                      capabilities:
                        drop:
                          - ALL
          - list: "request.object.spec.initContainers || []"
            patchStrategicMerge:
              spec:
                initContainers:
                  - name: "{{ element.name }}"
                    securityContext:
                      allowPrivilegeEscalation: false
                      capabilities:
                        drop:
                          - ALL
```

## Context Variables

Context variables let you pull in external data for mutations. You can fetch from ConfigMaps, the Kubernetes API, or external services.

### Loading Values from ConfigMaps

Store configuration externally and reference it in policies:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mutation-config
  namespace: kyverno
data:
  defaultRegistry: "registry.internal.company.com"
  defaultTeam: "platform-engineering"
---
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: use-configmap-values
spec:
  rules:
    - name: apply-config-from-configmap
      match:
        any:
          - resources:
              kinds:
                - Deployment
      context:
        - name: config
          configMap:
            name: mutation-config
            namespace: kyverno
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              +(team): "{{ config.data.defaultTeam }}"
```

### Querying the Kubernetes API

Fetch data from other resources:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-namespace-owner
spec:
  rules:
    - name: copy-namespace-labels
      match:
        any:
          - resources:
              kinds:
                - Pod
      context:
        - name: namespaceData
          apiCall:
            urlPath: "/api/v1/namespaces/{{ request.namespace }}"
            jmesPath: "metadata.labels"
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              +(cost-center): "{{ namespaceData.\"cost-center\" || 'unknown' }}"
              +(team-owner): "{{ namespaceData.\"team-owner\" || 'platform' }}"
```

## Testing Mutations

Testing is critical. Kyverno provides a CLI tool for policy testing.

### Install Kyverno CLI

```bash
# macOS
brew install kyverno

# Linux
curl -LO https://github.com/kyverno/kyverno/releases/download/v1.11.0/kyverno-cli_v1.11.0_linux_x86_64.tar.gz
tar -xvf kyverno-cli_v1.11.0_linux_x86_64.tar.gz
sudo mv kyverno /usr/local/bin/
```

### Run Policy Tests

```bash
# Apply policy and see the result
kyverno apply policy.yaml --resource test-deployment.yaml

# Get detailed output
kyverno apply policy.yaml --resource test-deployment.yaml -o yaml

# Test against live resources
kubectl get deployments -A -o yaml | kyverno apply policy.yaml --resource -
```

### Writing Test Cases

Create structured tests with expected results:

```yaml
# kyverno-test.yaml
name: mutation-tests
policies:
  - add-default-labels.yaml
resources:
  - test-deployment.yaml
results:
  - policy: add-default-labels
    rule: add-team-label
    resource: test-app
    kind: Deployment
    patchedResource: expected-deployment.yaml
    result: pass
```

Run the test suite:

```bash
kyverno test . --detailed-results
```

## Debugging Mutations

When mutations do not work as expected, here is how to troubleshoot.

### Check Policy Status

```bash
kubectl get clusterpolicies
kubectl describe clusterpolicy add-default-labels
```

### View Admission Controller Logs

```bash
kubectl logs -n kyverno -l app.kubernetes.io/component=admission-controller -f
```

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Mutation not applied | Policy not matching | Check match conditions and resource kinds |
| Partial mutation | Anchor syntax wrong | Verify strategic merge anchors |
| Policy error | Invalid YAML | Use kyverno apply to validate offline |
| Sidecar not injected | Index out of range | Use foreach instead of fixed index |
| Context variable empty | API call failed | Check RBAC permissions for Kyverno |

### RBAC for Context API Calls

If using API calls in context, ensure Kyverno has permissions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kyverno-api-access
rules:
  - apiGroups: [""]
    resources: ["namespaces", "configmaps"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kyverno-api-access-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kyverno-api-access
subjects:
  - kind: ServiceAccount
    name: kyverno-admission-controller
    namespace: kyverno
```

## Production Best Practices

### Use Audit Mode First

Deploy policies in audit mode before enforcing:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-default-labels
spec:
  validationFailureAction: Audit
  background: true
  rules:
    # ... rules here
```

### Exclude System Namespaces

Prevent mutations from breaking cluster components:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-default-labels
spec:
  rules:
    - name: add-team-label
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kube-public
                - kyverno
```

## Complete Example: Production-Ready Mutation Policy

Here is a comprehensive policy that combines multiple mutation techniques:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: production-pod-standards
  annotations:
    policies.kyverno.io/title: Production Pod Standards
    policies.kyverno.io/category: Best Practices
    app.kubernetes.io/version: "2.0.0"
spec:
  validationFailureAction: Audit
  background: true
  rules:
    - name: add-standard-labels
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kyverno
      context:
        - name: nsLabels
          apiCall:
            urlPath: "/api/v1/namespaces/{{ request.namespace }}"
            jmesPath: "metadata.labels"
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              +(environment): "{{ nsLabels.environment || 'development' }}"
              +(managed-by): kyverno

    - name: set-resource-defaults
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
      mutate:
        foreach:
          - list: "request.object.spec.containers"
            patchStrategicMerge:
              spec:
                containers:
                  - name: "{{ element.name }}"
                    resources:
                      requests:
                        +(memory): "64Mi"
                        +(cpu): "50m"
                      limits:
                        +(memory): "256Mi"
                        +(cpu): "500m"

    - name: add-security-context
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
      mutate:
        patchStrategicMerge:
          spec:
            securityContext:
              +(runAsNonRoot): true
              +(seccompProfile):
                type: RuntimeDefault
            containers:
              - (name): "*"
                securityContext:
                  +(allowPrivilegeEscalation): false
                  +(readOnlyRootFilesystem): true
                  +(capabilities):
                    drop:
                      - ALL
```

---

Kyverno mutation policies reduce configuration drift and enforce standards automatically. Start simple with patchStrategicMerge for labels and annotations. Progress to patchesJson6902 when you need precision. Use foreach for array operations. Always test in audit mode before enforcing, and monitor policy performance in production.
