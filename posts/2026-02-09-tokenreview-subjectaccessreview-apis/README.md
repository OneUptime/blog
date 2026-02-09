# How to Use Kubernetes TokenReview and SubjectAccessReview APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Authentication, Authorization

Description: Learn how to use TokenReview and SubjectAccessReview APIs to validate authentication tokens, check user permissions, and implement custom authorization logic in your Kubernetes applications.

---

When building custom webhooks, operators, or API extensions for Kubernetes, you often need to validate who is making a request and whether they have permission to perform an action. The TokenReview and SubjectAccessReview APIs provide these capabilities without requiring you to replicate Kubernetes authentication and authorization logic.

## Understanding the Authentication Flow

TokenReview validates that a token is authentic and extracts user information:

1. Client presents a bearer token
2. Your service calls TokenReview API with the token
3. Kubernetes validates the token and returns user information
4. Your service knows who the user is

## Using TokenReview to Validate Tokens

Here is how to validate a bearer token:

```go
package main

import (
    "context"
    "fmt"
    "log"

    authenticationv1 "k8s.io/api/authentication/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/clientcmd"
)

func validateToken(clientset *kubernetes.Clientset, token string) (*authenticationv1.UserInfo, error) {
    // Create a TokenReview request
    tokenReview := &authenticationv1.TokenReview{
        Spec: authenticationv1.TokenReviewSpec{
            Token: token,
        },
    }

    // Submit the review to the API server
    result, err := clientset.AuthenticationV1().TokenReviews().Create(
        context.TODO(),
        tokenReview,
        metav1.CreateOptions{},
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create token review: %v", err)
    }

    // Check if the token was authenticated
    if !result.Status.Authenticated {
        return nil, fmt.Errorf("token is not valid")
    }

    // Return user information
    return &result.Status.User, nil
}

func main() {
    config, err := clientcmd.BuildConfigFromFlags("", clientcmd.RecommendedHomeFile)
    if err != nil {
        log.Fatal(err)
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        log.Fatal(err)
    }

    // Example: validate a token
    token := "eyJhbGciOiJSUzI1NiIs..." // Bearer token from request

    userInfo, err := validateToken(clientset, token)
    if err != nil {
        log.Printf("Token validation failed: %v", err)
        return
    }

    fmt.Printf("Authenticated user: %s\n", userInfo.Username)
    fmt.Printf("User UID: %s\n", userInfo.UID)
    fmt.Printf("Groups: %v\n", userInfo.Groups)
}
```

## Extracting Token from HTTP Requests

In a webhook or API server, extract the token from the Authorization header:

```go
import (
    "net/http"
    "strings"
)

func extractToken(r *http.Request) (string, error) {
    authHeader := r.Header.Get("Authorization")
    if authHeader == "" {
        return "", fmt.Errorf("no authorization header")
    }

    // Authorization header format: "Bearer <token>"
    parts := strings.SplitN(authHeader, " ", 2)
    if len(parts) != 2 || parts[0] != "Bearer" {
        return "", fmt.Errorf("invalid authorization header format")
    }

    return parts[1], nil
}

func authenticateRequest(clientset *kubernetes.Clientset, r *http.Request) (*authenticationv1.UserInfo, error) {
    token, err := extractToken(r)
    if err != nil {
        return nil, err
    }

    return validateToken(clientset, token)
}
```

## Using SubjectAccessReview for Authorization

SubjectAccessReview checks if a user can perform a specific action:

```go
import (
    authorizationv1 "k8s.io/api/authorization/v1"
)

func checkPermission(
    clientset *kubernetes.Clientset,
    username string,
    groups []string,
    verb, resource, namespace string,
) (bool, error) {
    // Create a SubjectAccessReview request
    sar := &authorizationv1.SubjectAccessReview{
        Spec: authorizationv1.SubjectAccessReviewSpec{
            User:   username,
            Groups: groups,
            ResourceAttributes: &authorizationv1.ResourceAttributes{
                Namespace: namespace,
                Verb:      verb,      // get, list, create, update, delete, etc.
                Resource:  resource,  // pods, deployments, services, etc.
            },
        },
    }

    // Submit the review
    result, err := clientset.AuthorizationV1().SubjectAccessReviews().Create(
        context.TODO(),
        sar,
        metav1.CreateOptions{},
    )
    if err != nil {
        return false, fmt.Errorf("failed to create subject access review: %v", err)
    }

    return result.Status.Allowed, nil
}

// Usage example:
func checkUserCanListPods(clientset *kubernetes.Clientset, username string, groups []string) {
    allowed, err := checkPermission(
        clientset,
        username,
        groups,
        "list",      // verb
        "pods",      // resource
        "default",   // namespace
    )

    if err != nil {
        log.Printf("Error checking permission: %v", err)
        return
    }

    if allowed {
        fmt.Printf("%s can list pods in default namespace\n", username)
    } else {
        fmt.Printf("%s cannot list pods in default namespace\n", username)
    }
}
```

