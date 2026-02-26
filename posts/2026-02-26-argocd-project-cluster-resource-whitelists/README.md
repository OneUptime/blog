# How to Configure Project Cluster Resource Whitelists in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security, RBAC

Description: Learn how to configure cluster resource whitelists in ArgoCD projects to control which cluster-scoped Kubernetes resources each team can create, with practical examples for platform and application teams.

---

Cluster-scoped resources in Kubernetes are the most powerful and potentially dangerous resource types. A ClusterRole can grant permissions across all namespaces. A MutatingWebhookConfiguration can intercept and modify every API request. A CustomResourceDefinition changes the API surface of the entire cluster. ArgoCD projects give you precise control over which cluster-scoped resources each team can manage.

This guide focuses specifically on the `clusterResourceWhitelist` field and how to configure it for different team profiles.

## Cluster Resources: Why They Matter

Cluster-scoped resources affect the entire cluster, not just a single namespace. Here are the main categories:

**Identity and Access**:
- ClusterRole - Defines permissions across all namespaces
- ClusterRoleBinding - Assigns cluster-wide permissions to users/groups

**Infrastructure**:
- Namespace - Creates new namespace boundaries
- PersistentVolume - Provisions cluster-wide storage
- StorageClass - Defines storage provisioners
- IngressClass - Defines ingress controller classes

**API Extensions**:
- CustomResourceDefinition - Adds new API types
- APIService - Registers new API servers

**Policy and Admission**:
- ValidatingWebhookConfiguration - Validates API requests
- MutatingWebhookConfiguration - Modifies API requests
- PodSecurityPolicy (deprecated) - Restricts pod capabilities

**Networking**:
- ClusterIssuer (cert-manager) - Manages cluster-wide TLS certificates

## Default Behavior

By default, ArgoCD projects deny all cluster-scoped resources. This is the secure default - you must explicitly allow each cluster resource type a team needs.

```yaml
# Default: no cluster resources allowed
clusterResourceWhitelist: []

# This is equivalent to having no clusterResourceWhitelist field at all
```

## Configuring the Whitelist

### Basic Syntax

Each entry in `clusterResourceWhitelist` specifies an API group and a resource kind:

```yaml
clusterResourceWhitelist:
  - group: ""              # Core API group (empty string)
    kind: Namespace
  - group: "rbac.authorization.k8s.io"
    kind: ClusterRole
```

### Allow All Cluster Resources

For admin/platform projects that need full cluster control:

```yaml
clusterResourceWhitelist:
  - group: "*"
    kind: "*"
```

This is the most permissive setting. Only use it for platform team projects where you trust the team completely.

### Allow All Resources in a Specific Group

```yaml
clusterResourceWhitelist:
  # Allow all RBAC cluster resources
  - group: "rbac.authorization.k8s.io"
    kind: "*"
```

## Team-Specific Configurations

### Platform Team

The platform team typically needs the broadest set of cluster resources:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: platform
  namespace: argocd
spec:
  description: "Platform team - manages cluster infrastructure"

  clusterResourceWhitelist:
    # Namespace management
    - group: ""
      kind: Namespace

    # RBAC management
    - group: rbac.authorization.k8s.io
      kind: ClusterRole
    - group: rbac.authorization.k8s.io
      kind: ClusterRoleBinding

    # CRD management for operators
    - group: apiextensions.k8s.io
      kind: CustomResourceDefinition

    # Admission control
    - group: admissionregistration.k8s.io
      kind: ValidatingWebhookConfiguration
    - group: admissionregistration.k8s.io
      kind: MutatingWebhookConfiguration

    # Storage
    - group: storage.k8s.io
      kind: StorageClass
    - group: ""
      kind: PersistentVolume

    # Networking
    - group: networking.k8s.io
      kind: IngressClass

    # cert-manager
    - group: cert-manager.io
      kind: ClusterIssuer

    # Scheduling
    - group: scheduling.k8s.io
      kind: PriorityClass

    # Node management
    - group: ""
      kind: Node
```

### Operator Team

A team that installs and manages Kubernetes operators needs CRD and RBAC access:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: operators
  namespace: argocd
spec:
  description: "Operator management team"

  clusterResourceWhitelist:
    - group: ""
      kind: Namespace
    - group: apiextensions.k8s.io
      kind: CustomResourceDefinition
    - group: rbac.authorization.k8s.io
      kind: ClusterRole
    - group: rbac.authorization.k8s.io
      kind: ClusterRoleBinding
    - group: admissionregistration.k8s.io
      kind: ValidatingWebhookConfiguration
    - group: admissionregistration.k8s.io
      kind: MutatingWebhookConfiguration
    - group: apiregistration.k8s.io
      kind: APIService
```

### Security Team

A security team that manages policies and admission controllers:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: security
  namespace: argocd
