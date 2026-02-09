# How to Use Dynamic Client in client-go for Unstructured Resource Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, client-go, Dynamic Client

Description: Learn how to use the dynamic client in client-go to interact with any Kubernetes resource without compile-time type definitions, enabling flexible runtime resource manipulation.

---

The standard Kubernetes client-go library requires you to know resource types at compile time, using strongly typed structs like Pod or Deployment. But what if you need to work with Custom Resources you don't know about beforehand, or build tools that handle arbitrary resources? The dynamic client solves this problem.

The dynamic client works with unstructured data, representing Kubernetes resources as nested maps instead of Go structs. This flexibility lets you build generic tools, work with CRDs discovered at runtime, or process resources without importing their type definitions.

## When to Use the Dynamic Client

Use the dynamic client when you need to work with resources whose types you don't know at compile time. This includes building kubectl-like tools, creating generic controllers that handle multiple CRD types, or processing API discovery results.

For resources with known types, use the typed client instead. It provides better type safety, autocomplete in your IDE, and catches errors at compile time rather than runtime.

## Creating a Dynamic Client

Initialize the dynamic client similarly to the typed client:

```go
package main

import (
    "context"
    "fmt"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
    "k8s.io/apimachinery/pkg/runtime/schema"
    "k8s.io/client-go/dynamic"
    "k8s.io/client-go/tools/clientcmd"
)

func main() {
    // Load kubeconfig
    config, err := clientcmd.BuildConfigFromFlags("", "/path/to/kubeconfig")
    if err != nil {
        panic(err)
    }

    // Create dynamic client
    dynClient, err := dynamic.NewForConfig(config)
    if err != nil {
        panic(err)
    }

    // Use the client
    listPods(dynClient)
}
```

## Working with GroupVersionResource

Unlike typed clients that use Go types, the dynamic client requires you to specify resources using GroupVersionResource (GVR):

```go
func listPods(client dynamic.Interface) {
    // Define the resource we want to access
    podGVR := schema.GroupVersionResource{
        Group:    "",           // Core resources have empty group
        Version:  "v1",
        Resource: "pods",       // Plural form
    }

    // List all pods in a namespace
    list, err := client.Resource(podGVR).
        Namespace("default").
        List(context.Background(), metav1.ListOptions{})
    if err != nil {
        panic(err)
    }

    fmt.Printf("Found %d pods\n", len(list.Items))
    for _, pod := range list.Items {
        fmt.Printf("Pod: %s\n", pod.GetName())
    }
}
```

The Resource method returns a NamespaceableResourceInterface that provides CRUD operations.

## Reading Unstructured Data

Unstructured objects store data in nested maps. Access fields using the UnstructuredContent method or helper functions:

```go
func inspectPod(client dynamic.Interface, name, namespace string) {
    podGVR := schema.GroupVersionResource{
        Group:    "",
        Version:  "v1",
        Resource: "pods",
    }

    // Get a specific pod
    pod, err := client.Resource(podGVR).
        Namespace(namespace).
        Get(context.Background(), name, metav1.GetOptions{})
    if err != nil {
        panic(err)
    }

    // Access metadata
    fmt.Printf("Name: %s\n", pod.GetName())
    fmt.Printf("Namespace: %s\n", pod.GetNamespace())
    fmt.Printf("UID: %s\n", pod.GetUID())

    // Access spec using nested field access
    containerPath := []string{"spec", "containers"}
    containers, found, err := unstructured.NestedSlice(pod.Object, containerPath...)
    if err != nil || !found {
        fmt.Println("No containers found")
        return
    }

    fmt.Printf("Containers: %d\n", len(containers))
    for _, c := range containers {
        container := c.(map[string]interface{})
        fmt.Printf("  - %s: %s\n", container["name"], container["image"])
    }

    // Access status
    phase, found, err := unstructured.NestedString(pod.Object, "status", "phase")
    if found && err == nil {
        fmt.Printf("Phase: %s\n", phase)
    }
}
```

## Creating Resources

Create resources by building unstructured objects:

```go
func createConfigMap(client dynamic.Interface) {
    cmGVR := schema.GroupVersionResource{
        Group:    "",
        Version:  "v1",
        Resource: "configmaps",
    }

    // Build the unstructured object
    cm := &unstructured.Unstructured{
        Object: map[string]interface{}{
            "apiVersion": "v1",
            "kind":       "ConfigMap",
            "metadata": map[string]interface{}{
                "name":      "my-config",
                "namespace": "default",
                "labels": map[string]interface{}{
                    "app": "example",
                },
            },
            "data": map[string]interface{}{
                "config.yaml": "key: value\n",
                "app.conf":    "setting=true\n",
            },
        },
    }

    // Create the resource
    result, err := client.Resource(cmGVR).
        Namespace("default").
        Create(context.Background(), cm, metav1.CreateOptions{})
    if err != nil {
        panic(err)
    }

    fmt.Printf("Created ConfigMap: %s\n", result.GetName())
}
```

## Updating Resources

Update resources by modifying the unstructured object and calling Update:

