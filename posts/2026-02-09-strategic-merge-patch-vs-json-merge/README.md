# How to Use Strategic Merge Patch vs JSON Merge Patch for Resource Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Patch, Resource Updates

Description: Learn the differences between strategic merge patch and JSON merge patch in Kubernetes, understanding when to use each patch type for updating resources effectively.

---

Kubernetes supports several patch strategies for updating resources. Strategic merge patch and JSON merge patch are the most common, each with different merge behaviors. Understanding these differences prevents unexpected data loss and makes resource updates more predictable.

Strategic merge patch uses Kubernetes-specific merge logic based on field schemas, while JSON merge patch follows standard JSON merge semantics. Choosing the right strategy depends on what you're updating and how you want arrays and maps to merge.

## Patch Types Overview

Kubernetes supports three main patch types:

**Strategic Merge Patch**: Kubernetes-specific merge using schema information. Handles arrays and maps intelligently.

**JSON Merge Patch**: Standard JSON merge (RFC 7386). Simple replacement semantics.

**JSON Patch**: JSON Patch operations (RFC 6902). Precise field operations with add, remove, replace, etc.

## Strategic Merge Patch

Strategic merge patch understands Kubernetes resource schemas and merges intelligently:

```go
package main

import (
    "context"

    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/types"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

func strategicMergePatch(ctx context.Context, k8sClient client.Client) error {
    patch := []byte(`{
        "metadata": {
            "labels": {
                "environment": "production"
            }
        },
        "spec": {
            "containers": [
                {
                    "name": "nginx",
                    "image": "nginx:1.22"
                }
            ]
        }
    }`)

    pod := &corev1.Pod{}
    return k8sClient.Patch(ctx, pod, client.RawPatch(types.StrategicMergePatchType, patch))
}
```

With kubectl:

```bash
kubectl patch pod mypod --type strategic --patch '
{
  "spec": {
    "containers": [
      {
        "name": "nginx",
        "image": "nginx:1.22"
      }
    ]
  }
}'
```

## JSON Merge Patch

JSON merge patch follows standard JSON merge semantics:

```go
func jsonMergePatch(ctx context.Context, k8sClient client.Client) error {
    patch := []byte(`{
        "metadata": {
            "labels": {
                "environment": "production"
            }
        }
    }`)

    pod := &corev1.Pod{}
    return k8sClient.Patch(ctx, pod, client.RawPatch(types.MergePatchType, patch))
}
```

With kubectl:

```bash
kubectl patch pod mypod --type merge --patch '
{
  "metadata": {
    "labels": {
      "environment": "production"
    }
  }
}'
```

## Array Handling Differences

This is where the patch types differ most significantly.

**Strategic Merge Patch** merges arrays using merge keys:

```bash
# Original pod has two containers
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: nginx
    image: nginx:1.21
  - name: sidecar
    image: sidecar:1.0

# Strategic merge patch updates nginx container
kubectl patch pod mypod --type strategic --patch '
{
  "spec": {
    "containers": [
      {
        "name": "nginx",
        "image": "nginx:1.22"
      }
    ]
  }
}'

# Result: Both containers present, nginx updated
spec:
  containers:
  - name: nginx
    image: nginx:1.22  # Updated
  - name: sidecar
    image: sidecar:1.0  # Preserved
```

**JSON Merge Patch** replaces the entire array:

```bash
# Same original pod
# JSON merge patch with one container
kubectl patch pod mypod --type merge --patch '
{
  "spec": {
    "containers": [
      {
        "name": "nginx",
        "image": "nginx:1.22"
      }
    ]
  }
}'

# Result: Sidecar container removed!
spec:
  containers:
  - name: nginx
    image: nginx:1.22  # Only nginx remains
```

## Map Handling

Both patch types handle maps similarly, but with subtle differences.

**Strategic Merge Patch**:

```bash
# Original labels
metadata:
  labels:
    app: webapp
    environment: dev
    team: platform

# Patch
kubectl patch pod mypod --type strategic --patch '
{
  "metadata": {
    "labels": {
      "environment": "production"
    }
  }
}'

# Result: Merges labels
metadata:
  labels:
    app: webapp
    environment: production  # Updated
    team: platform  # Preserved
```

**JSON Merge Patch** behaves the same way for maps:

```bash
kubectl patch pod mypod --type merge --patch '
{
  "metadata": {
    "labels": {
      "environment": "production"
    }
  }
}'

# Result: Same as strategic merge for maps
metadata:
  labels:
    app: webapp
    environment: production
    team: platform
```

## Deleting Fields

**Strategic Merge Patch** uses special directives:

```bash
# Delete a label
kubectl patch pod mypod --type strategic --patch '
{
  "metadata": {
    "labels": {
      "team": null
    }
  }
}'

# Delete an entire array element
kubectl patch deployment webapp --type strategic --patch '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [
          {
            "name": "sidecar",
            "$patch": "delete"
          }
        ]
      }
    }
  }
}'
```

**JSON Merge Patch** uses `null`:

```bash
# Delete a label
kubectl patch pod mypod --type merge --patch '
{
  "metadata": {
    "labels": {
      "team": null
    }
  }
}'

# Cannot delete individual array elements - must replace entire array
```

## When to Use Strategic Merge Patch

Use strategic merge patch when:

**Updating specific container images**: Merge by container name without affecting other containers.

