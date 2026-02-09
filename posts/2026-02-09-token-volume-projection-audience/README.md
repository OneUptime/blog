# How to Configure Token Volume Projection with Audience and Expiration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, ServiceAccounts

Description: Learn to configure Kubernetes token volume projection with custom audiences and expiration times for enhanced security and service integration.

---

Token volume projection is a powerful Kubernetes feature that gives you fine-grained control over ServiceAccount tokens. By configuring audience restrictions and custom expiration times, you create more secure tokens tailored to specific use cases, improving your cluster's security posture.

## Understanding Token Volume Projection

Traditional ServiceAccount token mounting uses a one-size-fits-all approach. The kubelet mounts a default token with standard properties. Token volume projection changes this by letting you specify exactly what kind of token you need - its audience, expiration time, and mount path.

This matters because different services have different security requirements. A token used to authenticate with the Kubernetes API server needs different properties than a token used for external service authentication. Token projection lets you create multiple tokens with different properties in the same pod.

Projected tokens are bound to the pod's lifecycle and namespace. They're more secure than legacy long-lived tokens because they expire automatically and can't be used outside their intended context.

## Basic Token Projection Configuration

Here's a simple example of projecting a ServiceAccount token with custom properties:

```yaml
# pod-with-projected-token.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
  namespace: production
spec:
  serviceAccountName: app-service-account
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: token-volume
      mountPath: /var/run/secrets/tokens
      readOnly: true
  volumes:
  - name: token-volume
    projected:
      sources:
      - serviceAccountToken:
          path: api-token
          expirationSeconds: 3600
          audience: api-server
```

This configuration creates a token that expires after one hour and is intended for the "api-server" audience. The token is mounted at `/var/run/secrets/tokens/api-token` instead of the default location.

## Configuring Token Audience

The audience claim restricts where a token can be used. Services validate the audience claim and reject tokens not intended for them:

```yaml
# multi-audience-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-service-pod
spec:
  serviceAccountName: app-service-account
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: tokens
      mountPath: /var/run/secrets/tokens
      readOnly: true
    env:
    - name: API_TOKEN_PATH
      value: /var/run/secrets/tokens/api-token
    - name: VAULT_TOKEN_PATH
      value: /var/run/secrets/tokens/vault-token
  volumes:
  - name: tokens
    projected:
      sources:
      # Token for Kubernetes API access
      - serviceAccountToken:
          path: api-token
          expirationSeconds: 3600
          audience: api
      # Token for HashiCorp Vault
      - serviceAccountToken:
          path: vault-token
          expirationSeconds: 600
          audience: vault
```

This pod has two separate tokens. One is for API access with a one-hour lifetime, and another is for Vault authentication with a 10-minute lifetime. Each service validates only tokens with its expected audience.

## Setting Custom Expiration Times

Expiration times balance security and convenience. Shorter lifetimes reduce the window for token misuse, but require more frequent refresh:

```yaml
# short-lived-token-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  serviceAccountName: app-service-account
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: token
      mountPath: /var/run/secrets/tokens
      readOnly: true
  volumes:
  - name: token
    projected:
      sources:
      - serviceAccountToken:
          path: token
          expirationSeconds: 600  # 10 minutes
          audience: api
```

The kubelet automatically refreshes the token before it expires. Your application reads the latest token from the file, so token rotation happens transparently.

For external service integration that can't handle frequent rotation, you might use longer-lived tokens:

```yaml
# long-lived-token-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: batch-job-pod
spec:
  serviceAccountName: batch-job-account
  containers:
  - name: job
    image: batch-job:latest
    volumeMounts:
    - name: token
      mountPath: /var/run/secrets/tokens
  volumes:
  - name: token
    projected:
      sources:
      - serviceAccountToken:
          path: token
          expirationSeconds: 86400  # 24 hours
          audience: batch-processor
```

Choose expiration times based on your security requirements and the capabilities of consuming services. Prefer shorter lifetimes when possible.

## Combining Multiple Projected Resources

Projected volumes can include multiple types of resources, not just ServiceAccount tokens:

