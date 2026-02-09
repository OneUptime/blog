# How to Use Table Format API Responses for Custom CLI Tools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API, CLI

Description: Learn how to leverage the Kubernetes Table format API to build custom CLI tools that display resources in human-readable tables, just like kubectl does, without implementing custom formatting logic.

---

When you run `kubectl get pods`, the output is nicely formatted in a table with columns for NAME, READY, STATUS, RESTARTS, and AGE. This formatting is not hardcoded in kubectl. Instead, the Kubernetes API server can return resources in a structured Table format designed for human-readable display. You can use this same capability in your custom CLI tools.

## Understanding the Table Format

The Table format is an alternative representation of Kubernetes resources optimized for display. Instead of returning the full JSON resource, the API server returns a structured table with:

- **Column definitions**: What columns to display and their types
- **Rows**: Data for each resource, pre-formatted for display
- **Resource metadata**: Still included for reference

This means you do not need to write custom formatting logic for each resource type.

## Requesting Table Format

Add an `Accept` header to request table format:

```bash
# Request pods in table format
kubectl get --raw /api/v1/namespaces/default/pods \
    -H "Accept: application/json;as=Table;v=v1;g=meta.k8s.io"
```

The response looks like this:

```json
{
  "kind": "Table",
  "apiVersion": "meta.k8s.io/v1",
  "metadata": {},
  "columnDefinitions": [
    {
      "name": "Name",
      "type": "string",
      "format": "name",
      "description": "Name must be unique within a namespace",
      "priority": 0
    },
    {
      "name": "Ready",
      "type": "string",
      "description": "The aggregate readiness state of this pod for accepting traffic",
      "priority": 0
    },
    {
      "name": "Status",
      "type": "string",
      "description": "The aggregate state of the containers in this pod",
      "priority": 0
    },
    {
      "name": "Restarts",
      "type": "integer",
      "description": "The number of times the containers in this pod have been restarted",
      "priority": 0
    },
    {
      "name": "Age",
      "type": "string",
      "description": "CreationTimestamp is a timestamp representing the server time when this object was created",
      "priority": 0
    }
  ],
  "rows": [
    {
      "cells": ["nginx", "1/1", "Running", 0, "2h"],
      "object": {
        "kind": "Pod",
        "apiVersion": "v1",
        "metadata": {
          "name": "nginx",
          "namespace": "default"
        }
      }
    }
  ]
}
```

## Building a Simple CLI with Table Format

Here is a Go program that uses table format to display pods:

```go
package main

import (
    "context"
    "fmt"
    "os"
    "text/tabwriter"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/apimachinery/pkg/runtime/schema"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
    "k8s.io/client-go/tools/clientcmd"
)

func main() {
    // Build config
    config, err := clientcmd.BuildConfigFromFlags("", clientcmd.RecommendedHomeFile)
    if err != nil {
        panic(err)
    }

    // Create clientset
    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        panic(err)
    }

    // Get table format response
    table, err := getPodTable(clientset.CoreV1().RESTClient(), "default")
    if err != nil {
        panic(err)
    }

    // Display the table
    printTable(table)
}

func getPodTable(client rest.Interface, namespace string) (*metav1.Table, error) {
    // Request pods in table format
    result := client.Get().
        Namespace(namespace).
        Resource("pods").
        SetHeader("Accept", "application/json;as=Table;v=v1;g=meta.k8s.io").
        Do(context.TODO())

    if err := result.Error(); err != nil {
        return nil, err
    }

    // Decode the response as a Table
    table := &metav1.Table{}
    if err := result.Into(table); err != nil {
        return nil, err
    }

    return table, nil
}

func printTable(table *metav1.Table) {
    // Create a tabwriter for aligned output
    w := tabwriter.NewWriter(os.Stdout, 0, 0, 3, ' ', 0)

    // Print column headers
    for i, col := range table.ColumnDefinitions {
        if i > 0 {
            fmt.Fprint(w, "\t")
        }
        fmt.Fprint(w, col.Name)
    }
    fmt.Fprintln(w)

    // Print rows
    for _, row := range table.Rows {
        for i, cell := range row.Cells {
            if i > 0 {
                fmt.Fprint(w, "\t")
            }
            fmt.Fprint(w, cell)
        }
        fmt.Fprintln(w)
    }

    w.Flush()
}
```

Run this program to see pod output formatted just like `kubectl get pods`.

## Working with Different Resource Types

The table format works for any resource type:

```go
func getResourceTable(client rest.Interface, gvr schema.GroupVersionResource, namespace string) (*metav1.Table, error) {
    request := client.Get().
        SetHeader("Accept", "application/json;as=Table;v=v1;g=meta.k8s.io")

    if namespace != "" {
        request = request.Namespace(namespace)
    }

    if gvr.Group != "" {
        request = request.AbsPath("/apis", gvr.Group, gvr.Version, "namespaces", namespace, gvr.Resource)
    } else {
        request = request.Resource(gvr.Resource)
    }

    result := request.Do(context.TODO())
    if err := result.Error(); err != nil {
        return nil, err
    }

    table := &metav1.Table{}
    if err := result.Into(table); err != nil {
        return nil, err
    }

    return table, nil
}

// Usage:
// Deployments
gvr := schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}
table, _ := getResourceTable(client, gvr, "default")

// Services
gvr = schema.GroupVersionResource{Version: "v1", Resource: "services"}
table, _ = getResourceTable(client, gvr, "default")
```

## Adding Custom Columns with IncludeObject

You can request full object data along with the table:

