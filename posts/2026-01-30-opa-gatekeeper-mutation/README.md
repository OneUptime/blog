# How to Create OPA Gatekeeper Mutation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OPA, Gatekeeper, Kubernetes, Mutation

Description: Learn how to use OPA Gatekeeper mutation policies to automatically modify Kubernetes resources during admission.

---

OPA Gatekeeper is known for validating Kubernetes resources, but its mutation feature is equally powerful. Mutations let you automatically modify resources as they are created or updated, ensuring consistency without rejecting requests.

## Understanding Mutation vs Validation

Validation policies reject non-compliant resources. Mutation policies modify resources to make them compliant. Both work during the admission control phase.

```mermaid
flowchart LR
    subgraph Admission["Kubernetes Admission Control"]
        direction LR
        A[API Request] --> B[Mutating Webhooks]
        B --> C[Validating Webhooks]
        C --> D[Persist to etcd]
    end

    subgraph Gatekeeper["OPA Gatekeeper"]
        M[Mutation] --> V[Validation]
    end

    B --> M
    C --> V
```

## How Gatekeeper Mutation Works

When a resource is submitted to Kubernetes, Gatekeeper's mutating webhook intercepts it and applies matching mutation policies until they converge. The modified resource then passes through validation.

```mermaid
sequenceDiagram
    participant User
    participant API as API Server
    participant GM as Gatekeeper Mutator
    participant GV as Gatekeeper Validator
    participant etcd

    User->>API: Create Pod
    API->>GM: Mutating Admission
    GM->>GM: Evaluate matching mutators
    GM->>GM: Apply convergent mutations
    GM->>API: Return modified Pod
    API->>GV: Validating Admission
    GV->>GV: Check constraints
    GV->>API: Allow/Deny
    API->>etcd: Persist Pod
```

## Mutation Policy Types

Gatekeeper provides four mutation types:

| Type | Purpose | Use Case |
|------|---------|----------|
| **Assign** | Set or override field values | Add default resource limits |
| **AssignMetadata** | Add labels or annotations | Inject cost center labels |
| **ModifySet** | Add or remove items from lists | Add tolerations |
| **AssignImage** | Change image domain, path, tag, or digest components | Pin image digests |

## Enabling Mutation in Gatekeeper

Mutation is enabled by default in current Gatekeeper Helm charts. Make sure it has not been disabled during installation.

```bash
# Install Gatekeeper with mutation enabled and fail-open mutation webhooks

helm install gatekeeper gatekeeper/gatekeeper \
  --namespace gatekeeper-system \
  --create-namespace \
  --set disableMutation=false \
  --set mutatingWebhookFailurePolicy=Ignore
```

Or update an existing Helm installation:

```bash
helm upgrade gatekeeper gatekeeper/gatekeeper \
  --namespace gatekeeper-system \
  --reuse-values \
  --set disableMutation=false
```

## Assign: Setting Field Values

Assign policies set or override specific field values in resources.

### Basic Structure

```yaml
apiVersion: mutations.gatekeeper.sh/v1
kind: Assign
metadata:
  name: demo-assign
spec:
  # Where to apply the mutation
  applyTo:
    - groups: [""]
      kinds: ["Pod"]
      versions: ["v1"]

  # Which resources to match
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces: ["production"]

  # What to mutate
  location: "spec.containers[name:*].resources.limits.memory"

  # The value to set
  parameters:
    assign:
      value: "512Mi"
```

### Example: Add Default Resource Limits

This policy adds memory limits to containers that lack them.

```yaml
apiVersion: mutations.gatekeeper.sh/v1
kind: Assign
metadata:
  name: assign-default-memory-limit
spec:
  applyTo:
    - groups: [""]
      kinds: ["Pod"]
      versions: ["v1"]
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    # Exclude system namespaces
    excludedNamespaces:
      - kube-system
      - gatekeeper-system
  # Target all containers, set memory limit
  location: "spec.containers[name:*].resources.limits.memory"
  parameters:
    # Only assign if the field does not exist
    pathTests:
      - subPath: "spec.containers[name:*].resources.limits.memory"
        condition: MustNotExist
    assign:
      value: "256Mi"
```

### Example: Set Security Context

Force containers to run as non-root.

