# How to Use Server-Side Dry Run to Validate Kubernetes Manifests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Dry Run, Validation

Description: Learn how to use server-side dry run to validate Kubernetes manifests without creating resources, catching validation errors, admission webhook rejections, and RBAC issues before applying changes.

---

Server-side dry run sends your resource manifest through the entire admission chain without persisting it to etcd. This catches validation errors, admission webhook rejections, and even RBAC permission issues that client-side validation misses. It's essential for testing changes safely before applying them to production clusters.

Unlike client-side dry run that only validates syntax, server-side dry run runs your manifest through the actual API server, giving you confidence that it will work when you remove the dry run flag.

## Basic Server-Side Dry Run

Use dry run with kubectl:

```bash
# Server-side dry run
kubectl apply -f deployment.yaml --dry-run=server

# Client-side dry run (syntax only)
kubectl apply -f deployment.yaml --dry-run=client
```

The difference:

```bash
# Client-side: Only checks YAML syntax
kubectl apply -f deployment.yaml --dry-run=client
# Passes even with invalid field values

# Server-side: Full validation including webhooks
kubectl apply -f deployment.yaml --dry-run=server
# Catches all issues that would occur on real apply
```

## What Server-Side Dry Run Validates

Server-side dry run checks:

1. **Schema validation**: Field types, required fields
2. **Admission controllers**: Both built-in and custom
3. **Validating webhooks**: Custom validation logic
4. **Mutating webhooks**: See what mutations would happen
5. **RBAC permissions**: Whether you can create the resource
6. **Resource quotas**: Whether namespace has capacity
7. **Pod security policies**: Security constraint violations

## Using Dry Run with kubectl

Test a deployment:

```bash
# Dry run apply
kubectl apply -f deployment.yaml --dry-run=server

# Dry run with verbose output
kubectl apply -f deployment.yaml --dry-run=server -v=8

# Dry run and save the result (including mutations)
kubectl apply -f deployment.yaml --dry-run=server -o yaml > result.yaml
```

Test before deleting:

```bash
# Dry run delete
kubectl delete deployment webapp --dry-run=server

# Shows what would be deleted without actually deleting
```

## Server-Side Dry Run in Go

Use dry run in controllers and operators:

```go
package main

import (
    "context"
    "fmt"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

func validateDeployment(ctx context.Context, k8sClient client.Client) error {
    deployment := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "webapp",
            Namespace: "default",
        },
        Spec: appsv1.DeploymentSpec{
            Replicas: ptr.To(int32(3)),
            Selector: &metav1.LabelSelector{
                MatchLabels: map[string]string{
                    "app": "webapp",
                },
            },
            Template: corev1.PodTemplateSpec{
                ObjectMeta: metav1.ObjectMeta{
                    Labels: map[string]string{
                        "app": "webapp",
                    },
                },
                Spec: corev1.PodSpec{
                    Containers: []corev1.Container{
                        {
                            Name:  "nginx",
                            Image: "nginx:latest",
                        },
                    },
                },
            },
        },
    }

    // Create with dry run
    err := k8sClient.Create(ctx, deployment, &client.CreateOptions{
        DryRun: []string{metav1.DryRunAll},
    })

    if err != nil {
        return fmt.Errorf("dry run validation failed: %w", err)
    }

    fmt.Println("Deployment would be created successfully")
    return nil
}
```

## Seeing Mutations from Webhooks

Dry run shows what mutating webhooks would change:

```bash
# Apply with dry run and capture output
kubectl apply -f pod.yaml --dry-run=server -o yaml > mutated-pod.yaml

# Compare original vs mutated
diff pod.yaml mutated-pod.yaml
```

Example output showing webhook mutations:

```yaml
# Original pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: webapp
spec:
  containers:
  - name: nginx
    image: nginx

# mutated-pod.yaml (after dry run)
apiVersion: v1
kind: Pod
metadata:
  name: webapp
  labels:
    injected-by: admission-webhook  # Added by webhook
spec:
  containers:
  - name: nginx
    image: nginx
    resources:  # Added by webhook
      requests:
        cpu: 100m
        memory: 128Mi
```

## Validating Before Updates

Test updates before applying:

```go
func validateUpdate(ctx context.Context, k8sClient client.Client) error {
    // Get current deployment
    deployment := &appsv1.Deployment{}
    err := k8sClient.Get(ctx, client.ObjectKey{
        Name:      "webapp",
        Namespace: "default",
    }, deployment)
    if err != nil {
        return err
    }

    // Modify replica count
    deployment.Spec.Replicas = ptr.To(int32(5))

    // Dry run update
    err = k8sClient.Update(ctx, deployment, &client.UpdateOptions{
        DryRun: []string{metav1.DryRunAll},
    })

    if err != nil {
        return fmt.Errorf("update would fail: %w", err)
    }

    fmt.Println("Update would succeed")
    return nil
}
```

## Testing RBAC Permissions

Dry run reveals RBAC issues:

```bash
# Test if you can create a deployment
kubectl apply -f deployment.yaml --dry-run=server --as=developer

# Output if permission denied:
# Error from server (Forbidden): error when creating "deployment.yaml":
# deployments.apps is forbidden: User "developer" cannot create resource
# "deployments" in API group "apps" in the namespace "default"
```

In code:

