# How to Use kubectl auth can-i to Test RBAC Permissions Before Deploying

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, RBAC

Description: Learn how to verify RBAC permissions with kubectl auth can-i before deploying resources, preventing authorization failures and debugging permission issues in Kubernetes clusters.

---

RBAC authorization failures happen at the worst times, usually during production deployments. The `kubectl auth can-i` command lets you verify permissions before taking actions, preventing authorization errors and debugging access issues without trial and error.

## Understanding kubectl auth can-i

The command checks whether you can perform specific actions on resources:

```bash
# Check if you can create pods
kubectl auth can-i create pods

# Check if you can delete deployments
kubectl auth can-i delete deployments

# Check if you can list secrets
kubectl auth can-i list secrets
```

It returns `yes` or `no` and exits with status 0 for allowed actions, 1 for denied actions.

## Basic Permission Checks

Test common operations before running them:

```bash
# Can I create a deployment?
kubectl auth can-i create deployment

# Can I delete services?
kubectl auth can-i delete service

# Can I get pods?
kubectl auth can-i get pods

# Can I update configmaps?
kubectl auth can-i update configmaps

# Can I patch nodes?
kubectl auth can-i patch nodes
```

These checks work for any resource type and verb combination Kubernetes supports.

## Namespace-Specific Checks

RBAC permissions often vary by namespace:

```bash
# Check permissions in specific namespace
kubectl auth can-i create pods -n production

# Compare permissions across namespaces
kubectl auth can-i create deployments -n development
kubectl auth can-i create deployments -n production

# Check default namespace
kubectl auth can-i delete pods -n default
```

Always verify permissions in the target namespace before operations.

## Checking Permissions for Other Users

Cluster administrators can check permissions for other users or service accounts:

```bash
# Check what a specific user can do
kubectl auth can-i create deployments --as=developer@example.com

# Check service account permissions
kubectl auth can-i get secrets --as=system:serviceaccount:default:my-app

# Check with group impersonation
kubectl auth can-i delete pods --as=user@example.com --as-group=developers
```

This helps validate RBAC configurations before granting access.

## Checking Subresource Access

Some resources have subresources with separate permissions:

```bash
# Check pod log access
kubectl auth can-i get pods/log

# Check pod exec permissions
kubectl auth can-i create pods/exec

# Check pod port-forward access
kubectl auth can-i create pods/portforward

# Check deployment scale permissions
kubectl auth can-i update deployments/scale

# Check service proxy access
kubectl auth can-i get services/proxy
```

Users might have access to resources but not their subresources, or vice versa.

## All Namespace Checks

Verify cluster-wide permissions:

```bash
# Can I list pods across all namespaces?
kubectl auth can-i list pods --all-namespaces

# Can I create namespaces?
kubectl auth can-i create namespaces

# Can I view nodes?
kubectl auth can-i get nodes

# Can I create cluster roles?
kubectl auth can-i create clusterroles
```

These check permissions that span the entire cluster rather than single namespaces.

## Using in Scripts for Safety

Integrate permission checks into deployment scripts:

```bash
#!/bin/bash
# safe-deploy.sh - Check permissions before deploying

set -e

NAMESPACE="production"

# Check required permissions
echo "Verifying permissions..."

if ! kubectl auth can-i create deployments -n $NAMESPACE; then
    echo "Error: Missing permission to create deployments in $NAMESPACE"
    exit 1
fi

if ! kubectl auth can-i create services -n $NAMESPACE; then
    echo "Error: Missing permission to create services in $NAMESPACE"
    exit 1
fi

if ! kubectl auth can-i create configmaps -n $NAMESPACE; then
    echo "Error: Missing permission to create configmaps in $NAMESPACE"
    exit 1
fi

echo "All permissions verified"

# Proceed with deployment
kubectl apply -f deployment.yaml -n $NAMESPACE
kubectl apply -f service.yaml -n $NAMESPACE
kubectl apply -f configmap.yaml -n $NAMESPACE

echo "Deployment complete"
```

This prevents partial deployments due to permission failures midway through.

## Checking Multiple Permissions

Create functions to check permission sets:

```bash
#!/bin/bash
# Check if user has full deployment permissions

check_deployment_permissions() {
    local namespace=$1
    local required_perms=(
        "create:deployments"
        "get:deployments"
        "update:deployments"
        "delete:deployments"
        "create:services"
        "get:pods"
    )

    echo "Checking deployment permissions in $namespace..."

    for perm in "${required_perms[@]}"; do
        IFS=':' read -r verb resource <<< "$perm"
        if ! kubectl auth can-i $verb $resource -n $namespace > /dev/null 2>&1; then
            echo "Missing permission: $verb $resource"
            return 1
        fi
    done

    echo "All deployment permissions present"
    return 0
}

# Usage
if check_deployment_permissions production; then
    echo "Ready to deploy"
else
    echo "Missing required permissions"
    exit 1
fi
```

This validates entire permission sets needed for complex operations.

## Debugging RBAC Issues

When access is denied, use can-i to narrow down the issue:

```bash
# Test general resource access
kubectl auth can-i get pods -n production
# Output: no

# Check if it's namespace-specific
kubectl auth can-i get pods -n development
# Output: yes

# Check cluster-wide access
kubectl auth can-i get pods --all-namespaces
# Output: no

# Conclusion: You have pod access in development but not production
```

This systematic testing identifies permission gaps quickly.

## Validating Service Account Permissions

Before assigning service accounts to pods, verify their permissions:

