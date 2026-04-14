# How to Develop Dapr Pluggable Secret Store Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pluggable Component, Secret Store, gRPC, Security

Description: Build a custom Dapr secret store component to integrate proprietary secret management systems using the pluggable component SDK and gRPC interface.

---

## Pluggable Secret Stores

Dapr's built-in secret store components cover major platforms (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault). When your organization uses an internal secret management system or a platform not yet supported, a pluggable secret store component lets you implement the interface and plug it into Dapr's secret management building block.

## Project Setup

```bash
mkdir dapr-custom-secretstore && cd dapr-custom-secretstore
go mod init github.com/myorg/dapr-custom-secretstore
go get github.com/dapr-sandbox/components-go-sdk@latest
```

## Implementing the Secret Store Interface

```go
package main

import (
    "context"
    "fmt"

    dapr "github.com/dapr-sandbox/components-go-sdk"
    secretstore "github.com/dapr-sandbox/components-go-sdk/secretstore/v1"
    proto "github.com/dapr/dapr/pkg/proto/components/v1"
)

type CustomSecretStore struct {
    apiEndpoint string
    apiToken    string
    // In production, this would be a real HTTP client
}

func (s *CustomSecretStore) Init(ctx context.Context, req *proto.SecretStoreInitRequest) (*proto.SecretStoreInitResponse, error) {
    for key, value := range req.Metadata.Properties {
        switch key {
        case "apiEndpoint":
            s.apiEndpoint = value
        case "apiToken":
            s.apiToken = value
        }
    }
    return &proto.SecretStoreInitResponse{}, nil
}

func (s *CustomSecretStore) Features(ctx context.Context, req *proto.FeaturesRequest) (*proto.FeaturesResponse, error) {
    return &proto.FeaturesResponse{
        Features: []string{"MULTIPLE_KEY_VALUES_PER_SECRET"},
    }, nil
}

func (s *CustomSecretStore) Get(ctx context.Context, req *proto.GetSecretRequest) (*proto.GetSecretResponse, error) {
    // Fetch secret from your custom API
    secret, err := s.fetchFromAPI(req.Key, req.Metadata)
    if err != nil {
        return nil, fmt.Errorf("secret %q not found: %w", req.Key, err)
    }

    return &proto.GetSecretResponse{
        Data: map[string]string{
            req.Key: secret,
        },
    }, nil
}

func (s *CustomSecretStore) BulkGet(ctx context.Context, req *proto.BulkGetSecretRequest) (*proto.BulkGetSecretResponse, error) {
    response := &proto.BulkGetSecretResponse{
        Data: make(map[string]*proto.SecretResponse),
    }

    // BulkGet returns all available secrets
    allSecrets := map[string]string{
        "db-password": "supersecret123",
        "api-key":     "myapikey456",
    }
    for name, secret := range allSecrets {
        response.Data[name] = &proto.SecretResponse{
            Secrets: map[string]string{name: secret},
        }
    }
    return response, nil
}

func (s *CustomSecretStore) fetchFromAPI(key string, metadata map[string]string) (string, error) {
    // Implement your API call here
    secrets := map[string]string{
        "db-password": "supersecret123",
        "api-key":     "myapikey456",
    }
    if val, ok := secrets[key]; ok {
        return val, nil
    }
    return "", fmt.Errorf("not found")
}

func (s *CustomSecretStore) Ping(ctx context.Context, req *proto.PingRequest) (*proto.PingResponse, error) {
    return &proto.PingResponse{}, nil
}
```

## Main Entry Point

```go
func main() {
    dapr.Register("custom-secretstore", dapr.WithSecretStore(func() secretstore.SecretStore {
        return &CustomSecretStore{}
    }))

    dapr.MustRun()
}
```

## Component Manifest

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: my-secret-store
spec:
  type: secretstores.custom-secretstore
  version: v1
  metadata:
    - name: apiEndpoint
      value: "https://secrets.internal.company.com"
    - name: apiToken
      secretKeyRef:
        name: component-bootstrap-secret
        key: token
```

## Restricting Secret Access with RBAC

Reference the pluggable secret store in your Dapr Configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  secrets:
    scopes:
      - storeName: my-secret-store
        defaultAccess: deny
        allowedSecrets:
          - db-password
          - api-key
```

## Using Secrets in Application Code

```javascript
// Node.js - retrieve secret via Dapr HTTP API
const response = await fetch(
  `http://localhost:3500/v1.0/secrets/my-secret-store/db-password`
);
const secret = await response.json();
console.log(secret['db-password']);
```

## Summary

Dapr pluggable secret store components provide a clean abstraction layer over any secret management system. By implementing the Init, Get, and BulkGet gRPC methods, you can integrate corporate secret vaults into Dapr's secret management building block - enabling application code to remain agnostic of the underlying secret provider while benefiting from Dapr's RBAC-based secret scoping.
