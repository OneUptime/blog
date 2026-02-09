# How to Implement Vault JWT/OIDC Auth for Service Mesh Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vault, JWT, OIDC, Service Mesh, Kubernetes

Description: Learn how to configure HashiCorp Vault JWT/OIDC authentication for seamless service mesh integration in Kubernetes, enabling secure identity-based authentication for microservices.

---

Service mesh architectures require robust authentication mechanisms to secure communication between services. HashiCorp Vault's JWT/OIDC authentication method provides a powerful way to integrate identity-based authentication with service meshes like Istio, Linkerd, and Consul Connect. This guide walks you through implementing Vault JWT/OIDC auth for service mesh integration.

## Understanding JWT/OIDC Authentication in Service Mesh

Service meshes use identity proxies to handle authentication and authorization between services. When integrated with Vault, each service can authenticate using JWT tokens issued by the service mesh control plane. Vault verifies these tokens and grants access to secrets based on the service identity.

The JWT/OIDC auth method in Vault validates JSON Web Tokens signed by a trusted identity provider. In a service mesh context, the identity provider is typically the service mesh control plane itself, which issues workload identities to each service.

## Configuring Vault JWT Auth for Istio

Istio uses SPIFFE identities and issues JWT tokens that can be validated by Vault. First, enable the JWT auth method in Vault:

```bash
# Enable JWT auth method
vault auth enable jwt

# Configure JWT auth with Istio's JWKS endpoint
vault write auth/jwt/config \
    jwks_url="http://istio-pilot.istio-system:8080/jwks" \
    bound_issuer="https://kubernetes.default.svc.cluster.local"
```

The JWKS (JSON Web Key Set) endpoint provides the public keys used to verify JWT signatures. Istio's pilot component exposes this endpoint for token validation.

## Creating Role Mappings for Service Identities

Define roles that map service identities to Vault policies. This ensures each service only accesses secrets it needs:

```bash
# Create a role for the orders service
vault write auth/jwt/role/orders-service \
    role_type="jwt" \
    bound_audiences="vault" \
    user_claim="sub" \
    bound_subject="spiffe://cluster.local/ns/production/sa/orders" \
    policies="orders-secrets" \
    ttl=1h

# Create a role for the payments service
vault write auth/jwt/role/payments-service \
    role_type="jwt" \
    bound_audiences="vault" \
    user_claim="sub" \
    bound_subject="spiffe://cluster.local/ns/production/sa/payments" \
    policies="payments-secrets" \
    ttl=1h
```

The `bound_subject` parameter matches the SPIFFE identity issued by Istio. The `bound_audiences` parameter ensures tokens are intended for Vault.

## Implementing OIDC Discovery for Dynamic Configuration

For environments where JWKS URLs change, use OIDC discovery to automatically fetch configuration:

```bash
# Configure JWT auth with OIDC discovery URL
vault write auth/jwt/config \
    oidc_discovery_url="https://kubernetes.default.svc.cluster.local" \
    oidc_discovery_ca_pem=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
    bound_issuer="https://kubernetes.default.svc.cluster.local"
```

OIDC discovery automatically fetches the JWKS URL and issuer information from the discovery endpoint, reducing manual configuration.

## Configuring Application to Authenticate with Vault

Applications in the service mesh need to retrieve JWT tokens and use them to authenticate with Vault. Here's a Go example:

```go
package main

import (
    "fmt"
    "io/ioutil"
    "github.com/hashicorp/vault/api"
)

func authenticateWithVault() (*api.Client, error) {
    // Read JWT token from Istio's mounted volume
    jwtToken, err := ioutil.ReadFile("/var/run/secrets/tokens/vault-token")
    if err != nil {
        return nil, fmt.Errorf("failed to read JWT token: %w", err)
    }

    // Create Vault client
    config := api.DefaultConfig()
    config.Address = "http://vault.vault-system:8200"
    client, err := api.NewClient(config)
    if err != nil {
        return nil, fmt.Errorf("failed to create Vault client: %w", err)
    }

    // Authenticate using JWT
    loginData := map[string]interface{}{
        "role": "orders-service",
        "jwt":  string(jwtToken),
    }

    secret, err := client.Logical().Write("auth/jwt/login", loginData)
    if err != nil {
        return nil, fmt.Errorf("failed to authenticate: %w", err)
    }

    // Set the token for future requests
    client.SetToken(secret.Auth.ClientToken)
    return client, nil
}
```