```yaml
apiVersion: mutations.gatekeeper.sh/v1
kind: Assign
metadata:
  name: assign-run-as-nonroot
spec:
  applyTo:
    - groups: [""]
      kinds: ["Pod"]
      versions: ["v1"]
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  # Set at pod level
  location: "spec.securityContext.runAsNonRoot"
  parameters:
    assign:
      value: true
---
apiVersion: mutations.gatekeeper.sh/v1
kind: Assign
metadata:
  name: assign-container-security-context
spec:
  applyTo:
    - groups: [""]
      kinds: ["Pod"]
      versions: ["v1"]
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  # Set at container level
  location: "spec.containers[name:*].securityContext.allowPrivilegeEscalation"
  parameters:
    assign:
      value: false
```

### Example: Set Image Pull Policy

Ensure containers always pull images.

```yaml
apiVersion: mutations.gatekeeper.sh/v1
kind: Assign
metadata:
  name: assign-image-pull-policy
spec:
  applyTo:
    - groups: [""]
      kinds: ["Pod"]
      versions: ["v1"]
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaceSelector:
      matchLabels:
        environment: production
  location: "spec.containers[name:*].imagePullPolicy"
  parameters:
    assign:
      value: "Always"
```

## AssignMetadata: Adding Labels and Annotations

AssignMetadata adds labels or annotations to resources. It cannot override existing values.

### Basic Structure

```yaml
apiVersion: mutations.gatekeeper.sh/v1
kind: AssignMetadata
metadata:
  name: demo-assign-metadata
spec:
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  # Can only target metadata.labels or metadata.annotations
  location: "metadata.labels.environment"
  parameters:
    assign:
      value: "production"
```

### Example: Add Cost Center Labels

Automatically tag resources for cost allocation.

```yaml
apiVersion: mutations.gatekeeper.sh/v1
kind: AssignMetadata
metadata:
  name: assign-cost-center-label
spec:
  match:
    scope: Namespaced
    kinds:
      - apiGroups: ["*"]
        kinds: ["*"]
    namespaces:
      - team-alpha
  location: "metadata.labels.cost-center"
  parameters:
    assign:
      value: "cc-12345"
---
apiVersion: mutations.gatekeeper.sh/v1
kind: AssignMetadata
metadata:
  name: assign-team-label
spec:
  match:
    scope: Namespaced
    kinds:
      - apiGroups: ["*"]
        kinds: ["*"]
    namespaces:
      - team-alpha
  location: "metadata.labels.team"
  parameters:
    assign:
      value: "alpha"
```

### Example: Add Monitoring Annotations

Inject Prometheus scraping annotations.

```yaml
apiVersion: mutations.gatekeeper.sh/v1
kind: AssignMetadata
metadata:
  name: assign-prometheus-scrape
spec:
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    # Only pods with the app label
    labelSelector:
      matchExpressions:
        - key: app
          operator: Exists
  location: "metadata.annotations.prometheus\\.io/scrape"
  parameters:
    assign:
      value: "true"
---
apiVersion: mutations.gatekeeper.sh/v1
kind: AssignMetadata
metadata:
  name: assign-prometheus-port
spec:
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    labelSelector:
      matchExpressions:
        - key: app
          operator: Exists
  location: "metadata.annotations.prometheus\\.io/port"
  parameters:
    assign:
      value: "8080"
```

## ModifySet: Adding Items to Lists

ModifySet adds items to list fields without replacing existing items.

### Basic Structure

```yaml
apiVersion: mutations.gatekeeper.sh/v1
kind: ModifySet
metadata:
  name: demo-modify-set
spec:
  applyTo:
    - groups: [""]
      kinds: ["Pod"]
      versions: ["v1"]
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  # Target a list field
  location: "spec.tolerations"
  parameters:
    operation: merge
    # Values to add to the list
    values:
      fromList:
        - key: "dedicated"
          operator: "Equal"
          value: "production"
          effect: "NoSchedule"
```

### Example: Add Default Tolerations

Allow pods to schedule on tainted nodes.

```yaml
apiVersion: mutations.gatekeeper.sh/v1
kind: ModifySet
metadata:
  name: add-spot-instance-toleration
spec:
  applyTo:
    - groups: [""]
      kinds: ["Pod"]
      versions: ["v1"]
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    # Only for pods with spot-eligible label
    labelSelector:
      matchLabels:
        spot-eligible: "true"
  location: "spec.tolerations"
  parameters:
    operation: merge
    values:
      fromList:
        - key: "kubernetes.azure.com/scalesetpriority"
          operator: "Equal"
          value: "spot"
          effect: "NoSchedule"
```

### Example: Add Image Pull Secrets