```bash
# Check what a service account can do
SA="system:serviceaccount:default:webapp"

kubectl auth can-i get secrets --as=$SA
kubectl auth can-i create configmaps --as=$SA
kubectl auth can-i list pods --as=$SA

# Check specific resource access
kubectl auth can-i get secrets/database-password --as=$SA -n default
```

This prevents deploying pods with insufficient service account permissions.

## CI/CD Permission Validation

Validate CI/CD service account permissions in pipelines:

```bash
#!/bin/bash
# ci-permission-check.sh

SA="system:serviceaccount:ci:gitlab-runner"

echo "Validating CI/CD service account permissions..."

required_permissions=(
    "get:pods"
    "list:pods"
    "create:deployments"
    "update:deployments"
    "create:services"
    "get:configmaps"
)

failed=0
for perm in "${required_permissions[@]}"; do
    IFS=':' read -r verb resource <<< "$perm"
    if kubectl auth can-i $verb $resource --as=$SA -n production; then
        echo "✓ $verb $resource"
    else
        echo "✗ $verb $resource"
        failed=1
    fi
done

if [ $failed -eq 1 ]; then
    echo "Permission validation failed"
    exit 1
fi

echo "All permissions validated"
```

Run this before configuring CI/CD to ensure service accounts have necessary access.

## Listing All Permissions

While can-i checks specific permissions, you can list all allowed actions:

```bash
# Install rbac-tool plugin for comprehensive listing
kubectl krew install rbac-tool

# List all permissions for current user
kubectl rbac-tool lookup

# List permissions for service account
kubectl rbac-tool lookup system:serviceaccount:default:my-app

# Get permission matrix
kubectl rbac-tool viz
```

This provides a complete view of granted permissions. See https://oneuptime.com/blog/post/2026-02-09-kubectl-plugins-krew-package-manager/view for information on installing kubectl plugins.

## Checking Custom Resource Permissions

CRDs work with can-i just like built-in resources:

```bash
# Check custom resource access
kubectl auth can-i create applications.argoproj.io

# Check specific CRD instance
kubectl auth can-i get applications.argoproj.io/my-app -n production

# Check CRD definition access
kubectl auth can-i create customresourcedefinitions
```

This validates permissions for operators and custom controllers.

## Permission Checks in Admission Controllers

Admission webhooks can use can-i logic to enforce permission-based policies:

```bash
# Check if pod's service account can access required secrets
POD_SA="system:serviceaccount:default:webapp"
SECRET_NAME="database-password"

if ! kubectl auth can-i get secrets/$SECRET_NAME --as=$POD_SA -n default; then
    echo "Pod's service account cannot access required secret"
    # Admission webhook would reject the pod
fi
```

This enables permission validation during resource creation.

## Checking Wildcard Permissions

Test whether wildcard permissions are granted:

```bash
# Check if user can do anything with pods
kubectl auth can-i '*' pods

# Check if user has full cluster access
kubectl auth can-i '*' '*'

# Check namespace-level wildcard
kubectl auth can-i '*' '*' -n production
```

Wildcard permissions indicate broad access levels.

## Permission Auditing

Create audit scripts to verify expected permissions:

```bash
#!/bin/bash
# audit-permissions.sh

USERS=(
    "developer1@example.com"
    "developer2@example.com"
    "devops@example.com"
)

RESOURCES=("pods" "deployments" "services")
VERBS=("get" "create" "delete")

echo "Permission Audit Report"
echo "======================="

for user in "${USERS[@]}"; do
    echo -e "\nUser: $user"
    for resource in "${RESOURCES[@]}"; do
        for verb in "${VERBS[@]}"; do
            if kubectl auth can-i $verb $resource --as=$user -n production > /dev/null 2>&1; then
                result="✓"
            else
                result="✗"
            fi
            printf "  %s %-8s %-12s\n" "$result" "$verb" "$resource"
        done
    done
done
```

This generates permission reports for compliance and security reviews.

## Handling Permission Denials

When permissions are denied, get specific information:

```bash
# Verbose output shows denial reason
kubectl auth can-i create pods -n production -v=6

# Check role bindings affecting permissions
kubectl get rolebindings -n production
kubectl get clusterrolebindings

# Describe specific role
kubectl describe role developer -n production

# Check which service account is in use
kubectl config view --minify | grep service-account
```

Verbose output reveals which RBAC rules are evaluated.

## Temporary Permission Testing

Test with temporary elevated permissions:

```bash
# Admin creates temporary role binding for testing
kubectl create rolebinding temp-test \
    --clusterrole=edit \
    --user=developer@example.com \
    --namespace=production

# Developer tests permissions
kubectl auth can-i create deployments -n production

# Admin removes temporary binding
kubectl delete rolebinding temp-test -n production
```

This enables safe permission testing without permanent changes.

## Integration with Policy Enforcement

Combine can-i with policy tools:

```bash
#!/bin/bash
# enforce-least-privilege.sh

# Check if service account has excessive permissions
SA="system:serviceaccount:default:webapp"

# These should NOT be allowed
if kubectl auth can-i create clusterroles --as=$SA; then
    echo "WARNING: Service account can create cluster roles"
    exit 1
fi

if kubectl auth can-i delete nodes --as=$SA; then
    echo "WARNING: Service account can delete nodes"
    exit 1
fi

echo "Service account permissions follow least privilege"
```

This enforces security policies programmatically.

kubectl auth can-i turns permission verification from guesswork into certainty. Check permissions before operations, validate RBAC configurations, and debug access issues systematically. Integrate these checks into scripts and pipelines to prevent authorization failures in production. For more kubectl debugging techniques, see https://oneuptime.com/blog/post/2026-01-25-kubectl-describe-debugging/view.