spec:
  description: "Security team - manages policies and admission"

  clusterResourceWhitelist:
    # Admission controllers
    - group: admissionregistration.k8s.io
      kind: ValidatingWebhookConfiguration
    - group: admissionregistration.k8s.io
      kind: MutatingWebhookConfiguration

    # Policy resources (Kyverno, OPA Gatekeeper)
    - group: kyverno.io
      kind: ClusterPolicy
    - group: constraints.gatekeeper.sh
      kind: "*"
    - group: templates.gatekeeper.sh
      kind: ConstraintTemplate

    # RBAC for policy enforcement
    - group: rbac.authorization.k8s.io
      kind: ClusterRole
    - group: rbac.authorization.k8s.io
      kind: ClusterRoleBinding
```

### Application Team

Application teams typically need zero cluster resources:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: app-team
  namespace: argocd
spec:
  description: "Application team - namespace-scoped only"

  # No cluster resources
  clusterResourceWhitelist: []
```

If the team needs namespace auto-creation via ArgoCD's `CreateNamespace=true` sync option, add only Namespace:

```yaml
clusterResourceWhitelist:
  - group: ""
    kind: Namespace
```

## Working with Custom Resources

When you install CRDs for operators like Istio, cert-manager, or Prometheus, some of their custom resources are cluster-scoped. You need to whitelist these explicitly.

### Finding Cluster-Scoped Custom Resources

```bash
# List all cluster-scoped resources
kubectl api-resources --namespaced=false

# Filter for specific operators
kubectl api-resources --namespaced=false | grep -i istio
kubectl api-resources --namespaced=false | grep -i cert-manager
kubectl api-resources --namespaced=false | grep -i prometheus
```

### Example: Istio Cluster Resources

```yaml
clusterResourceWhitelist:
  - group: security.istio.io
    kind: PeerAuthentication   # Only if applied cluster-wide
  - group: networking.istio.io
    kind: EnvoyFilter          # Only cluster-scoped ones
```

### Example: Prometheus Operator Cluster Resources

```yaml
clusterResourceWhitelist:
  - group: monitoring.coreos.com
    kind: Prometheus           # The Prometheus instance itself
  - group: monitoring.coreos.com
    kind: Alertmanager
```

## Combining Whitelist and Blacklist

You can use both `clusterResourceWhitelist` and `clusterResourceBlacklist` together. The blacklist takes precedence:

```yaml
spec:
  # Allow all cluster resources...
  clusterResourceWhitelist:
    - group: "*"
      kind: "*"

  # ...except these
  clusterResourceBlacklist:
    - group: admissionregistration.k8s.io
      kind: MutatingWebhookConfiguration
    - group: admissionregistration.k8s.io
      kind: ValidatingWebhookConfiguration
```

This pattern is useful for platform teams that need broad access but should not touch admission webhooks (which could break the cluster if misconfigured).

## Verifying Configuration

### Check What a Project Allows

```bash
# Get full project details
argocd proj get platform -o yaml

# Look specifically at cluster resource settings
argocd proj get platform -o json | jq '.spec.clusterResourceWhitelist'
```

### Test with a Dry Run

Try creating an application that includes a cluster resource and see if it is accepted:

```bash
# Create a test application that includes a ClusterRole
argocd app create test-cluster-resource \
  --project app-team \
  --repo https://github.com/my-org/test.git \
  --path cluster-resources \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default

# Attempt to sync - should fail if ClusterRole is not whitelisted
argocd app sync test-cluster-resource
```

### Check Logs for Denied Resources

```bash
kubectl logs -n argocd deployment/argocd-application-controller | \
  grep -i "not allowed\|not permitted\|cluster resource"
```

## Common Mistakes

**Forgetting the API group is an empty string for core resources**: Namespace, PersistentVolume, Node, and ServiceAccount are in the core API group, which is represented as an empty string `""`, not as `"core"` or `"v1"`.

```yaml
# Correct
- group: ""
  kind: Namespace

# Wrong - this will not match
- group: "core"
  kind: Namespace
```

**Confusing namespace-scoped and cluster-scoped versions**: Some resources like `Role` (namespace-scoped) and `ClusterRole` (cluster-scoped) are similar but need different whitelist entries. `Role` goes in `namespaceResourceWhitelist` and `ClusterRole` goes in `clusterResourceWhitelist`.

**Allowing too much for convenience**: It is tempting to use `group: "*", kind: "*"` to avoid debugging permission issues. Resist this in production - the whole point of the whitelist is to enforce least privilege.

## Summary

Cluster resource whitelists in ArgoCD projects are your primary defense against privilege escalation through GitOps. The rule of thumb: application teams get zero cluster resources, operator teams get CRD and RBAC access, and platform teams get broader permissions with specific exclusions for the most dangerous resource types. Always list resources explicitly rather than using wildcards, and regularly audit your project configurations to ensure they follow the principle of least privilege.
