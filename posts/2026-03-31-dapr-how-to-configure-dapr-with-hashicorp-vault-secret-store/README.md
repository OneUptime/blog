# How to Configure Dapr with HashiCorp Vault Secret Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, HashiCorp Vault, Secret, Security, Microservice

Description: Learn how to configure Dapr to use HashiCorp Vault as a secret store, enabling secure secret retrieval for microservices in any cloud or on-premises environment.

---

## Overview

HashiCorp Vault is a widely used secrets management tool that supports dynamic secrets, secret leasing, and multiple authentication backends. Dapr's secret store building block integrates with Vault so your services can retrieve secrets through the Dapr sidecar using a consistent API regardless of the underlying secret provider.

## Prerequisites

- A running HashiCorp Vault instance (self-hosted or HCP Vault)
- Dapr installed in your cluster or locally
- `vault` CLI installed and authenticated
- Kubernetes cluster (if running in Kubernetes mode)

## Step 1 - Enable and Populate the KV Secrets Engine

HashiCorp Vault uses the KV (key-value) secrets engine to store arbitrary secrets:

```bash
# Enable KV v2 secrets engine
vault secrets enable -path=secret kv-v2

# Store secrets your application needs
vault kv put secret/myapp \
  db-password="supersecret" \
  api-key="myapikey123"

vault kv put secret/myapp/redis \
  password="redis-pass"
```

## Step 2 - Create a Vault Policy for Dapr

Define a policy that limits what Dapr can read:

```bash
cat > dapr-policy.hcl << 'EOF'
path "secret/data/myapp/*" {
  capabilities = ["read"]
}

path "secret/data/myapp" {
  capabilities = ["read"]
}
EOF

vault policy write dapr-policy dapr-policy.hcl
```

## Step 3 - Configure Authentication

### Using the Token Method (Development)

Generate a token and associate it with the policy:

```bash
vault token create -policy=dapr-policy -ttl=24h
```

### Using Kubernetes Auth (Production)

Enable Kubernetes auth and configure it:

```bash
vault auth enable kubernetes

vault write auth/kubernetes/config \
  kubernetes_host="https://$KUBERNETES_PORT_443_TCP_ADDR:443" \
  token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

vault write auth/kubernetes/role/dapr-role \
  bound_service_account_names=default \
  bound_service_account_namespaces=default \
  policies=dapr-policy \
  ttl=1h
```

## Step 4 - Define the Dapr Secret Store Component

### Token-Based Authentication

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: hashicorpvault
  namespace: default
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
    - name: vaultAddr
      value: "http://vault.vault.svc.cluster.local:8200"
    - name: vaultToken
      value: "hvs.yourtoken"
    - name: vaultKVUsePrefix
      value: "false"
```

### Kubernetes Auth (via Vault Agent Sidecar)

The Dapr Vault component does not natively support Kubernetes auth. Instead, use a Vault Agent sidecar to authenticate with Vault using Kubernetes auth and write the resulting token to a file. Dapr reads this token via `vaultTokenMountPath`.

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: hashicorpvault
  namespace: default
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
    - name: vaultAddr
      value: "http://vault.vault.svc.cluster.local:8200"
    - name: vaultTokenMountPath
      value: "/tmp/vault/.vault-token"
    - name: vaultKVUsePrefix
      value: "false"
    - name: skipVerify
      value: "false"
```

Apply the component:

```bash
kubectl apply -f vault-component.yaml
```

## Step 5 - Read Secrets from Your Application

Use the Dapr HTTP API to retrieve secrets:

```bash
curl http://localhost:3500/v1.0/secrets/hashicorpvault/myapp
```

Response:

```json
{
  "db-password": "supersecret",
  "api-key": "myapikey123"
}
```

## Reading Secrets in Go

```go
package main

import (
    "context"
    "fmt"
    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        panic(err)
    }
    defer client.Close()

    ctx := context.Background()

    secret, err := client.GetSecret(ctx, "hashicorpvault", "myapp", nil)
    if err != nil {
        panic(err)
    }

    fmt.Printf("DB Password: %s\n", secret["db-password"])
    fmt.Printf("API Key: %s\n", secret["api-key"])
}
```

## Reading Secrets in Java

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import java.util.Map;

public class VaultExample {
    public static void main(String[] args) {
        try (DaprClient client = new DaprClientBuilder().build()) {
            Map<String, String> secrets = client
                .getSecret("hashicorpvault", "myapp")
                .block();

            String dbPassword = secrets.get("db-password");
            String apiKey = secrets.get("api-key");
            System.out.println("Secrets loaded from HashiCorp Vault");
        }
    }
}
```

## Referencing Vault Secrets in Other Dapr Components

Reference Vault-managed secrets in component definitions:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-state
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
    - name: redisPassword
      secretKeyRef:
        name: myapp/redis
        key: password
auth:
  secretStore: hashicorpvault
```

## Restricting Access with Secret Scopes

Limit which secrets a specific application can read:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  secrets:
    scopes:
      - storeName: hashicorpvault
        defaultAccess: deny
        allowedSecrets:
          - "myapp"
```

## Summary

Configuring Dapr with HashiCorp Vault as a secret store enables microservices to retrieve secrets through a unified API without embedding credentials in application code. Vault's Kubernetes auth backend provides a production-ready, credential-free integration that rotates tokens automatically. Dapr's secret scoping adds an additional layer of access control at the application level.
