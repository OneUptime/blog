# How to Set Up CRD Categories for Grouping Custom Resources in kubectl

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CRD, kubectl

Description: Learn how to use CRD categories to group related custom resources together, enabling kubectl to list multiple resource types with a single command for better resource management.

---

Kubernetes has built-in categories that group related resources. The `kubectl get all` command lists pods, services, deployments, and more using the "all" category. You can create similar categories for your custom resources, allowing users to view related CRDs with a single command.

Categories make it easier to manage related resources. Instead of running separate kubectl commands for each resource type, users can query an entire category. This becomes valuable when you have multiple related CRDs that represent different aspects of the same system.

## Understanding Resource Categories

Built-in Kubernetes categories include:

- **all**: Pods, Services, Deployments, ReplicaSets, StatefulSets, Jobs, CronJobs, DaemonSets
- **api-extensions**: APIServices, CustomResourceDefinitions

When you run `kubectl get all`, Kubernetes lists all resources belonging to the "all" category. You can create custom categories that work the same way.

## Adding Categories to CRDs

Define categories in the CRD spec under the names section:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: applications.example.com
spec:
  group: example.com
  names:
    kind: Application
    plural: applications
    singular: application
    shortNames:
    - app
    categories:
    - myplatform
    - all  # Add to the built-in "all" category
  scope: Namespaced
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              version:
                type: string
              replicas:
                type: integer
```

Now users can list applications using either:

```bash
kubectl get applications
kubectl get app  # Using short name
kubectl get myplatform  # Using category
kubectl get all  # Includes applications
```

## Creating a Multi-Resource Category

When you have several related CRDs, group them under a common category. Here's an example for a platform with multiple components:

```yaml
# Application CRD
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: applications.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: Application
    plural: applications
    categories:
    - platform
  # ... rest of spec

---
# Database CRD
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: Database
    plural: databases
    categories:
    - platform
  # ... rest of spec

---
# Cache CRD
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: caches.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: Cache
    plural: caches
    categories:
    - platform
  # ... rest of spec
```

Users can now see all platform resources at once:

```bash
kubectl get platform

NAME                                    AGE
application.platform.example.com/web   5d
application.platform.example.com/api   3d
database.platform.example.com/main     10d
database.platform.example.com/cache    8d
cache.platform.example.com/redis       7d
```

## Real-World Example: Service Mesh Resources

Here's how a service mesh might categorize its resources:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: virtualservices.networking.example.com
spec:
  group: networking.example.com
  names:
    kind: VirtualService
    plural: virtualservices
    shortNames: [vs]
    categories:
    - mesh
    - networking
  scope: Namespaced
  # ... schema definition

---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: destinationrules.networking.example.com
spec:
  group: networking.example.com
  names:
    kind: DestinationRule
    plural: destinationrules
    shortNames: [dr]
    categories:
    - mesh
    - networking
  scope: Namespaced
  # ... schema definition

---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: gateways.networking.example.com
spec:
  group: networking.example.com
  names:
    kind: Gateway
    plural: gateways
    shortNames: [gw]
    categories:
    - mesh
    - networking
  scope: Namespaced
  # ... schema definition
```

Users can view all mesh resources or just networking-related resources:

```bash
# All mesh-related resources
kubectl get mesh

# All networking resources (includes mesh resources)
kubectl get networking
```

## Adding Custom Resources to the "all" Category

You can add your CRDs to the built-in "all" category, though use this sparingly. Only add resources that users frequently check alongside pods and services:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: applications.example.com
spec:
  group: example.com
  names:
    kind: Application
    plural: applications
    categories:
    - all  # Shows up in kubectl get all
  # ... rest of spec
```

Now `kubectl get all` includes your custom resources:

```bash
kubectl get all

NAME                    READY   STATUS    RESTARTS   AGE
pod/webapp-6d4f5-abc    1/1     Running   0          5d

NAME                 TYPE        CLUSTER-IP      PORT(S)    AGE
service/webapp       ClusterIP   10.96.100.50    80/TCP     5d

NAME                           READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/webapp         3/3     3            3           5d

NAME                                      DESIRED   CURRENT   READY   AGE
replicaset.apps/webapp-6d4f5              3         3         3       5d

