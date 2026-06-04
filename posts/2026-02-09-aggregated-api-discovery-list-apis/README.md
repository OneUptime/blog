# How to Use Aggregated API Discovery to List All Cluster APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API, Discovery

Description: Learn how to use the Kubernetes aggregated API discovery mechanism to enumerate all available APIs in your cluster, including core APIs, aggregated APIs, and custom resources.

---

Kubernetes clusters can host many API groups beyond the core APIs: custom resource definitions, aggregated API servers, and extensions add hundreds of endpoints. The aggregated discovery API provides a unified way to discover available APIs in your cluster with one request per discovery root (`/api` for the core group and `/apis` for named API groups), making it easier to build tools that work across different cluster configurations.

## Traditional Discovery vs Aggregated Discovery

Traditionally, API discovery required multiple requests:

```bash
# List core API

kubectl get --raw /api

# List each API group separately
kubectl get --raw /apis/apps/v1
kubectl get --raw /apis/batch/v1
# ... and so on for each group
```

Aggregated discovery consolidates this into one response per discovery root. Start a local authenticated proxy in one terminal:

```bash
kubectl proxy
```

Then request the aggregated discovery format with the required `Accept` header:

```bash
ACCEPT='application/json;g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList'

# Get named API group information in a single request
curl -sH "Accept: $ACCEPT" http://127.0.0.1:8001/apis | jq

# Get core API group information
curl -sH "Accept: $ACCEPT" http://127.0.0.1:8001/api | jq
```

Without this `Accept` header, `/api` and `/apis` return the traditional unaggregated discovery documents.

## Understanding Aggregated Discovery Format

The aggregated discovery response contains:

- All API groups
- Available versions for each group
- Resources within each version
- Supported verbs for each resource
- Whether resources are namespaced

Example response structure:

```json
{
  "kind": "APIGroupDiscoveryList",
  "apiVersion": "apidiscovery.k8s.io/v2",
  "items": [
    {
      "metadata": {
        "name": "apps"
      },
      "versions": [
        {
          "version": "v1",
          "resources": [
            {
              "resource": "deployments",
              "responseKind": {
                "group": "apps",
                "version": "v1",
                "kind": "Deployment"
              },
              "scope": "Namespaced",
              "verbs": ["create", "delete", "get", "list", "patch", "update", "watch"]
            }
          ]
        }
      ]
    }
  ]
}
```

## Listing All API Groups

Query all API groups in your cluster:

```bash
# Get all API groups
ACCEPT='application/json;g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList'
curl -sH "Accept: $ACCEPT" http://127.0.0.1:8001/api http://127.0.0.1:8001/apis | jq -s -r '.[].items[].metadata.name | if . == "" then "core" else . end'

# Output shows all available groups:
# core
# apps
# batch
# networking.k8s.io
# cert-manager.io
# monitoring.coreos.com
# etc.
```

## Finding Domain-Qualified API Groups

Identify domain-qualified API groups in your cluster:

```bash
# List domain-qualified API groups
ACCEPT='application/json;g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList'
curl -sH "Accept: $ACCEPT" http://127.0.0.1:8001/apis | jq -r '.items[] | select(.metadata.name | contains(".")) | .metadata.name'

# This shows third-party API groups like:
# cert-manager.io
# monitoring.coreos.com
# example.com
```

Some core Kubernetes groups do not have dots in their names (`apps`, `batch`, etc.), while CRDs, aggregated APIs, and many built-in extension groups use fully qualified domain names. Use `kubectl get crds` if you need to distinguish CRD-backed APIs from built-in or aggregated API groups.

## Enumerating Resources in an API Group

List all resources for a specific API group:

```bash
# Get all resources in the apps API group
ACCEPT='application/json;g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList'
curl -sH "Accept: $ACCEPT" http://127.0.0.1:8001/apis | jq -r '.items[] | select(.metadata.name == "apps") | .versions[0].resources[].resource'

# Output:
# deployments
# daemonsets
# statefulsets
# replicasets
# controllerrevisions
```

## Building an API Inventory Tool

Create a script to catalog all APIs:

