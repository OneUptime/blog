# How to Use kubectl api-resources and api-versions to Discover Cluster Capabilities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, API Discovery

Description: Learn how to use kubectl api-resources and api-versions to discover available resource types, API groups, and cluster capabilities for better Kubernetes resource management.

---

Kubernetes clusters vary in capabilities. CRDs add custom resources, different versions support different API groups, and features depend on what operators are installed. The `kubectl api-resources` and `kubectl api-versions` commands reveal exactly what your cluster supports.

## Understanding API Resources

API resources represent the types of objects you can create in Kubernetes. Each resource has properties like its API group, namespaced status, short names, and kind:

```bash
# List all available resources
kubectl api-resources

# Output includes:
# NAME, SHORTNAMES, APIVERSION, NAMESPACED, KIND
```

This command shows every resource type the API server recognizes, including built-in resources and custom resources from CRDs.

## Filtering Resources by API Group

Resources organize into API groups. Filter by group to see related resources:

```bash
# Show resources in apps API group
kubectl api-resources --api-group=apps

# Show core resources (no group)
kubectl api-resources --api-group=""

# Show batch resources
kubectl api-resources --api-group=batch

# Show networking resources
kubectl api-resources --api-group=networking.k8s.io

# Show RBAC resources
kubectl api-resources --api-group=rbac.authorization.k8s.io
```

This helps discover resources when working with specific subsystems.

## Finding Namespaced vs Cluster-Scoped Resources

Some resources exist in namespaces, others are cluster-wide:

```bash
# Show only namespaced resources
kubectl api-resources --namespaced=true

# Show only cluster-scoped resources
kubectl api-resources --namespaced=false

# Find if a specific resource is namespaced
kubectl api-resources | grep configmaps
# configmaps, cm, v1, true, ConfigMap

# Check if nodes are namespaced
kubectl api-resources | grep nodes
# nodes, no, v1, false, Node
```

This determines whether to use `-n namespace` when working with resources.

## Discovering Resource Short Names

Short names save typing in kubectl commands:

```bash
# Find short names for common resources
kubectl api-resources | grep -E "NAME|^pods"
# pods, po, v1, true, Pod

kubectl api-resources | grep -E "NAME|^services"
# services, svc, v1, true, Service

kubectl api-resources | grep -E "NAME|^deployments"
# deployments, deploy, apps/v1, true, Deployment

# Use short names in commands
kubectl get po  # Instead of kubectl get pods
kubectl get svc  # Instead of kubectl get services
kubectl get deploy  # Instead of kubectl get deployments
```

Short names work anywhere the full resource name works.

## Listing API Versions

API versions show which API groups and versions the cluster supports:

```bash
# List all API versions
kubectl api-versions

# Output includes:
# admissionregistration.k8s.io/v1
# apps/v1
# authentication.k8s.io/v1
# authorization.k8s.io/v1
# autoscaling/v1
# autoscaling/v2
# batch/v1
# certificates.k8s.io/v1
# ...
```

This reveals what apiVersion values are valid in YAML manifests.

## Checking API Version Support

Before writing manifests, verify the cluster supports required API versions:

```bash
# Check if autoscaling/v2 is available
kubectl api-versions | grep autoscaling
# autoscaling/v1
# autoscaling/v2

# Check for specific CRD API versions
kubectl api-versions | grep argoproj
# argoproj.io/v1alpha1

# Verify storage API versions
kubectl api-versions | grep storage
# storage.k8s.io/v1
# storage.k8s.io/v1beta1
```

Different clusters support different API versions based on Kubernetes version and installed operators.

## Discovering Custom Resources

CRDs add custom resources. Find them by filtering for non-standard API groups:

```bash
# Show resources from custom API groups
kubectl api-resources --api-group=argoproj.io
kubectl api-resources --api-group=cert-manager.io
kubectl api-resources --api-group=monitoring.coreos.com

# Find all CRDs installed
kubectl get customresourcedefinitions

# Short form
kubectl get crds

# Show CRD details
kubectl get crds -o wide
```