Inject registry credentials into pods.

```yaml
apiVersion: mutations.gatekeeper.sh/v1
kind: ModifySet
metadata:
  name: add-image-pull-secret
spec:
  applyTo:
    - groups: [""]
      kinds: ["Pod"]
      versions: ["v1"]
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
  location: "spec.imagePullSecrets"
  parameters:
    operation: merge
    values:
      fromList:
        - name: "registry-credentials"
```

## Location and Path Expressions

The `location` field uses a path expression syntax to target specific fields.

### Path Syntax

```yaml
# Simple path
location: "spec.replicas"

# Array with name selector (matches all containers)
location: "spec.containers[name:*].resources.limits.cpu"

# Specific named container
location: "spec.containers[name:nginx].image"

# Nested paths
location: "spec.template.spec.containers[name:*].env"

# Escape special characters with backslash
location: "metadata.annotations.prometheus\\.io/scrape"
```

### Path Expression Diagram

```mermaid
flowchart TD
    A["spec.containers[name:*].resources.limits.memory"] --> B["spec"]
    B --> C["containers"]
    C --> D["[name:*]"]
    D --> E["All containers by name"]
    E --> F["resources"]
    F --> G["limits"]
    G --> H["memory"]

    style D fill:#f9f,stroke:#333
```

### Common Path Patterns

| Pattern | Description |
|---------|-------------|
| `spec.replicas` | Direct field access |
| `spec.containers[name:*]` | All containers |
| `spec.containers[name:app]` | Container named "app" |
| `metadata.labels.key` | Label with key "key" |
| `metadata.annotations.key\\.subkey` | Annotation with dots |

## Mutation Ordering and Conflicts

Gatekeeper mutations should be written so they converge to a stable result. Avoid depending on one mutator overwriting another mutator.

### Avoid Overlapping Mutations

Do not create multiple `Assign` mutators that set different values for the same field. Instead, use different match criteria or a single mutation for that path.

```yaml
apiVersion: mutations.gatekeeper.sh/v1
kind: Assign
metadata:
  name: assign-production-memory
spec:
  applyTo:
    - groups: [""]
      kinds: ["Pod"]
      versions: ["v1"]
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces: ["production"]
  location: "spec.containers[name:*].resources.limits.memory"
  parameters:
    assign:
      value: "1Gi"
---
apiVersion: mutations.gatekeeper.sh/v1
kind: Assign
metadata:
  name: assign-development-memory
spec:
  applyTo:
    - groups: [""]
      kinds: ["Pod"]
      versions: ["v1"]
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces: ["development"]
  location: "spec.containers[name:*].resources.limits.memory"
  parameters:
    assign:
      value: "512Mi"
```

### Mutation Design Visualization

```mermaid
flowchart TB
    subgraph Match["Separate Match Criteria"]
        direction TB
        P1["production namespace"] --> P2["assign-production-memory"]
        D1["development namespace"] --> D2["assign-development-memory"]
    end

    subgraph Conditions["Path Conditions"]
        direction TB
        T1["MustNotExist"] --> T2["Set default only when missing"]
    end
```

### Avoiding Conflicts

Use `pathTests` to conditionally apply mutations.

```yaml
apiVersion: mutations.gatekeeper.sh/v1
kind: Assign
metadata:
  name: assign-memory-if-missing
spec:
  applyTo:
    - groups: [""]
      kinds: ["Pod"]
      versions: ["v1"]
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  location: "spec.containers[name:*].resources.limits.memory"
  parameters:
    pathTests:
      # Only mutate if memory limit is not already set
      - subPath: "spec.containers[name:*].resources.limits.memory"
        condition: MustNotExist
    assign:
      value: "256Mi"
```

## Testing Mutation Policies

### Using kubectl to Test

Create a dry-run to see what mutations will be applied.

```bash
# Create a test pod manifest
cat <<EOF > test-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: default
spec:
  containers:
    - name: nginx
      image: nginx:latest
EOF

# Apply with dry-run to see mutations
kubectl apply -f test-pod.yaml --dry-run=server -o yaml
```

### Using Gatekeeper's Expand Resource

Test generated workload resources with expansion templates. Include `applyTo` so Gatekeeper knows which workload resource is expanded.

```yaml
apiVersion: expansion.gatekeeper.sh/v1beta1
kind: ExpansionTemplate
metadata:
  name: test-expand
spec:
  applyTo:
    - groups: ["apps"]
      kinds: ["Deployment"]
      versions: ["v1"]
  templateSource: "spec.template"
  generatedGVK:
    kind: Pod
    group: ""
    version: v1
```