```yaml
# combined-projection-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: full-featured-pod
spec:
  serviceAccountName: app-service-account
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: projected-resources
      mountPath: /var/run/secrets
      readOnly: true
  volumes:
  - name: projected-resources
    projected:
      sources:
      # ServiceAccount token
      - serviceAccountToken:
          path: tokens/api-token
          expirationSeconds: 3600
          audience: api
      # ConfigMap data
      - configMap:
          name: app-config
          items:
          - key: config.yaml
            path: config/config.yaml
      # Secret data
      - secret:
          name: app-credentials
          items:
          - key: api-key
            path: credentials/api-key
```

This approach centralizes all pod credentials and configuration into a single volume, simplifying application code and reducing the number of volume mounts needed.

## Token Validation and Audience Checking

Services must validate token audiences to benefit from audience restrictions. Here's an example in Go:

```go
// token-validator.go
package main

import (
    "context"
    "fmt"
    "io/ioutil"

    authv1 "k8s.io/api/authentication/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

func validateToken(clientset *kubernetes.Clientset, token string, expectedAudience string) error {
    // Create a TokenReview request
    review := &authv1.TokenReview{
        Spec: authv1.TokenReviewSpec{
            Token: token,
            Audiences: []string{expectedAudience},
        },
    }

    // Submit the review
    result, err := clientset.AuthenticationV1().TokenReviews().Create(
        context.TODO(),
        review,
        metav1.CreateOptions{},
    )
    if err != nil {
        return fmt.Errorf("token review failed: %v", err)
    }

    // Check if authentication was successful
    if !result.Status.Authenticated {
        return fmt.Errorf("token authentication failed")
    }

    // Verify audience
    audienceMatch := false
    for _, aud := range result.Status.Audiences {
        if aud == expectedAudience {
            audienceMatch = true
            break
        }
    }

    if !audienceMatch {
        return fmt.Errorf("token audience mismatch")
    }

    fmt.Printf("Token valid for user: %s\n", result.Status.User.Username)
    return nil
}

func main() {
    config, err := rest.InClusterConfig()
    if err != nil {
        panic(err.Error())
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        panic(err.Error())
    }

    // Read the projected token
    token, err := ioutil.ReadFile("/var/run/secrets/tokens/api-token")
    if err != nil {
        panic(err.Error())
    }

    // Validate with expected audience
    err = validateToken(clientset, string(token), "api")
    if err != nil {
        panic(err.Error())
    }

    fmt.Println("Token validation successful")
}
```

This code validates both that the token is authentic and that it has the expected audience claim.

## Working with External OIDC Providers

Projected tokens can integrate with external OIDC providers. Configure your cluster's API server with OIDC settings, then create tokens with appropriate audiences:

```yaml
# oidc-integrated-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: oidc-app
spec:
  serviceAccountName: oidc-service-account
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: oidc-token
      mountPath: /var/run/secrets/oidc
  volumes:
  - name: oidc-token
    projected:
      sources:
      - serviceAccountToken:
          path: token
          expirationSeconds: 3600
          audience: https://example.com
```

The token can be used with external services that trust your cluster's OIDC provider. This enables seamless authentication across Kubernetes and external systems.

## Troubleshooting Token Projection

Common issues with projected tokens often relate to expiration or audience mismatch. Check token properties:

```bash
# Exec into the pod
kubectl exec -it app-pod -- sh

# Read the token
cat /var/run/secrets/tokens/api-token

# Decode the JWT (header and payload only)
cat /var/run/secrets/tokens/api-token | cut -d'.' -f2 | base64 -d | jq .

# Check expiration
cat /var/run/secrets/tokens/api-token | cut -d'.' -f2 | base64 -d | jq -r '.exp'
```

If services reject tokens, verify that the audience claim matches what the service expects. Also check that tokens haven't expired and that the kubelet is successfully refreshing them.

## Conclusion

Token volume projection gives you precise control over ServiceAccount tokens. By configuring custom audiences and expiration times, you create tokens tailored to specific security requirements. Use audience restrictions to limit where tokens can be used, and set expiration times appropriate to your threat model. These features enable secure service integration while maintaining strong authentication boundaries.
