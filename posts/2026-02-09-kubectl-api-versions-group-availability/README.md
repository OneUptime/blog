# How to Use kubectl api-versions to Check API Group Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API, kubectl

Description: Learn how to use kubectl api-versions to discover available API groups, troubleshoot version compatibility issues, and understand which resources your cluster supports.

---

When working with Kubernetes, especially across different cluster versions or with custom resources, you need to know which API versions are available. The `kubectl api-versions` command is your gateway to discovering what your cluster supports, helping you write portable manifests and debug compatibility issues.

## Why API Versions Matter

Kubernetes APIs evolve over time. Resources move from alpha to beta to stable, and sometimes APIs are deprecated or removed entirely. What works in Kubernetes 1.25 might not work in 1.30. Understanding available API versions helps you:

- Write manifests compatible with your cluster
- Troubleshoot "no matches for kind" errors
- Discover installed CRDs and their versions
- Plan cluster upgrades
- Verify operator installations

## Basic Usage

The simplest command lists all available API versions:

```bash
kubectl api-versions
```

Output looks like this:

```
admissionregistration.k8s.io/v1
admissionregistration.k8s.io/v1beta1
apps/v1
authentication.k8s.io/v1
authorization.k8s.io/v1
autoscaling/v1
autoscaling/v2
batch/v1
certificates.k8s.io/v1
coordination.k8s.io/v1
discovery.k8s.io/v1
events.k8s.io/v1
flowcontrol.apiserver.k8s.io/v1beta3
networking.k8s.io/v1
node.k8s.io/v1
policy/v1
rbac.authorization.k8s.io/v1
scheduling.k8s.io/v1
storage.k8s.io/v1
v1
```

Each line represents an available API group and version combination.

## Understanding API Group Naming

Kubernetes API versions follow a pattern:

**Core API**: Just `v1` (no group prefix)
- Includes Pods, Services, ConfigMaps, Secrets, Namespaces

**Named API groups**: `group/version` format
- `apps/v1`: Deployments, StatefulSets, DaemonSets
- `batch/v1`: Jobs, CronJobs
- `networking.k8s.io/v1`: Ingress, NetworkPolicy

**Maturity indicators in versions**:
- `v1alpha1`, `v1alpha2`: Alpha (experimental)
- `v1beta1`, `v1beta2`: Beta (pre-release)
- `v1`, `v2`: Stable (production-ready)

## Checking for Specific API Versions

Filter the output to check if a specific API is available:

```bash
# Check if apps/v1 is available
kubectl api-versions | grep "apps/v1"

# Check for Ingress API versions
kubectl api-versions | grep networking

# Check for custom resource API groups
kubectl api-versions | grep example.com
```

This is particularly useful in scripts:

```bash
#!/bin/bash

if kubectl api-versions | grep -q "networking.k8s.io/v1"; then
    echo "Using stable Ingress API"
    apiVersion="networking.k8s.io/v1"
else
    echo "Falling back to beta Ingress API"
    apiVersion="networking.k8s.io/v1beta1"
fi

# Use $apiVersion in your manifest generation
```

## Discovering Custom Resources

After installing a CRD or operator, use `api-versions` to verify it registered successfully:

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Check if cert-manager APIs are available
kubectl api-versions | grep cert-manager

# Expected output:
# cert-manager.io/v1
```

If the API does not appear, the CRD might not have installed correctly:

```bash
# Troubleshoot by checking CRD status
kubectl get customresourcedefinitions
kubectl describe crd certificates.cert-manager.io
```

## Comparing API Versions Across Clusters

When managing multiple clusters, compare available APIs:

```bash
# Save API versions from production cluster
kubectl --context=prod api-versions > prod-apis.txt

# Save API versions from staging cluster
kubectl --context=staging api-versions > staging-apis.txt

# Compare them
diff prod-apis.txt staging-apis.txt
```

This helps identify version mismatches that could cause deployment issues.

## Checking Before Applying Manifests

Before applying a manifest, verify the cluster supports the required API version:

```bash
#!/bin/bash

# Extract apiVersion from a YAML file
required_api=$(grep "^apiVersion:" deployment.yaml | awk '{print $2}')

# Check if it is available
if kubectl api-versions | grep -q "^${required_api}$"; then
    echo "API version $required_api is available"
    kubectl apply -f deployment.yaml
else
    echo "ERROR: API version $required_api is not available in this cluster"
    echo "Available versions:"
    kubectl api-versions
    exit 1
fi
```

## Understanding API Deprecation

Kubernetes deprecates old API versions over time. Use `api-versions` to check what is currently available:

```bash
# Check if old Ingress beta API is still available
kubectl api-versions | grep "extensions/v1beta1"