### Testing Generated Resources with Gator

The `gator` CLI can expand workload resources locally and apply mutation CRs to the generated resources.

```bash
# Install gator
go install github.com/open-policy-agent/gatekeeper/v3/cmd/gator@latest

# Put your Deployment, ExpansionTemplate, and mutation CRs in one directory
mkdir -p mutation-test
cp deployment.yaml expansion-template.yaml assign-default-memory-limit.yaml mutation-test/

# Expand generated resources and inspect the mutated output
gator expand --filename mutation-test/
```

### Create a Test Script

```bash
#!/bin/bash
# test-mutations.sh

set -e

echo "Testing OPA Gatekeeper Mutations"
echo "================================"

# Create test namespace
kubectl create namespace mutation-test --dry-run=client -o yaml | kubectl apply -f -

# Apply mutation policies
kubectl apply -f mutations/

# Wait for policies to sync
sleep 5

# Test 1: Pod without memory limits
echo -e "\nTest 1: Pod without memory limits"
cat <<EOF | kubectl apply -n mutation-test --dry-run=server -o yaml -f -
apiVersion: v1
kind: Pod
metadata:
  name: test-no-limits
spec:
  containers:
    - name: app
      image: nginx
EOF

# Test 2: Pod with existing limits (should not be overwritten)
echo -e "\nTest 2: Pod with existing limits"
cat <<EOF | kubectl apply -n mutation-test --dry-run=server -o yaml -f -
apiVersion: v1
kind: Pod
metadata:
  name: test-with-limits
spec:
  containers:
    - name: app
      image: nginx
      resources:
        limits:
          memory: "1Gi"
EOF

# Test 3: Check labels are added
echo -e "\nTest 3: Check labels are added"
cat <<EOF | kubectl apply -n mutation-test --dry-run=server -o yaml -f -
apiVersion: v1
kind: Pod
metadata:
  name: test-labels
spec:
  containers:
    - name: app
      image: nginx
EOF

echo -e "\nAll tests completed!"
```

## Debugging Mutations

### Check Mutation Status

```bash
# List all mutation policies
kubectl get assign,assignmetadata,modifyset,assignimage -A

# Check mutation status
kubectl get assign <name> -o yaml

# View mutation webhook configuration
kubectl get mutatingwebhookconfigurations gatekeeper-mutating-webhook-configuration -o yaml
```

### View Gatekeeper Logs

```bash
# View controller manager logs
kubectl logs -n gatekeeper-system -l control-plane=controller-manager -f

# Filter for mutation messages
kubectl logs -n gatekeeper-system -l control-plane=controller-manager | grep -i mutation
```

### Common Issues

**Mutation not applied:**
- Check that mutation is enabled in Gatekeeper
- Verify the `match` criteria includes your resource
- Ensure namespace is not excluded
- Check the `applyTo` field matches your resource GVK

**Mutation conflicts:**
- Review mutators that target the same field
- Use `pathTests` with `MustNotExist` condition
- Use non-overlapping `match` criteria

**Unexpected values:**
- Overlapping mutations may be rejected or converge differently than expected
- Check all mutations targeting the same path
- Use `kubectl apply --dry-run=server -o yaml` to see final result

## Complete Example: Production-Ready Mutations

Here is a complete set of mutations for a production cluster.