```go
func testPermissions(ctx context.Context, k8sClient client.Client, user string) error {
    deployment := &appsv1.Deployment{
        // ... deployment spec
    }

    // Impersonate user
    impersonateConfig := rest.ImpersonationConfig{
        UserName: user,
    }

    // Create client with impersonation
    // (requires setting up impersonation in your config)

    // Try dry run create
    err := k8sClient.Create(ctx, deployment, &client.CreateOptions{
        DryRun: []string{metav1.DryRunAll},
    })

    if err != nil {
        return fmt.Errorf("user %s cannot create deployment: %w", user, err)
    }

    return nil
}
```

## CI/CD Validation Pipeline

Integrate dry run into CI/CD:

```yaml
# GitHub Actions example
name: Validate Manifests
on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Setup kubectl
      uses: azure/setup-kubectl@v3

    - name: Configure kubeconfig
      run: |
        mkdir -p ~/.kube
        echo "${{ secrets.KUBECONFIG }}" > ~/.kube/config

    - name: Dry run all manifests
      run: |
        EXIT_CODE=0
        for file in manifests/*.yaml; do
          echo "Validating $file..."
          if ! kubectl apply -f "$file" --dry-run=server; then
            echo "❌ $file failed validation"
            EXIT_CODE=1
          else
            echo "✅ $file passed validation"
          fi
        done
        exit $EXIT_CODE

    - name: Comment on PR
      if: failure()
      uses: actions/github-script@v6
      with:
        script: |
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: '❌ Manifest validation failed. Check the logs for details.'
          })
```

## Validating Helm Charts

Dry run Helm releases:

```bash
# Helm dry run (client-side)
helm install myapp ./chart --dry-run

# Combine with kubectl server-side dry run
helm template myapp ./chart | kubectl apply --dry-run=server -f -

# Or use Helm's experimental server-side dry run
helm install myapp ./chart --dry-run --dry-run-option=server
```

## Catching Webhook Failures

Test admission webhook behavior:

```bash
# Create pod that violates webhook policy
kubectl apply -f - --dry-run=server <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: privileged-pod
spec:
  containers:
  - name: nginx
    image: nginx
    securityContext:
      privileged: true
EOF

# Output if webhook rejects it:
# Error from server: admission webhook "validate-security.example.com" denied
# the request: privileged containers are not allowed
```

## Testing Resource Quotas

Dry run checks quota limits:

```bash
# Apply deployment that exceeds quota
kubectl apply -f large-deployment.yaml --dry-run=server -n limited-namespace

# Output if quota exceeded:
# Error from server (Forbidden): error when creating "large-deployment.yaml":
# deployments.apps "large-app" is forbidden: exceeded quota: compute-quota,
# requested: requests.cpu=10, used: requests.cpu=5, limited: requests.cpu=10
```

## Combining Dry Run with Diff

Show what would change:

```bash
# Show diff before applying
kubectl diff -f deployment.yaml

# Apply with dry run to validate, then show diff
kubectl apply -f deployment.yaml --dry-run=server
kubectl diff -f deployment.yaml
```

In scripts:

```bash
#!/bin/bash

# Validate manifest
if kubectl apply -f deployment.yaml --dry-run=server > /dev/null 2>&1; then
    echo "Validation passed, showing changes..."
    kubectl diff -f deployment.yaml

    read -p "Apply these changes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kubectl apply -f deployment.yaml
    fi
else
    echo "Validation failed, not applying"
    exit 1
fi
```

## Dry Run with Patches

Test patches before applying:

```bash
# Dry run strategic merge patch
kubectl patch deployment webapp --dry-run=server --type strategic --patch '
{
  "spec": {
    "replicas": 10
  }
}'

# Dry run JSON patch
kubectl patch deployment webapp --dry-run=server --type json --patch '[
  {
    "op": "replace",
    "path": "/spec/replicas",
    "value": 10
  }
]'
```

## Pre-Flight Validation Function

Create a validation helper:

```go
func validateResource(ctx context.Context, k8sClient client.Client, obj client.Object) error {
    // Clone object to avoid modifying the original
    objCopy := obj.DeepCopyObject().(client.Object)

    // Try to create with dry run
    err := k8sClient.Create(ctx, objCopy, &client.CreateOptions{
        DryRun: []string{metav1.DryRunAll},
    })

    if err != nil {
        return fmt.Errorf("validation failed: %w", err)
    }

    return nil
}

// Use in reconciler
func (r *Reconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    deployment := &appsv1.Deployment{
        // ... create deployment spec
    }

    // Validate before creating
    if err := validateResource(ctx, r.Client, deployment); err != nil {
        r.Log.Error(err, "deployment validation failed")
        return ctrl.Result{}, err
    }

    // Now create for real
    if err := r.Client.Create(ctx, deployment); err != nil {
        return ctrl.Result{}, err
    }

    return ctrl.Result{}, nil
}
```

## Testing in Different Namespaces

Validate in target namespace:

```bash
# Dry run in specific namespace
kubectl apply -f deployment.yaml -n production --dry-run=server

# Test if resource would work in namespace
kubectl apply -f deployment.yaml -n test-namespace --dry-run=server
```

## Limitations of Dry Run

Dry run doesn't catch:

- Resource dependencies that aren't created yet
- External system integrations
- Eventual consistency issues
- Timing-dependent problems
- Issues that only appear under load

Always test in a staging environment for complete validation.

Server-side dry run is a powerful validation tool that catches errors before they affect production, making deployments safer and more predictable.