NAME                                      VERSION   REPLICAS   AGE
application.example.com/webapp            2.1.0     3          5d
```

Be cautious about adding to "all" because it can make the output verbose. Reserve this for primary application-level resources.

## Using Kubebuilder Markers for Categories

With Kubebuilder, specify categories using resource markers:

```go
// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:categories={platform,all},shortName=app
// +kubebuilder:printcolumn:name="Version",type=string,JSONPath=`.spec.version`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`

type Application struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   ApplicationSpec   `json:"spec,omitempty"`
    Status ApplicationStatus `json:"status,omitempty"`
}
```

Run `make manifests` to generate the CRD with categories.

## Namespace-Scoped vs Cluster-Scoped Categories

Categories work with both namespace-scoped and cluster-scoped resources:

```yaml
# Namespace-scoped resource
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: applications.platform.example.com
spec:
  scope: Namespaced
  names:
    categories: [platform]
  # ...

---
# Cluster-scoped resource
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: clusters.platform.example.com
spec:
  scope: Cluster
  names:
    categories: [platform]
  # ...
```

When listing the category, kubectl shows both:

```bash
# In a namespace
kubectl get platform -n production

# Cluster-wide (includes cluster-scoped resources)
kubectl get platform --all-namespaces
kubectl get platform -A
```

## Practical Category Naming

Choose category names that clearly describe what they contain:

```yaml
# Good category names
categories:
- database     # Database-related resources
- networking   # Network configuration
- security     # Security policies
- monitoring   # Observability resources
- cicd         # CI/CD pipeline resources

# Avoid generic names that don't help
categories:
- resources    # Too vague
- custom       # Not descriptive
- misc         # Catch-all categories reduce usefulness
```

## Combining Multiple Categories

Resources can belong to multiple categories for different grouping needs:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: servicemeshes.mesh.example.com
spec:
  names:
    kind: ServiceMesh
    plural: servicemeshes
    categories:
    - mesh           # Mesh-specific category
    - networking     # Broader networking category
    - infrastructure # Even broader infrastructure category
  # ...
```

Users can query at different levels of granularity:

```bash
# Most specific
kubectl get mesh

# Broader (includes other networking resources)
kubectl get networking

# Broadest (includes all infrastructure resources)
kubectl get infrastructure
```

## Verifying Categories

Check which resources belong to a category:

```bash
# List all CRDs
kubectl get crd

# Check a specific CRD's categories
kubectl get crd applications.example.com -o jsonpath='{.spec.names.categories}'

# List resources in a category
kubectl get <category-name>

# See what resources are in "all"
kubectl api-resources --categories=all
```

The `kubectl api-resources` command shows all available categories:

```bash
kubectl api-resources --categories=platform

NAME            SHORTNAMES   APIVERSION                    NAMESPACED   KIND
applications    app          platform.example.com/v1       true         Application
databases       db           platform.example.com/v1       true         Database
caches                       platform.example.com/v1       true         Cache
```

## Category Limitations

Categories are client-side constructs. They don't affect RBAC or API behavior, just kubectl output. Users still need appropriate RBAC permissions for each resource type.

You can't remove resources from built-in categories like "all" if they're added by default. You can only add your custom resources to these categories.

## Example: Complete Monitoring Platform

Here's a complete example for a monitoring platform with multiple related CRDs:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: servicemonitors.monitoring.example.com
spec:
  group: monitoring.example.com
  names:
    kind: ServiceMonitor
    plural: servicemonitors
    shortNames: [sm]
    categories:
    - monitoring
    - observability
  scope: Namespaced
  # ... schema

---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: alertrules.monitoring.example.com
spec:
  group: monitoring.example.com
  names:
    kind: AlertRule
    plural: alertrules
    shortNames: [alert]
    categories:
    - monitoring
    - observability
  scope: Namespaced
  # ... schema

---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: dashboards.monitoring.example.com
spec:
  group: monitoring.example.com
  names:
    kind: Dashboard
    plural: dashboards
    categories:
    - monitoring
    - observability
  scope: Namespaced
  # ... schema
```

Users can manage all monitoring resources together:

```bash
# See all monitoring resources
kubectl get monitoring

# See all observability resources (broader category)
kubectl get observability

# Still works for specific types
kubectl get servicemonitors
kubectl get sm  # Using short name
```

Categories transform how users interact with your custom resources, enabling logical grouping and simplified workflows that match how people think about their infrastructure.