## Checking Non-Resource URLs

For non-resource URLs like `/healthz` or `/metrics`:

```go
func checkNonResourcePermission(
    clientset *kubernetes.Clientset,
    username string,
    groups []string,
    path string,
    verb string,
) (bool, error) {
    sar := &authorizationv1.SubjectAccessReview{
        Spec: authorizationv1.SubjectAccessReviewSpec{
            User:   username,
            Groups: groups,
            NonResourceAttributes: &authorizationv1.NonResourceAttributes{
                Path: path,
                Verb: verb,
            },
        },
    }

    result, err := clientset.AuthorizationV1().SubjectAccessReviews().Create(
        context.TODO(),
        sar,
        metav1.CreateOptions{},
    )
    if err != nil {
        return false, err
    }

    return result.Status.Allowed, nil
}

// Usage:
allowed, _ := checkNonResourcePermission(clientset, "john", []string{"developers"}, "/metrics", "get")
```

## Implementing an Authenticating Webhook

Combine TokenReview and SubjectAccessReview in a webhook:

```go
func webhookHandler(clientset *kubernetes.Clientset) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // Step 1: Authenticate the user
        userInfo, err := authenticateRequest(clientset, r)
        if err != nil {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }

        // Step 2: Check if user can access this resource
        allowed, err := checkPermission(
            clientset,
            userInfo.Username,
            userInfo.Groups,
            "create",     // verb from request
            "databases",  // custom resource
            "default",    // namespace from request
        )

        if err != nil {
            http.Error(w, "Error checking permissions", http.StatusInternalServerError)
            return
        }

        if !allowed {
            http.Error(w, "Forbidden", http.StatusForbidden)
            return
        }

        // User is authenticated and authorized
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("Request allowed"))
    }
}
```

## SelfSubjectAccessReview for Current User

Check permissions for the current authenticated user:

```go
import (
    authorizationv1 "k8s.io/api/authorization/v1"
)

func canIListPods(clientset *kubernetes.Clientset, namespace string) (bool, error) {
    // Create a SelfSubjectAccessReview
    ssar := &authorizationv1.SelfSubjectAccessReview{
        Spec: authorizationv1.SelfSubjectAccessReviewSpec{
            ResourceAttributes: &authorizationv1.ResourceAttributes{
                Namespace: namespace,
                Verb:      "list",
                Resource:  "pods",
            },
        },
    }

    result, err := clientset.AuthorizationV1().SelfSubjectAccessReviews().Create(
        context.TODO(),
        ssar,
        metav1.CreateOptions{},
    )
    if err != nil {
        return false, err
    }

    return result.Status.Allowed, nil
}

// This is what `kubectl auth can-i list pods` does internally
```

## LocalSubjectAccessReview for Namespace-Scoped Checks

Check permissions within a specific namespace:

```go
func checkNamespacedPermission(
    clientset *kubernetes.Clientset,
    namespace, username string,
    groups []string,
    verb, resource string,
) (bool, error) {
    lsar := &authorizationv1.LocalSubjectAccessReview{
        ObjectMeta: metav1.ObjectMeta{
            Namespace: namespace,
        },
        Spec: authorizationv1.SubjectAccessReviewSpec{
            User:   username,
            Groups: groups,
            ResourceAttributes: &authorizationv1.ResourceAttributes{
                Namespace: namespace,
                Verb:      verb,
                Resource:  resource,
            },
        },
    }

    result, err := clientset.AuthorizationV1().LocalSubjectAccessReviews(namespace).Create(
        context.TODO(),
        lsar,
        metav1.CreateOptions{},
    )
    if err != nil {
        return false, err
    }

    return result.Status.Allowed, nil
}
```

