# How to Implement Impersonation Headers for Testing RBAC Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Security

Description: Learn how to use Kubernetes impersonation headers to test RBAC policies, debug permission issues, and validate access controls without switching between different user credentials.

---

Testing RBAC policies is challenging when you need to verify that different users and service accounts have the correct permissions. Kubernetes impersonation headers allow administrators to make requests as if they were another user, making it easy to test and debug RBAC configurations without managing multiple credentials.

## Understanding Impersonation

Impersonation allows a user with appropriate permissions to make API requests as another user, group, or service account. This is useful for:

- Testing RBAC policies before deploying them
- Debugging permission issues reported by users
- Validating least-privilege access configurations
- Auditing what specific users can do

The key is that only users with impersonation permissions can use this feature, preventing privilege escalation.

## Basic Impersonation with kubectl

The simplest way to impersonate is using kubectl flags:

```bash
# Impersonate as a specific user
kubectl get pods --as=john

# Impersonate as a user in specific groups
kubectl get pods --as=john --as-group=developers --as-group=viewers

# Impersonate a service account
kubectl get pods --as=system:serviceaccount:default:my-sa
```

If you see permission errors, the impersonation is working and showing what that user can actually do.

## Testing RBAC Policies

Before granting permissions to a user, test what they can do:

```bash
# Create a test user binding
kubectl create rolebinding test-binding \
    --clusterrole=view \
    --user=testuser \
    --namespace=default

# Test if testuser can list pods
kubectl auth can-i list pods --as=testuser -n default
# Output: yes

# Test if testuser can delete pods
kubectl auth can-i delete pods --as=testuser -n default
# Output: no

# Try to actually list pods as testuser
kubectl get pods --as=testuser -n default
# Should work

# Try to delete a pod as testuser
kubectl delete pod nginx --as=testuser -n default
# Error from server (Forbidden): pods "nginx" is forbidden: User "testuser" cannot delete resource "pods"
```

## Setting Up Impersonation Permissions

To use impersonation, you need specific RBAC permissions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: impersonator
rules:
# Allow impersonating users
- apiGroups: [""]
  resources: ["users"]
  verbs: ["impersonate"]

# Allow impersonating groups
- apiGroups: [""]
  resources: ["groups"]
  verbs: ["impersonate"]

# Allow impersonating service accounts
- apiGroups: [""]
  resources: ["serviceaccounts"]
  verbs: ["impersonate"]