## Configuring Kubernetes Service Accounts for Token Projection

Configure your pod to project JWT tokens with the correct audience:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: orders
  namespace: production
---
apiVersion: v1
kind: Pod
metadata:
  name: orders-service
  namespace: production
spec:
  serviceAccountName: orders
  containers:
  - name: orders
    image: orders:latest
    volumeMounts:
    - name: vault-token
      mountPath: /var/run/secrets/tokens
      readOnly: true
  volumes:
  - name: vault-token
    projected:
      sources:
      - serviceAccountToken:
          path: vault-token
          expirationSeconds: 3600
          audience: vault
```

The projected token has a specific audience claim that matches Vault's expected audience.

## Setting Up Vault Policies for Service Mesh Services

Create granular policies that limit each service's access:

```hcl
# Policy for orders service
path "secret/data/orders/*" {
  capabilities = ["read"]
}

path "database/creds/orders-db" {
  capabilities = ["read"]
}

# Policy for payments service
path "secret/data/payments/*" {
  capabilities = ["read"]
}

path "pki/issue/payments-cert" {
  capabilities = ["create", "update"]
}
```

Apply these policies to the corresponding roles:

```bash
vault policy write orders-secrets orders-policy.hcl
vault policy write payments-secrets payments-policy.hcl
```

## Implementing Token Renewal and Rotation

JWT tokens have limited lifetimes. Implement token renewal to maintain continuous access:

```go
func renewToken(client *api.Client) {
    ticker := time.NewTicker(30 * time.Minute)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            // Read fresh JWT token
            jwtToken, err := ioutil.ReadFile("/var/run/secrets/tokens/vault-token")
            if err != nil {
                log.Printf("Failed to read JWT token: %v", err)
                continue
            }

            // Re-authenticate with Vault
            loginData := map[string]interface{}{
                "role": "orders-service",
                "jwt":  string(jwtToken),
            }

            secret, err := client.Logical().Write("auth/jwt/login", loginData)
            if err != nil {
                log.Printf("Failed to re-authenticate: %v", err)
                continue
            }

            client.SetToken(secret.Auth.ClientToken)
            log.Println("Successfully renewed Vault token")
        }
    }
}
```

## Configuring Linkerd Integration

For Linkerd service mesh, the process is similar but uses Linkerd's identity provider:

```bash
# Configure JWT auth for Linkerd
vault write auth/jwt/config \
    jwks_url="http://linkerd-identity.linkerd:8080/.well-known/jwks" \
    bound_issuer="https://linkerd.linkerd.svc.cluster.local"

# Create role for Linkerd service identity
vault write auth/jwt/role/orders-linkerd \
    role_type="jwt" \
    bound_audiences="vault" \
    user_claim="sub" \
    bound_subject="orders.production.serviceaccount.identity.linkerd.cluster.local" \
    policies="orders-secrets" \
    ttl=1h
```

## Monitoring and Troubleshooting

Enable audit logging in Vault to track authentication attempts:

```bash
vault audit enable file file_path=/vault/logs/audit.log
```

Check authentication logs for failed attempts:

```bash
# View recent authentication attempts
kubectl exec -n vault-system vault-0 -- cat /vault/logs/audit.log | \
    jq 'select(.request.path == "auth/jwt/login")'
```

Common issues include incorrect audience claims, expired tokens, and misconfigured JWKS URLs. Verify JWT token claims match Vault role configuration:

```bash
# Decode JWT token to inspect claims
kubectl exec -n production orders-service -- cat /var/run/secrets/tokens/vault-token | \
    cut -d. -f2 | base64 -d | jq .
```

## Conclusion

Integrating Vault JWT/OIDC authentication with service meshes provides secure, identity-based access to secrets. By leveraging workload identities issued by the service mesh, you eliminate the need for static credentials while maintaining fine-grained access control. This approach scales well in dynamic microservice environments where services frequently scale up and down.

The combination of service mesh identities and Vault's authentication mechanisms creates a robust security foundation for modern cloud-native applications.