## Checking Multiple Permissions

Efficiently check multiple permissions:

```go
type PermissionCheck struct {
    Verb      string
    Resource  string
    Namespace string
}

func checkMultiplePermissions(
    clientset *kubernetes.Clientset,
    username string,
    groups []string,
    checks []PermissionCheck,
) (map[string]bool, error) {
    results := make(map[string]bool)

    for _, check := range checks {
        key := fmt.Sprintf("%s:%s:%s", check.Verb, check.Resource, check.Namespace)

        allowed, err := checkPermission(
            clientset,
            username,
            groups,
            check.Verb,
            check.Resource,
            check.Namespace,
        )
        if err != nil {
            return nil, err
        }

        results[key] = allowed
    }

    return results, nil
}

// Usage:
checks := []PermissionCheck{
    {Verb: "get", Resource: "pods", Namespace: "default"},
    {Verb: "list", Resource: "deployments", Namespace: "default"},
    {Verb: "create", Resource: "services", Namespace: "production"},
}

results, _ := checkMultiplePermissions(clientset, "alice", []string{"developers"}, checks)
for key, allowed := range results {
    fmt.Printf("%s: %v\n", key, allowed)
}
```

## Caching Authorization Decisions

Authorization checks can be expensive. Implement caching:

```go
import (
    "sync"
    "time"
)

type AuthzCache struct {
    cache map[string]cacheEntry
    mu    sync.RWMutex
    ttl   time.Duration
}

type cacheEntry struct {
    allowed   bool
    timestamp time.Time
}

func NewAuthzCache(ttl time.Duration) *AuthzCache {
    return &AuthzCache{
        cache: make(map[string]cacheEntry),
        ttl:   ttl,
    }
}

func (c *AuthzCache) Check(key string) (bool, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()

    entry, exists := c.cache[key]
    if !exists {
        return false, false
    }

    if time.Since(entry.timestamp) > c.ttl {
        return false, false
    }

    return entry.allowed, true
}

func (c *AuthzCache) Set(key string, allowed bool) {
    c.mu.Lock()
    defer c.mu.Unlock()

    c.cache[key] = cacheEntry{
        allowed:   allowed,
        timestamp: time.Now(),
    }
}

func checkPermissionCached(
    clientset *kubernetes.Clientset,
    cache *AuthzCache,
    username string,
    groups []string,
    verb, resource, namespace string,
) (bool, error) {
    key := fmt.Sprintf("%s:%v:%s:%s:%s", username, groups, verb, resource, namespace)

    // Check cache first
    if allowed, found := cache.Check(key); found {
        return allowed, nil
    }

    // Call API
    allowed, err := checkPermission(clientset, username, groups, verb, resource, namespace)
    if err != nil {
        return false, err
    }

    // Cache result
    cache.Set(key, allowed)
    return allowed, nil
}
```

## Best Practices

1. **Always validate tokens**: Never trust bearer tokens without verification

2. **Check permissions before action**: Use SubjectAccessReview before performing sensitive operations

3. **Use appropriate review types**: SelfSubjectAccessReview for current user, LocalSubjectAccessReview for namespace-scoped

4. **Cache authorization results**: Reduce API server load with short-lived caches

5. **Handle errors gracefully**: Treat errors as permission denied for security

6. **Log authorization failures**: Track unauthorized access attempts

7. **Set reasonable cache TTLs**: Balance performance with security (30-60 seconds typical)

8. **Check both authentication and authorization**: Authenticated does not mean authorized

## Use Cases

**Custom API servers**: Validate incoming requests using Kubernetes authentication

**Webhooks**: Check if the requesting user has permission to perform the operation

**CLI tools**: Implement `can-i` style permission checks

**Audit logging**: Track who attempted what actions

**Multi-tenant systems**: Verify users can only access their own namespaces

## Conclusion

TokenReview and SubjectAccessReview APIs are essential for building Kubernetes-native applications that need to authenticate users and check permissions. By delegating authentication and authorization to the Kubernetes API server, you avoid reimplementing complex security logic and ensure consistency with cluster RBAC policies. Whether you are building webhooks, custom controllers, or API extensions, these APIs provide the foundation for secure, permission-aware applications that integrate seamlessly with Kubernetes security models.