```go
func updateContainerImage(ctx context.Context, k8sClient client.Client) error {
    patch := []byte(`{
        "spec": {
            "template": {
                "spec": {
                    "containers": [
                        {
                            "name": "app",
                            "image": "myapp:v2.0"
                        }
                    ]
                }
            }
        }
    }`)

    deployment := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "webapp",
            Namespace: "default",
        },
    }

    return k8sClient.Patch(ctx, deployment, client.RawPatch(types.StrategicMergePatchType, patch))
}
```

**Adding environment variables**: Add without removing existing vars.

```go
func addEnvVar(ctx context.Context, k8sClient client.Client) error {
    patch := []byte(`{
        "spec": {
            "template": {
                "spec": {
                    "containers": [
                        {
                            "name": "app",
                            "env": [
                                {
                                    "name": "LOG_LEVEL",
                                    "value": "debug"
                                }
                            ]
                        }
                    ]
                }
            }
        }
    }`)

    deployment := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "webapp",
            Namespace: "default",
        },
    }

    return k8sClient.Patch(ctx, deployment, client.RawPatch(types.StrategicMergePatchType, patch))
}
```

**Working with built-in Kubernetes resources**: They have merge key annotations.

## When to Use JSON Merge Patch

Use JSON merge patch when:

**Replacing entire arrays**: You want to set the complete list.

```go
func replaceEntireContainerList(ctx context.Context, k8sClient client.Client) error {
    patch := []byte(`{
        "spec": {
            "template": {
                "spec": {
                    "containers": [
                        {
                            "name": "app",
                            "image": "myapp:v2.0"
                        }
                    ]
                }
            }
        }
    }`)

    deployment := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "webapp",
            Namespace: "default",
        },
    }

    return k8sClient.Patch(ctx, deployment, client.RawPatch(types.MergePatchType, patch))
}
```

**Updating CRDs without merge annotations**: Custom resources without strategic merge directives.

**Simple map updates**: When you only need to update maps, not arrays.

## JSON Patch for Precise Operations

For precise control, use JSON Patch:

```go
func jsonPatchExample(ctx context.Context, k8sClient client.Client) error {
    patch := []byte(`[
        {
            "op": "replace",
            "path": "/spec/replicas",
            "value": 5
        },
        {
            "op": "add",
            "path": "/metadata/labels/version",
            "value": "v2.0"
        },
        {
            "op": "remove",
            "path": "/metadata/labels/legacy"
        }
    ]`)

    deployment := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "webapp",
            Namespace: "default",
        },
    }

    return k8sClient.Patch(ctx, deployment, client.RawPatch(types.JSONPatchType, patch))
}
```

With kubectl:

```bash
kubectl patch deployment webapp --type json --patch '[
  {
    "op": "replace",
    "path": "/spec/replicas",
    "value": 5
  },
  {
    "op": "add",
    "path": "/metadata/labels/version",
    "value": "v2.0"
  }
]'
```

## Array Index Operations with JSON Patch

JSON Patch allows array index operations:

```bash
# Update specific container by index
kubectl patch pod mypod --type json --patch '[
  {
    "op": "replace",
    "path": "/spec/containers/0/image",
    "value": "nginx:1.22"
  }
]'

# Add container at specific position
kubectl patch pod mypod --type json --patch '[
  {
    "op": "add",
    "path": "/spec/containers/1",
    "value": {
      "name": "sidecar",
      "image": "sidecar:latest"
    }
  }
]'

# Remove container by index
kubectl patch pod mypod --type json --patch '[
  {
    "op": "remove",
    "path": "/spec/containers/1"
  }
]'
```

## Testing Patch Behavior

Test different patch types:

```bash
# Create test deployment
kubectl create deployment test --image=nginx:1.21

# Add a second container for testing
kubectl patch deployment test --type strategic --patch '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [
          {
            "name": "sidecar",
            "image": "busybox"
          }
        ]
      }
    }
  }
}'

# Verify both containers exist
kubectl get deployment test -o jsonpath='{.spec.template.spec.containers[*].name}'
# Output: nginx sidecar

# Test JSON merge (replaces array)
kubectl patch deployment test --type merge --patch '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [
          {
            "name": "nginx",
            "image": "nginx:1.22"
          }
        ]
      }
    }
  }
}'

# Check containers again
kubectl get deployment test -o jsonpath='{.spec.template.spec.containers[*].name}'
# Output: nginx (sidecar removed!)
```

## Choosing the Right Patch Type

Decision matrix:

| Operation | Recommended Patch Type |
|-----------|----------------------|
| Update container image | Strategic Merge |
| Add environment variable | Strategic Merge |
| Change replica count | Any type |
| Update single label | Any type |
| Replace all containers | JSON Merge or JSON Patch |
| Remove specific container | Strategic Merge with $patch: delete |
| Precise index operation | JSON Patch |
| Update custom resource | JSON Merge (if no merge keys) |

## Common Pitfalls

Using JSON merge patch on arrays unintentionally removes elements:

```bash
# WRONG: This removes other containers!
kubectl patch deployment webapp --type merge --patch '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{"name": "app", "image": "newimage"}]
      }
    }
  }
}'

# RIGHT: Use strategic merge
kubectl patch deployment webapp --type strategic --patch '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{"name": "app", "image": "newimage"}]
      }
    }
  }
}'
```

Understanding patch type behavior prevents accidental data loss and makes resource updates more predictable and safe.
