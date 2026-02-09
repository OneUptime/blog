# How to Use List Pagination with continue Token for Large Resource Lists

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API, Pagination

Description: Learn how to efficiently paginate through large Kubernetes resource lists using the continue token to avoid memory issues and timeouts when working with clusters at scale.

---

When you run `kubectl get pods` in a cluster with thousands of pods, you might wonder how Kubernetes handles such large responses efficiently. The answer lies in pagination using the continue token, a mechanism that allows you to retrieve large resource lists in manageable chunks.

## Why Pagination Matters

In large Kubernetes clusters, listing all resources of a particular type can be overwhelming. Without pagination, the API server would need to load all resources into memory, serialize them, and send them in a single response. This approach leads to several problems:

- Memory pressure on the API server
- Long response times that may exceed timeout limits
- Network bandwidth consumption
- Client-side memory issues when processing massive lists

The continue token mechanism solves these issues by breaking down large result sets into smaller pages.

## How the Continue Token Works

When you make a list request to the Kubernetes API, you can specify a `limit` parameter to control the page size. If the total number of resources exceeds this limit, the API server includes a `continue` token in the response metadata. You use this token in subsequent requests to fetch the next page of results.

The continue token is opaque, meaning its internal structure is an implementation detail you should not depend on. You simply pass it back to the API server in the next request.

## Basic Pagination with kubectl

You can use the `--chunk-size` flag with kubectl to enable pagination:

```bash
# List all pods with pagination, fetching 100 at a time
kubectl get pods --chunk-size=100

# This is equivalent to making multiple API calls behind the scenes
# kubectl handles the continue token automatically
```

For most kubectl operations, you do not need to think about pagination because kubectl handles it automatically when you use `--chunk-size`.

## Programmatic Pagination with client-go

When building controllers or custom tools, you need to handle pagination explicitly. Here is how to do it using the Go client-go library:

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

func listPodsWithPagination(clientset *kubernetes.Clientset, namespace string) error {
    // Set the page size
    limit := int64(100)
    continueToken := ""

    for {
        // Create list options with limit and continue token
        listOptions := metav1.ListOptions{
            Limit:    limit,
            Continue: continueToken,
        }

        // Fetch the current page
        podList, err := clientset.CoreV1().Pods(namespace).List(context.TODO(), listOptions)
        if err != nil {
            return fmt.Errorf("error listing pods: %v", err)
        }

        // Process the pods in this page
        for _, pod := range podList.Items {
            fmt.Printf("Pod: %s, Status: %s\n", pod.Name, pod.Status.Phase)
        }

        // Check if there are more pages
        continueToken = podList.Continue
        if continueToken == "" {
            // No more pages, we are done
            break
        }

        fmt.Printf("Fetching next page (continue: %s...)\n", continueToken[:20])
    }

    return nil
}

func main() {
    // Build config from kubeconfig
    config, err := clientcmd.BuildConfigFromFlags("", "/path/to/kubeconfig")
    if err != nil {
        log.Fatalf("Error building config: %v", err)
    }

    // Create clientset
    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        log.Fatalf("Error creating clientset: %v", err)
    }

    // List pods with pagination
    if err := listPodsWithPagination(clientset, "default"); err != nil {
        log.Fatalf("Error: %v", err)
    }
}
```

This code demonstrates the pagination pattern: you make a request with a limit, process the results, check for a continue token, and repeat until no token is present.

## Using Raw API Requests

You can also paginate using direct HTTP requests to the Kubernetes API:

```bash
# First request with limit
curl -k -H "Authorization: Bearer $TOKEN" \
  "https://kubernetes.default.svc/api/v1/pods?limit=100"

# The response includes metadata.continue if there are more results
# Use it in the next request
curl -k -H "Authorization: Bearer $TOKEN" \
  "https://kubernetes.default.svc/api/v1/pods?limit=100&continue=$CONTINUE_TOKEN"
```

The response JSON structure looks like this:

```json
{
  "kind": "PodList",
  "apiVersion": "v1",
  "metadata": {
    "resourceVersion": "12345",
    "continue": "eyJ2IjoibWV0YS5rOHMuaW8vdjEiLCJydiI6MTIzNDUsInN0YXJ0IjoicG9kLTEwMSJ9"
  },
  "items": [
    // ... pod objects
  ]
}
```

## Choosing an Appropriate Page Size

The optimal page size depends on several factors:

**Small page sizes (10-100 items):**
- Lower memory usage per request
- More API calls required
- Better for resource-constrained clients
- Higher overall latency due to round trips

**Large page sizes (500-1000 items):**
- Fewer API calls needed
- Higher memory usage per request
- Faster overall processing for large datasets
- Risk of timeouts on slow networks

A good starting point is 100-500 items per page. Monitor your application and adjust based on performance characteristics.

## Pagination and ResourceVersion Consistency

When you paginate through a list, Kubernetes uses a consistent snapshot of the data based on the resourceVersion at the time of the first request. This means that even if resources are created or deleted during pagination, your paginated results represent the state at a specific point in time.

However, the continue token has an expiration. If too much time passes between requests, the token may become invalid, and you will need to start over from the beginning.

```go
// Handle continue token expiration
podList, err := clientset.CoreV1().Pods(namespace).List(context.TODO(), listOptions)
if err != nil {
    if errors.IsResourceExpired(err) {
        // Continue token expired, start over
        continueToken = ""
        // Retry the request
    }
    return err
}
```

## Combining Pagination with Field and Label Selectors

You can use pagination alongside field and label selectors to filter results:

```go
listOptions := metav1.ListOptions{
    Limit:         100,
    Continue:      continueToken,
    LabelSelector: "app=nginx",
    FieldSelector: "status.phase=Running",
}

podList, err := clientset.CoreV1().Pods(namespace).List(context.TODO(), listOptions)
```

This approach is particularly useful when you need to process a subset of resources efficiently.

## Best Practices

1. **Always set a limit**: Even if you think the result set is small, always set a reasonable limit to protect against unexpected growth.

2. **Handle token expiration**: Implement retry logic that restarts pagination from the beginning if the continue token expires.

3. **Process incrementally**: Process each page of results as you receive it rather than accumulating all results in memory.

4. **Monitor API server load**: If you are paginating frequently, monitor the impact on API server performance and adjust page sizes accordingly.

5. **Use informers for watch operations**: If you need to continuously track resources, use informers with watch instead of repeated list operations.

## Common Pitfalls

**Storing continue tokens**: Never persist continue tokens across application restarts. They are short-lived and tied to a specific API server state.

**Ignoring errors**: Always check for errors when processing paginated results, especially resource expiration errors.

**Infinite loops**: Ensure your pagination loop terminates when the continue token is empty, not just when you stop receiving results.

## Conclusion

Pagination with continue tokens is essential for working with large resource lists in Kubernetes. By breaking down large result sets into manageable chunks, you reduce memory pressure, avoid timeouts, and build more resilient applications. Whether you use kubectl with chunk sizes or implement pagination in your own controllers, understanding this mechanism helps you work effectively with Kubernetes at scale.