This reveals what operators and controllers have been installed.

## Finding Verbs for Resources

Each resource supports specific verbs (create, delete, get, etc.):

```bash
# Get supported verbs for a resource
kubectl api-resources -o wide

# Output includes VERBS column showing what operations are supported
# Example: [create delete deletecollection get list patch update watch]

# Check if a resource supports specific verbs
kubectl api-resources -o wide | grep pods
# Shows which operations pods support
```

The verbs column indicates what kubectl commands work with each resource.

## Searching for Specific Resources

Find resources by name or pattern:

```bash
# Find resources with "config" in the name
kubectl api-resources | grep config

# Find resources related to storage
kubectl api-resources | grep -i storage

# Find resources related to networking
kubectl api-resources | grep -i network

# Case-insensitive search
kubectl api-resources | grep -i secret
```

This helps discover related resources when exploring cluster capabilities.

## Output Formats

Change output format for different use cases:

```bash
# Default table format
kubectl api-resources

# Wide format with verbs
kubectl api-resources -o wide

# Just resource names
kubectl api-resources -o name

# JSON format for parsing
kubectl api-resources -o json

# YAML format
kubectl api-resources -o yaml
```

JSON and YAML outputs enable programmatic processing of resource metadata.

## Comparing Clusters

Compare API resources across clusters to identify differences:

```bash
#!/bin/bash
# compare-clusters.sh

# Save resources from cluster 1
kubectl config use-context cluster1
kubectl api-resources -o name | sort > cluster1-resources.txt

# Save resources from cluster 2
kubectl config use-context cluster2
kubectl api-resources -o name | sort > cluster2-resources.txt

# Compare
diff cluster1-resources.txt cluster2-resources.txt

# Or using comm
comm -3 cluster1-resources.txt cluster2-resources.txt
```

This reveals capability differences between dev, staging, and production clusters.

## Finding Resource Categories

Resources belong to categories like "all":

```bash
# Show resources in the "all" category
kubectl api-resources --categories=all

# This includes pods, services, deployments, replicasets, etc.
# These resources appear with "kubectl get all"

# Check if a specific resource is in "all"
kubectl api-resources -o wide | grep -E "CATEGORIES|^pods"
```

Categories group related resources for convenient bulk operations.

## Checking API Server Version Compatibility

Match API resources to Kubernetes versions:

```bash
# Check cluster version
kubectl version --short

# List all API versions
kubectl api-versions

# Check for deprecated API versions
kubectl api-versions | grep beta

# Verify GA versions are available
kubectl api-versions | grep v1
```

Newer Kubernetes versions deprecate old API versions and introduce new ones.

## Discovering Webhook Resources

Admission webhooks register as API resources:

```bash
# Find mutating webhook configurations
kubectl api-resources | grep mutatingwebhook

# Find validating webhook configurations
kubectl api-resources | grep validatingwebhook

# List webhook configurations
kubectl get mutatingwebhookconfigurations
kubectl get validatingwebhookconfigurations
```

This reveals what admission controllers are active in the cluster.

## Finding Metrics Resources

Metrics API resources require metrics-server:

```bash
# Check if metrics API is available
kubectl api-versions | grep metrics

# Show metrics resources
kubectl api-resources --api-group=metrics.k8s.io

# Test metrics access
kubectl top nodes
kubectl top pods
```

Missing metrics resources indicate metrics-server is not installed.

## Using in Scripts for Compatibility

Check resource availability before using it:

```bash
#!/bin/bash
# deploy-with-check.sh

# Check if HorizontalPodAutoscaler v2 is available
if kubectl api-resources --api-group=autoscaling | grep -q "v2"; then
    echo "Using autoscaling/v2 HPA"
    kubectl apply -f hpa-v2.yaml
else
    echo "Falling back to autoscaling/v1 HPA"
    kubectl apply -f hpa-v1.yaml
fi

# Check if CronJob is available (older clusters use batch/v1beta1)
if kubectl api-resources | grep -q "cronjobs.*batch/v1"; then
    apiVersion="batch/v1"
else
    apiVersion="batch/v1beta1"
fi

sed "s/API_VERSION/$apiVersion/" cronjob-template.yaml | kubectl apply -f -
```

This creates portable scripts that adapt to different cluster versions.

## Exploring Storage Classes

Storage resources vary significantly between clusters:

```bash
# Find storage-related resources
kubectl api-resources --api-group=storage.k8s.io

# List available storage classes
kubectl get storageclasses

# Show storage class details
kubectl get sc -o wide

# Check volume snapshot support
kubectl api-resources | grep volumesnapshot
```

Storage capabilities depend on CSI drivers and cloud provider integrations.

## Checking RBAC Resources

Understand RBAC resource types:

```bash
# Show all RBAC resources
kubectl api-resources --api-group=rbac.authorization.k8s.io

# List roles and bindings
kubectl get roles --all-namespaces
kubectl get rolebindings --all-namespaces
kubectl get clusterroles
kubectl get clusterrolebindings
```

This reveals the RBAC resources available for access control.

## Finding Policy Resources

Policy resources like PodSecurityPolicy or PodSecurityStandards:

```bash
# Check for PodSecurityPolicy (deprecated)
kubectl api-resources | grep podsecuritypolicies

# Check for admission policy resources
kubectl api-resources | grep -i policy

# List network policies
kubectl get networkpolicies --all-namespaces
```

Policy resources vary based on cluster security configurations.

## Discovering Operator Resources

Operators install CRDs. Find operator-managed resources:

```bash
# Find Prometheus operator resources
kubectl api-resources --api-group=monitoring.coreos.com

# Find cert-manager resources
kubectl api-resources --api-group=cert-manager.io

# Find Istio resources
kubectl api-resources --api-group=networking.istio.io

# Find ArgoCD resources
kubectl api-resources --api-group=argoproj.io
```

Each operator extends Kubernetes with domain-specific resources.

## Generating Resource Documentation

Create documentation of cluster capabilities:

```bash
#!/bin/bash
# document-cluster.sh

echo "# Cluster API Resources" > cluster-resources.md
echo "" >> cluster-resources.md

echo "## API Versions" >> cluster-resources.md
kubectl api-versions >> cluster-resources.md

echo "" >> cluster-resources.md
echo "## Namespaced Resources" >> cluster-resources.md
kubectl api-resources --namespaced=true -o wide >> cluster-resources.md

echo "" >> cluster-resources.md
echo "## Cluster-Scoped Resources" >> cluster-resources.md
kubectl api-resources --namespaced=false -o wide >> cluster-resources.md

echo "" >> cluster-resources.md
echo "## Custom Resources" >> cluster-resources.md
kubectl get crds -o custom-columns=NAME:.metadata.name,GROUP:.spec.group,VERSION:.spec.versions[0].name >> cluster-resources.md
```

This generates cluster capability documentation for team reference.

## Troubleshooting Unknown Resource Errors

When kubectl reports unknown resource types:

```bash
# Error: the server doesn't have a resource type "horizontalpodautoscalers"

# Check available resources
kubectl api-resources | grep -i horizontal

# Check API versions
kubectl api-versions | grep autoscaling

# Verify CRD is installed if custom resource
kubectl get crds | grep <resource-name>
```

This systematically identifies missing resources or incorrect apiVersion values.

Understanding cluster capabilities prevents deployment failures and enables portable manifests. Use api-resources and api-versions to discover what your cluster supports, compare environments, and write version-aware automation. For more cluster exploration commands, see https://oneuptime.com/blog/post/kubectl-explain-api-resource-schemas/view.