```go
func getTableWithObjects(client rest.Interface, namespace string) (*metav1.Table, error) {
    // Add IncludeObject parameter
    result := client.Get().
        Namespace(namespace).
        Resource("pods").
        SetHeader("Accept", "application/json;as=Table;v=v1;g=meta.k8s.io").
        Param("includeObject", "Object").
        Do(context.TODO())

    table := &metav1.Table{}
    result.Into(table)

    // Now each row has the full object
    for _, row := range table.Rows {
        if row.Object.Object != nil {
            // Access the full pod object
            pod := row.Object.Object.(*corev1.Pod)
            fmt.Printf("Pod: %s, Image: %s\n", pod.Name, pod.Spec.Containers[0].Image)
        }
    }

    return table, nil
}
```

## Filtering with Field and Label Selectors

Apply selectors when requesting tables:

```go
func getFilteredTable(client rest.Interface, namespace string) (*metav1.Table, error) {
    result := client.Get().
        Namespace(namespace).
        Resource("pods").
        SetHeader("Accept", "application/json;as=Table;v=v1;g=meta.k8s.io").
        Param("labelSelector", "app=nginx").
        Param("fieldSelector", "status.phase=Running").
        Do(context.TODO())

    table := &metav1.Table{}
    result.Into(table)
    return table, nil
}
```

## Adding Color to Output

Enhance the table with colors:

```go
import (
    "github.com/fatih/color"
)

func printColoredTable(table *metav1.Table) {
    w := tabwriter.NewWriter(os.Stdout, 0, 0, 3, ' ', 0)

    // Print headers in bold
    headerColor := color.New(color.Bold, color.FgCyan)
    for i, col := range table.ColumnDefinitions {
        if i > 0 {
            fmt.Fprint(w, "\t")
        }
        headerColor.Fprint(w, col.Name)
    }
    fmt.Fprintln(w)

    // Print rows with conditional coloring
    for _, row := range table.Rows {
        for i, cell := range row.Cells {
            if i > 0 {
                fmt.Fprint(w, "\t")
            }

            // Color status column based on value
            if i == 2 { // Assuming Status is column 2
                switch cell {
                case "Running":
                    color.New(color.FgGreen).Fprint(w, cell)
                case "Pending":
                    color.New(color.FgYellow).Fprint(w, cell)
                case "Failed", "Error":
                    color.New(color.FgRed).Fprint(w, cell)
                default:
                    fmt.Fprint(w, cell)
                }
            } else {
                fmt.Fprint(w, cell)
            }
        }
        fmt.Fprintln(w)
    }

    w.Flush()
}
```

## Supporting Wide Output

Handle priority columns for wide output:

```go
func printWideTable(table *metav1.Table, wide bool) {
    w := tabwriter.NewWriter(os.Stdout, 0, 0, 3, ' ', 0)

    // Print headers (only priority 0 columns, or all if wide)
    var visibleCols []int
    for i, col := range table.ColumnDefinitions {
        if wide || col.Priority == 0 {
            visibleCols = append(visibleCols, i)
            if len(visibleCols) > 1 {
                fmt.Fprint(w, "\t")
            }
            fmt.Fprint(w, col.Name)
        }
    }
    fmt.Fprintln(w)

    // Print rows
    for _, row := range table.Rows {
        for i, colIdx := range visibleCols {
            if i > 0 {
                fmt.Fprint(w, "\t")
            }
            if colIdx < len(row.Cells) {
                fmt.Fprint(w, row.Cells[colIdx])
            }
        }
        fmt.Fprintln(w)
    }

    w.Flush()
}
```

## Building a Generic Resource Lister

Create a reusable function for any resource:

```go
func listResource(config *rest.Config, gvr schema.GroupVersionResource, namespace string, selector string) error {
    client, err := kubernetes.NewForConfig(config)
    if err != nil {
        return err
    }

    restClient := client.CoreV1().RESTClient()
    if gvr.Group != "" {
        // For non-core resources, use discovery to get the right client
        restClient = client.AppsV1().RESTClient()
    }

    request := restClient.Get().
        SetHeader("Accept", "application/json;as=Table;v=v1;g=meta.k8s.io").
        Resource(gvr.Resource)

    if namespace != "" {
        request = request.Namespace(namespace)
    }

    if selector != "" {
        request = request.Param("labelSelector", selector)
    }

    result := request.Do(context.TODO())
    table := &metav1.Table{}
    if err := result.Into(table); err != nil {
        return err
    }

    printTable(table)
    return nil
}

// Usage:
// List pods
listResource(config, schema.GroupVersionResource{Version: "v1", Resource: "pods"}, "default", "app=nginx")

// List deployments
listResource(config, schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}, "default", "")
```

## Best Practices

1. **Use table format for display**: It is the standard way kubectl formats output

2. **Cache column definitions**: Column definitions do not change, so cache them

3. **Handle priority levels**: Support wide output using column priority

4. **Add color sparingly**: Use color to highlight important information

5. **Support filtering**: Accept label and field selectors from users

6. **Include objects when needed**: Use `includeObject` to access full resource data

7. **Handle empty results gracefully**: Display a message when no resources match

## Advantages of Table Format

1. **Consistency**: Your tool looks like kubectl
2. **Server-side formatting**: API server handles formatting logic
3. **Extensibility**: Works with custom resources automatically
4. **Efficiency**: Less data transfer than full objects
5. **Maintainability**: No custom formatting code to maintain

## Conclusion

The Kubernetes Table format API provides a powerful way to build CLI tools with kubectl-like output without implementing custom formatting for each resource type. By requesting tables from the API server, you get pre-formatted, human-readable data with column definitions and priority levels already defined. This approach makes building custom Kubernetes CLI tools much simpler while maintaining consistency with standard kubectl output. Whether you are building internal tools, specialized operators, or debugging utilities, the table format API gives you professional-looking output with minimal effort.