# If not found, you need to update manifests to networking.k8s.io/v1
```

For example, these APIs were removed in recent Kubernetes versions:

- `extensions/v1beta1` for Ingress (use `networking.k8s.io/v1`)
- `policy/v1beta1` for PodDisruptionBudget (use `policy/v1`)
- `batch/v1beta1` for CronJob (use `batch/v1`)

## Troubleshooting "No Matches for Kind" Errors

When kubectl returns "no matches for kind," check API availability:

```bash
# Error example:
# error: unable to recognize "manifest.yaml": no matches for kind "MyCRD" in version "example.com/v1"

# Troubleshoot by checking available versions
kubectl api-versions | grep example.com

# If the API exists but with a different version:
# example.com/v1alpha1

# Update your manifest to use the available version
```

## Listing All Resources for an API Version

Combine `api-versions` with `api-resources` for detailed information:

```bash
# First, see what versions are available
kubectl api-versions | grep apps

# Then, see what resources each version provides
kubectl api-resources --api-group=apps

# Output shows resources with their versions:
# NAME                  SHORTNAMES   APIVERSION   NAMESPACED   KIND
# deployments           deploy       apps/v1      true         Deployment
# daemonsets            ds           apps/v1      true         DaemonSet
# statefulsets          sts          apps/v1      true         StatefulSet
```

## Checking API Server Version Support

Different Kubernetes versions support different API groups. Check your cluster version:

```bash
# Get cluster version
kubectl version --short

# Client Version: v1.28.0
# Server Version: v1.28.3

# List API versions supported by this cluster
kubectl api-versions
```

Cross-reference with Kubernetes release notes to understand which APIs are deprecated or removed in your version.

## Working with Multiple API Versions

Some resources are available in multiple versions simultaneously:

```bash
kubectl api-versions | grep autoscaling

# Output:
# autoscaling/v1
# autoscaling/v2
# autoscaling/v2beta2
```

Use the most stable version available:

```yaml
# Prefer this (stable)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler

# Over this (beta)
apiVersion: autoscaling/v2beta2
kind: HorizontalPodAutoscaler
```

## Automating Compatibility Checks

Build a compatibility checker for CI/CD pipelines:

```bash
#!/bin/bash

REQUIRED_APIS=(
    "apps/v1"
    "networking.k8s.io/v1"
    "cert-manager.io/v1"
    "monitoring.coreos.com/v1"
)

echo "Checking API compatibility..."

all_available=true
for api in "${REQUIRED_APIS[@]}"; do
    if kubectl api-versions | grep -q "^${api}$"; then
        echo "✓ $api is available"
    else
        echo "✗ $api is NOT available"
        all_available=false
    fi
done

if [ "$all_available" = true ]; then
    echo "All required APIs are available"
    exit 0
else
    echo "Some required APIs are missing"
    exit 1
fi
```

## API Version Discovery for Custom Controllers

When writing custom controllers, discover available API versions programmatically:

```go
package main

import (
    "context"
    "fmt"
    "log"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/clientcmd"
)

func listAPIVersions() error {
    config, err := clientcmd.BuildConfigFromFlags("", "/path/to/kubeconfig")
    if err != nil {
        return err
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return err
    }

    // Get server groups and versions
    groupList, err := clientset.Discovery().ServerGroups()
    if err != nil {
        return err
    }

    fmt.Println("Available API Versions:")
    for _, group := range groupList.Groups {
        for _, version := range group.Versions {
            fmt.Printf("%s\n", version.GroupVersion)
        }
    }

    return nil
}

func main() {
    if err := listAPIVersions(); err != nil {
        log.Fatalf("Error: %v", err)
    }
}
```

## Checking API Version Preferred Versions

Some API groups have multiple versions, with one marked as preferred:

```bash
# Use kubectl api-resources to see preferred versions
kubectl api-resources --api-group=autoscaling

# The APIVERSION column shows the preferred/storage version
```

The preferred version is what the API server uses internally for storage.

## Best Practices

1. **Always check before deploying**: Verify API versions exist before applying manifests to production

2. **Use stable versions**: Prefer `v1` or `v2` over beta or alpha versions in production

3. **Document dependencies**: List required API versions in your project documentation

4. **Test across versions**: If supporting multiple Kubernetes versions, test with the oldest supported version

5. **Monitor deprecations**: Subscribe to Kubernetes release notes to stay informed about API changes

6. **Update proactively**: Migrate from deprecated APIs before they are removed

## Conclusion

The `kubectl api-versions` command is essential for understanding what your Kubernetes cluster supports. Whether you are troubleshooting compatibility issues, verifying CRD installations, or planning cluster upgrades, this command provides the information you need. Combine it with `kubectl api-resources` for comprehensive API discovery, and build compatibility checks into your deployment pipelines to catch version mismatches early. By understanding API versions, you can write portable manifests that work reliably across different cluster configurations.