```go
func updateDeploymentReplicas(client dynamic.Interface, name, namespace string, replicas int64) {
    deployGVR := schema.GroupVersionResource{
        Group:    "apps",
        Version:  "v1",
        Resource: "deployments",
    }

    // Get current deployment
    deploy, err := client.Resource(deployGVR).
        Namespace(namespace).
        Get(context.Background(), name, metav1.GetOptions{})
    if err != nil {
        panic(err)
    }

    // Update replica count
    err = unstructured.SetNestedField(deploy.Object, replicas, "spec", "replicas")
    if err != nil {
        panic(err)
    }

    // Apply update
    updated, err := client.Resource(deployGVR).
        Namespace(namespace).
        Update(context.Background(), deploy, metav1.UpdateOptions{})
    if err != nil {
        panic(err)
    }

    fmt.Printf("Updated deployment %s to %d replicas\n",
        updated.GetName(), replicas)
}
```

## Working with Custom Resources

The dynamic client shines when working with CRDs:

```go
func listCustomResources(client dynamic.Interface) {
    // Define GVR for a custom resource
    appGVR := schema.GroupVersionResource{
        Group:    "example.com",
        Version:  "v1",
        Resource: "applications",  // Plural name from CRD
    }

    // List all custom resources
    list, err := client.Resource(appGVR).
        Namespace("default").
        List(context.Background(), metav1.ListOptions{})
    if err != nil {
        panic(err)
    }

    for _, app := range list.Items {
        name := app.GetName()

        // Access custom fields
        version, found, _ := unstructured.NestedString(app.Object,
            "spec", "version")
        if found {
            fmt.Printf("Application %s version %s\n", name, version)
        }

        // Access status
        ready, found, _ := unstructured.NestedBool(app.Object,
            "status", "ready")
        if found {
            fmt.Printf("  Ready: %v\n", ready)
        }
    }
}
```

## Discovering Resources at Runtime

Combine the dynamic client with discovery to work with resources you discover at runtime:

```go
import (
    "k8s.io/client-go/discovery"
)

func listAllResourceTypes(config *rest.Config) {
    // Create discovery client
    discoveryClient, err := discovery.NewDiscoveryClientForConfig(config)
    if err != nil {
        panic(err)
    }

    // Get all API resources
    _, apiResourceLists, err := discoveryClient.ServerGroupsAndResources()
    if err != nil {
        panic(err)
    }

    // Create dynamic client
    dynClient, err := dynamic.NewForConfig(config)
    if err != nil {
        panic(err)
    }

    // Iterate through discovered resources
    for _, resourceList := range apiResourceLists {
        gv, _ := schema.ParseGroupVersion(resourceList.GroupVersion)

        for _, resource := range resourceList.APIResources {
            // Skip subresources
            if strings.Contains(resource.Name, "/") {
                continue
            }

            gvr := schema.GroupVersionResource{
                Group:    gv.Group,
                Version:  gv.Version,
                Resource: resource.Name,
            }

            // List resources of this type
            var list *unstructured.UnstructuredList
            if resource.Namespaced {
                list, _ = dynClient.Resource(gvr).
                    Namespace("default").
                    List(context.Background(), metav1.ListOptions{Limit: 5})
            } else {
                list, _ = dynClient.Resource(gvr).
                    List(context.Background(), metav1.ListOptions{Limit: 5})
            }

            if list != nil && len(list.Items) > 0 {
                fmt.Printf("%s/%s (%s): %d items\n",
                    gv.Group, resource.Name, gv.Version, len(list.Items))
            }
        }
    }
}
```

## Watching Resources

Watch for resource changes using the dynamic client:

```go
func watchPods(client dynamic.Interface) {
    podGVR := schema.GroupVersionResource{
        Group:    "",
        Version:  "v1",
        Resource: "pods",
    }

    // Start watching
    watcher, err := client.Resource(podGVR).
        Namespace("default").
        Watch(context.Background(), metav1.ListOptions{})
    if err != nil {
        panic(err)
    }
    defer watcher.Stop()

    // Process events
    for event := range watcher.ResultChan() {
        pod := event.Object.(*unstructured.Unstructured)

        fmt.Printf("Event: %s, Pod: %s\n",
            event.Type, pod.GetName())

        phase, _, _ := unstructured.NestedString(pod.Object,
            "status", "phase")
        fmt.Printf("  Phase: %s\n", phase)
    }
}
```

## Helper Functions for Nested Access

Use the unstructured package helpers to safely access nested fields:

```go
// For strings
value, found, err := unstructured.NestedString(obj.Object, "spec", "name")

// For booleans
enabled, found, err := unstructured.NestedBool(obj.Object, "spec", "enabled")

// For integers
count, found, err := unstructured.NestedInt64(obj.Object, "spec", "count")

// For slices
items, found, err := unstructured.NestedSlice(obj.Object, "spec", "items")

// For maps
config, found, err := unstructured.NestedMap(obj.Object, "spec", "config")

// Setting values
err = unstructured.SetNestedField(obj.Object, "value", "spec", "field")
err = unstructured.SetNestedSlice(obj.Object, items, "spec", "items")
```

## Converting Between Structured and Unstructured

Convert typed objects to unstructured when needed:

```go
import (
    "k8s.io/apimachinery/pkg/runtime"
)

func convertToUnstructured(pod *corev1.Pod) (*unstructured.Unstructured, error) {
    unstructuredObj := &unstructured.Unstructured{}
    err := runtime.DefaultUnstructuredConverter.ToUnstructured(pod, &unstructuredObj.Object)
    return unstructuredObj, err
}

func convertFromUnstructured(obj *unstructured.Unstructured) (*corev1.Pod, error) {
    pod := &corev1.Pod{}
    err := runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, pod)
    return pod, err
}
```

The dynamic client provides flexibility to work with any Kubernetes resource without compile-time knowledge of its structure, making it essential for building generic tools and working with dynamically discovered resources.