```bash
#!/bin/bash

echo "Kubernetes API Inventory"
echo "========================"
echo ""

ACCEPT='application/json;g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList'
API_SERVER='http://127.0.0.1:8001'
DISCOVERY=$(curl -sH "Accept: $ACCEPT" "$API_SERVER/api" "$API_SERVER/apis" | jq -s '{items: [.[].items[]]}')

# Get all API groups
echo "$DISCOVERY" | jq -c '.items[]' | while read api_group; do
    group=$(echo "$api_group" | jq -r '.metadata.name')
    display_group="$group"
    if [ -z "$display_group" ]; then
        display_group="core"
    fi

    echo "API Group: $display_group"

    # Get versions for this group
    echo "$api_group" | jq -r '.versions[].version' | while read version; do
        echo "  Version: $version"

        # Get resources for this version
        echo "$api_group" | jq -r ".versions[] | select(.version == \"$version\") | .resources[].resource" | while read resource; do
            echo "    - $resource"
        done
    done
    echo ""
done
```

## Using Aggregated Discovery in Go

Implement API discovery programmatically:

```go
package main

import (
    "fmt"
    "log"

    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/clientcmd"
)

func main() {
    // Build config
    config, err := clientcmd.BuildConfigFromFlags("", clientcmd.RecommendedHomeFile)
    if err != nil {
        log.Fatalf("Error building config: %v", err)
    }

    // Create clientset
    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        log.Fatalf("Error creating clientset: %v", err)
    }

    // Get discovery client
    discoveryClient := clientset.Discovery()

    // List all API groups
    groupList, err := discoveryClient.ServerGroups()
    if err != nil {
        log.Fatalf("Error getting server groups: %v", err)
    }

    fmt.Println("Available API Groups:")
    for _, group := range groupList.Groups {
        fmt.Printf("  - %s\n", group.Name)
        for _, version := range group.Versions {
            fmt.Printf("    Version: %s\n", version.GroupVersion)
        }
    }

    // Get all resources
    _, resourcesList, err := discoveryClient.ServerGroupsAndResources()
    if err != nil {
        log.Printf("Warning: %v\n", err)
    }

    fmt.Println("\nAvailable Resources:")
    for _, resourceList := range resourcesList {
        fmt.Printf("\nAPI Group: %s\n", resourceList.GroupVersion)
        for _, resource := range resourceList.APIResources {
            namespaced := "cluster-scoped"
            if resource.Namespaced {
                namespaced = "namespaced"
            }
            fmt.Printf("  - %s (%s)\n", resource.Name, namespaced)
            fmt.Printf("    Kind: %s\n", resource.Kind)
            fmt.Printf("    Verbs: %v\n", resource.Verbs)
        }
    }
}
```

## Finding Specific Resource Types

Search for resources across all API groups:

```go
func findResource(discoveryClient discovery.DiscoveryInterface, resourceName string) {
    _, resourcesList, err := discoveryClient.ServerGroupsAndResources()
    if err != nil {
        log.Printf("Warning: %v\n", err)
    }

    fmt.Printf("Searching for resource: %s\n", resourceName)

    for _, resourceList := range resourcesList {
        for _, resource := range resourceList.APIResources {
            if resource.Name == resourceName {
                fmt.Printf("Found: %s/%s\n", resourceList.GroupVersion, resource.Name)
                fmt.Printf("  Kind: %s\n", resource.Kind)
                fmt.Printf("  Namespaced: %v\n", resource.Namespaced)
                fmt.Printf("  Verbs: %v\n", resource.Verbs)
            }
        }
    }
}

// Usage:
// findResource(discoveryClient, "deployments")
// findResource(discoveryClient, "certificates")
```

## Checking if an API Exists

Verify if a specific API is available before using it:

```go
func isAPIAvailable(discoveryClient discovery.DiscoveryInterface, groupVersion, kind string) bool {
    resourceList, err := discoveryClient.ServerResourcesForGroupVersion(groupVersion)
    if err != nil {
        return false
    }

    for _, resource := range resourceList.APIResources {
        if resource.Kind == kind {
            return true
        }
    }

    return false
}

// Usage:
if isAPIAvailable(discoveryClient, "apps/v1", "Deployment") {
    fmt.Println("Deployments are available")
} else {
    fmt.Println("Deployments are not available")
}
```

## Discovering Verbs for Resources

Check which operations are supported for a resource:

```go
func getResourceVerbs(discoveryClient discovery.DiscoveryInterface, groupVersion, resourceName string) ([]string, error) {
    resourceList, err := discoveryClient.ServerResourcesForGroupVersion(groupVersion)
    if err != nil {
        return nil, err
    }

    for _, resource := range resourceList.APIResources {
        if resource.Name == resourceName {
            return resource.Verbs.Strings(), nil
        }
    }

    return nil, fmt.Errorf("resource %s not found in %s", resourceName, groupVersion)
}

// Usage:
verbs, err := getResourceVerbs(discoveryClient, "apps/v1", "deployments")
if err == nil {
    fmt.Printf("Deployments support: %v\n", verbs)
}
```

## Building a Resource Browser

Create an interactive tool to browse cluster APIs:

```go
import (
    "bufio"
    "os"
    "strings"
)

func browseDAPIs(discoveryClient discovery.DiscoveryInterface) {
    reader := bufio.NewReader(os.Stdin)

    for {
        fmt.Print("\nEnter API group (or 'quit'): ")
        input, _ := reader.ReadString('\n')
        group := strings.TrimSpace(input)

        if group == "quit" {
            break
        }

        // Find matching groups
        groupList, _ := discoveryClient.ServerGroups()
        for _, g := range groupList.Groups {
            if g.Name == group {
                fmt.Printf("\nGroup: %s\n", g.Name)
                fmt.Printf("Preferred Version: %s\n", g.PreferredVersion.GroupVersion)

                for _, version := range g.Versions {
                    fmt.Printf("\n  Version: %s\n", version.GroupVersion)

                    resourceList, err := discoveryClient.ServerResourcesForGroupVersion(version.GroupVersion)
                    if err != nil {
                        continue
                    }

                    for _, resource := range resourceList.APIResources {
                        fmt.Printf("    - %s (Kind: %s)\n", resource.Name, resource.Kind)
                    }
                }
                break
            }
        }
    }
}
```

## Caching Discovery Information

Discovery results rarely change, so cache them:

```go
import (
    "k8s.io/client-go/discovery/cached/memory"
)

func useCachedDiscovery(config *rest.Config) {
    // Create a cached discovery client
    discoveryClient, err := discovery.NewDiscoveryClientForConfig(config)
    if err != nil {
        log.Fatal(err)
    }

    // Wrap with memory cache
    cachedClient := memory.NewMemCacheClient(discoveryClient)

    // Now use cachedClient instead of discoveryClient
    // Subsequent calls use cached data
    groupList, _ := cachedClient.ServerGroups()
    fmt.Printf("Found %d API groups\n", len(groupList.Groups))

    // This call uses cache
    groupList2, _ := cachedClient.ServerGroups()
    fmt.Printf("Found %d API groups (from cache)\n", len(groupList2.Groups))
}
```

## Filtering by Capabilities

Find resources that support specific verbs:

```go
func findWatchableResources(discoveryClient discovery.DiscoveryInterface) {
    _, resourcesList, _ := discoveryClient.ServerGroupsAndResources()

    fmt.Println("Watchable Resources:")
    for _, resourceList := range resourcesList {
        for _, resource := range resourceList.APIResources {
            for _, verb := range resource.Verbs {
                if verb == "watch" {
                    fmt.Printf("  - %s/%s\n", resourceList.GroupVersion, resource.Name)
                    break
                }
            }
        }
    }
}
```

## Best Practices

1. **Cache discovery results**: Discovery data changes infrequently; cache it to reduce API calls

2. **Handle partial failures**: Some API groups may fail to list; handle errors gracefully

3. **Use preferred versions**: Each API group has a preferred version; use it when possible

4. **Check before using**: Verify APIs exist before attempting to use them

5. **Monitor API availability**: Track when APIs appear or disappear in the cluster

6. **Document dependencies**: List required APIs in your tool documentation

## Common Use Cases

**Dynamic client initialization**: Discover resources to build dynamic clients

**Cluster validation**: Verify required APIs are installed

**Version compatibility checks**: Ensure your tool works with the cluster's API versions

**Resource enumeration**: List all custom resources for debugging

**API documentation**: Generate documentation from discovered APIs

## Conclusion

Aggregated API discovery provides a powerful mechanism for exploring and understanding the APIs available in a Kubernetes cluster. Whether you are building dynamic clients, validating cluster compatibility, or creating tools that adapt to different cluster configurations, the discovery API gives you the information you need. By leveraging cached discovery clients and implementing smart resource lookups, you can build flexible tools that work across diverse Kubernetes environments without hardcoding assumptions about available APIs.