# Optional: limit impersonation to specific users
- apiGroups: [""]
  resources: ["users"]
  resourceNames: ["testuser", "alice", "bob"]
  verbs: ["impersonate"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: impersonators
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: impersonator
subjects:
- kind: User
  name: admin
  apiGroup: rbac.authorization.k8s.io
```

Apply this configuration:

```bash
kubectl apply -f impersonation-rbac.yaml
```

## Using Impersonation Headers in API Requests

When making direct API requests, use impersonation headers:

```bash
# Get the API server URL
APISERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')

# Get your token
TOKEN=$(kubectl create token default)

# Make a request impersonating another user
curl -k -H "Authorization: Bearer $TOKEN" \
    -H "Impersonate-User: testuser" \
    "$APISERVER/api/v1/namespaces/default/pods"

# Impersonate user with specific groups
curl -k -H "Authorization: Bearer $TOKEN" \
    -H "Impersonate-User: testuser" \
    -H "Impersonate-Group: developers" \
    -H "Impersonate-Group: viewers" \
    "$APISERVER/api/v1/namespaces/default/pods"
```

## Implementing Impersonation in Go

Use impersonation in client-go:

```go
package main

import (
    "context"
    "fmt"
    "log"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
    "k8s.io/client-go/tools/clientcmd"
)

func createImpersonatedClient(username string, groups []string) (*kubernetes.Clientset, error) {
    // Load the base config
    config, err := clientcmd.BuildConfigFromFlags("", clientcmd.RecommendedHomeFile)
    if err != nil {
        return nil, err
    }

    // Set impersonation
    config.Impersonate = rest.ImpersonationConfig{
        UserName: username,
        Groups:   groups,
    }

    // Create clientset with impersonation
    clientset, err := kubernetes.NewForConfig(config)
    return clientset, err
}

func testPermissions(username string, groups []string) {
    // Create impersonated client
    clientset, err := createImpersonatedClient(username, groups)
    if err != nil {
        log.Fatalf("Failed to create client: %v", err)
    }

    // Try to list pods as the impersonated user
    pods, err := clientset.CoreV1().Pods("default").List(
        context.TODO(),
        metav1.ListOptions{},
    )

    if err != nil {
        fmt.Printf("User %s cannot list pods: %v\n", username, err)
        return
    }

    fmt.Printf("User %s can list pods. Found %d pods\n", username, len(pods.Items))
}

func main() {
    // Test as developer user
    testPermissions("alice", []string{"developers"})

    // Test as viewer user
    testPermissions("bob", []string{"viewers"})

    // Test as service account
    testPermissions("system:serviceaccount:default:my-sa", nil)
}
```

## Testing Service Account Permissions

Impersonate service accounts to test their permissions:

```bash
# Create a service account
kubectl create serviceaccount test-sa -n default

# Create a role binding
kubectl create rolebinding test-sa-binding \
    --clusterrole=edit \
    --serviceaccount=default:test-sa \
    --namespace=default

# Test what the service account can do
kubectl auth can-i list pods \
    --as=system:serviceaccount:default:test-sa \
    -n default

# Try listing pods as the service account
kubectl get pods \
    --as=system:serviceaccount:default:test-sa \
    -n default
```

## Building an RBAC Testing Script

Automate RBAC policy testing:

```bash
#!/bin/bash

# RBAC policy testing script

USERS=("alice" "bob" "charlie")
NAMESPACES=("default" "production" "development")
RESOURCES=("pods" "deployments" "services" "secrets")
VERBS=("get" "list" "create" "update" "delete")

echo "RBAC Policy Test Results"
echo "========================"
echo ""

for user in "${USERS[@]}"; do
    echo "Testing user: $user"
    echo "-------------------"

    for namespace in "${NAMESPACES[@]}"; do
        for resource in "${RESOURCES[@]}"; do
            for verb in "${VERBS[@]}"; do
                result=$(kubectl auth can-i $verb $resource --as=$user -n $namespace 2>&1)
                if [[ $result == "yes" ]]; then
                    echo "✓ $user can $verb $resource in $namespace"
                fi
            done
        done
    done
    echo ""
done
```

## Creating a Permission Audit Tool

Build a tool to audit what users can do:

```go
import (
    authorizationv1 "k8s.io/api/authorization/v1"
)

type PermissionAuditor struct {
    clientset *kubernetes.Clientset
}

type PermissionResult struct {
    User      string
    Namespace string
    Resource  string
    Verb      string
    Allowed   bool
}

func (a *PermissionAuditor) AuditUser(username string, namespace string) ([]PermissionResult, error) {
    resources := []string{"pods", "deployments", "services", "secrets"}
    verbs := []string{"get", "list", "create", "update", "delete"}
    var results []PermissionResult

    for _, resource := range resources {
        for _, verb := range verbs {
            sar := &authorizationv1.SubjectAccessReview{
                Spec: authorizationv1.SubjectAccessReviewSpec{
                    User: username,
                    ResourceAttributes: &authorizationv1.ResourceAttributes{
                        Namespace: namespace,
                        Verb:      verb,
                        Resource:  resource,
                    },
                },
            }

            result, err := a.clientset.AuthorizationV1().SubjectAccessReviews().Create(
                context.TODO(),
                sar,
                metav1.CreateOptions{},
            )
            if err != nil {
                return nil, err
            }

            results = append(results, PermissionResult{
                User:      username,
                Namespace: namespace,
                Resource:  resource,
                Verb:      verb,
                Allowed:   result.Status.Allowed,
            })
        }
    }

    return results, nil
}

func (a *PermissionAuditor) PrintAudit(results []PermissionResult) {
    fmt.Printf("\nPermission Audit for %s in %s:\n", results[0].User, results[0].Namespace)
    fmt.Println("================================================")

    for _, result := range results {
        status := "✗"
        if result.Allowed {
            status = "✓"
        }
        fmt.Printf("%s %s %s\n", status, result.Verb, result.Resource)
    }
}
```

## Testing Multi-Namespace Access

Verify users can only access their namespaces:

```bash
# Create namespaces
kubectl create namespace team-a
kubectl create namespace team-b

# Create role bindings
kubectl create rolebinding alice-binding \
    --clusterrole=edit \
    --user=alice \
    --namespace=team-a

kubectl create rolebinding bob-binding \
    --clusterrole=edit \
    --user=bob \
    --namespace=team-b

# Test alice can access team-a but not team-b
kubectl get pods --as=alice -n team-a
# Should work

kubectl get pods --as=alice -n team-b
# Error: User "alice" cannot list resource "pods" in namespace "team-b"

# Test bob can access team-b but not team-a
kubectl get pods --as=bob -n team-b
# Should work

kubectl get pods --as=bob -n team-a
# Error: User "bob" cannot list resource "pods" in namespace "team-a"
```

## Impersonating with Extra Attributes

Add extra attributes to impersonation:

```bash
# Impersonate with extra scopes
kubectl get pods \
    --as=alice \
    --as-group=developers \
    --as-uid=12345

# In Go:
config.Impersonate = rest.ImpersonationConfig{
    UserName: "alice",
    Groups:   []string{"developers"},
    UID:      "12345",
    Extra: map[string][]string{
        "scopes": {"read", "write"},
    },
}
```

## Security Considerations

1. **Limit impersonation permissions**: Only administrators should have impersonation rights

2. **Audit impersonation usage**: Log when impersonation is used

3. **Use resourceNames**: Restrict which users can be impersonated

4. **Avoid in production**: Impersonation is for testing, not normal operations

5. **Document testing procedures**: Maintain RBAC testing documentation

## Common Testing Scenarios

**Test new RBAC policies before applying**:

```bash
# Create the policy
kubectl apply -f new-policy.yaml

# Test it
kubectl auth can-i list secrets --as=newuser -n production
kubectl get secrets --as=newuser -n production
```

**Verify least privilege**:

```bash
# User should only list, not delete
kubectl auth can-i list pods --as=readonly-user
# yes

kubectl auth can-i delete pods --as=readonly-user
# no
```

**Debug permission issues**:

```bash
# User reports they cannot access something
kubectl get deployments --as=reported-user -n their-namespace
# See the exact error they see
```

## Best Practices

1. **Test before granting**: Always test RBAC policies with impersonation before granting to real users

2. **Automate testing**: Create scripts to validate RBAC policies regularly

3. **Document expected permissions**: Maintain documentation of what each role should allow

4. **Use least privilege**: Start with minimal permissions and add as needed

5. **Audit regularly**: Periodically audit user permissions

6. **Test negative cases**: Verify users cannot do things they should not

7. **Test service accounts**: Do not forget to test service account permissions

## Conclusion

Impersonation headers are a powerful tool for testing and validating RBAC policies in Kubernetes. By allowing administrators to make requests as other users without managing multiple credentials, impersonation simplifies RBAC testing, debugging, and validation. Use impersonation to test policies before deployment, verify least-privilege access, and debug permission issues reported by users. Combined with automated testing scripts and regular audits, impersonation helps you maintain secure, well-configured RBAC policies that give users exactly the permissions they need and nothing more.