```yaml
# 01-assign-resource-limits.yaml
# Add default resource limits to all containers
apiVersion: mutations.gatekeeper.sh/v1
kind: Assign
metadata:
  name: assign-default-cpu-request
spec:
  applyTo:
    - groups: [""]
      kinds: ["Pod"]
      versions: ["v1"]
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
      - gatekeeper-system
      - monitoring
  location: "spec.containers[name:*].resources.requests.cpu"
  parameters:
    pathTests:
      - subPath: "spec.containers[name:*].resources.requests.cpu"
        condition: MustNotExist
    assign:
      value: "100m"
---
apiVersion: mutations.gatekeeper.sh/v1
kind: Assign
metadata:
  name: assign-default-memory-request
spec:
  applyTo:
    - groups: [""]
      kinds: ["Pod"]
      versions: ["v1"]
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
      - gatekeeper-system
      - monitoring
  location: "spec.containers[name:*].resources.requests.memory"
  parameters:
    pathTests:
      - subPath: "spec.containers[name:*].resources.requests.memory"
        condition: MustNotExist
    assign:
      value: "128Mi"
---
apiVersion: mutations.gatekeeper.sh/v1
kind: Assign
metadata:
  name: assign-default-memory-limit
spec:
  applyTo:
    - groups: [""]
      kinds: ["Pod"]
      versions: ["v1"]
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
      - gatekeeper-system
      - monitoring
  location: "spec.containers[name:*].resources.limits.memory"
  parameters:
    pathTests:
      - subPath: "spec.containers[name:*].resources.limits.memory"
        condition: MustNotExist
    assign:
      value: "256Mi"
---
# 02-assign-security-context.yaml
# Enforce security best practices
apiVersion: mutations.gatekeeper.sh/v1
kind: Assign
metadata:
  name: assign-readonly-root-filesystem
spec:
  applyTo:
    - groups: [""]
      kinds: ["Pod"]
      versions: ["v1"]
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
  location: "spec.containers[name:*].securityContext.readOnlyRootFilesystem"
  parameters:
    pathTests:
      - subPath: "spec.containers[name:*].securityContext.readOnlyRootFilesystem"
        condition: MustNotExist
    assign:
      value: true
---
apiVersion: mutations.gatekeeper.sh/v1
kind: Assign
metadata:
  name: assign-drop-all-capabilities
spec:
  applyTo:
    - groups: [""]
      kinds: ["Pod"]
      versions: ["v1"]
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
  location: "spec.containers[name:*].securityContext.capabilities.drop"
  parameters:
    pathTests:
      - subPath: "spec.containers[name:*].securityContext.capabilities.drop"
        condition: MustNotExist
    assign:
      value:
        - ALL
---
# 03-assign-metadata.yaml
# Add organizational labels
apiVersion: mutations.gatekeeper.sh/v1
kind: AssignMetadata
metadata:
  name: assign-managed-by-label
spec:
  match:
    scope: Namespaced
    kinds:
      - apiGroups: ["*"]
        kinds: ["*"]
    excludedNamespaces:
      - kube-system
      - gatekeeper-system
  location: "metadata.labels.app\\.kubernetes\\.io/managed-by"
  parameters:
    assign:
      value: "gatekeeper"
---
# 04-modify-set-tolerations.yaml
# Add common tolerations
apiVersion: mutations.gatekeeper.sh/v1
kind: ModifySet
metadata:
  name: add-default-tolerations
spec:
  applyTo:
    - groups: [""]
      kinds: ["Pod"]
      versions: ["v1"]
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
  location: "spec.tolerations"
  parameters:
    operation: merge
    values:
      fromList:
        # Tolerate node not ready briefly
        - key: "node.kubernetes.io/not-ready"
          operator: "Exists"
          effect: "NoExecute"
          tolerationSeconds: 60
        # Tolerate node unreachable briefly
        - key: "node.kubernetes.io/unreachable"
          operator: "Exists"
          effect: "NoExecute"
          tolerationSeconds: 60
```

## Best Practices

### Design Principles

1. **Use MustNotExist conditions** - Avoid overwriting intentional values
2. **Exclude system namespaces** - Never mutate kube-system resources
3. **Set sensible defaults** - Mutations should provide safe fallbacks
4. **Document mutations** - Add comments explaining why each mutation exists
5. **Test before deploying** - Use dry-run and gator to verify behavior

### Naming Conventions

```yaml
# Good: descriptive names with type prefix
assign-default-memory-limit
assignmetadata-cost-center-label
modifyset-registry-pull-secrets

# Bad: vague names
mutation1
my-mutation
test
```

### Organizing Mutations

```text
mutations/
  00-priorities.md          # Document priority scheme
  01-resource-defaults/     # Resource requests and limits
    assign-cpu-request.yaml
    assign-memory-limit.yaml
  02-security/              # Security context mutations
    assign-nonroot.yaml
    assign-readonly-fs.yaml
  03-metadata/              # Labels and annotations
    assignmetadata-team.yaml
    assignmetadata-cost.yaml
  04-tolerations/           # Tolerations and affinities
    modifyset-spot-tolerations.yaml
```

---

OPA Gatekeeper mutations transform how you manage Kubernetes configuration. Instead of rejecting pods that lack resource limits, mutate them to have sensible defaults. Instead of requiring teams to add cost center labels manually, inject them automatically. Combine mutations with validation constraints for a comprehensive policy framework that makes the right thing the easy thing.
