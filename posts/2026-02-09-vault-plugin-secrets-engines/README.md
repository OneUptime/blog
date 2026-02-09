# How to Implement Vault Plugin Secrets Engines in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vault, Plugins, Kubernetes, Custom Secrets, Extension

Description: Learn how to develop, deploy, and manage custom HashiCorp Vault plugin secrets engines in Kubernetes environments for specialized secret generation and management workflows.

---

HashiCorp Vault's plugin system allows you to extend its functionality with custom secrets engines tailored to your specific requirements. When standard secrets engines don't meet your needs, plugins provide a way to integrate proprietary systems, implement custom credential generation logic, or support specialized authentication mechanisms. This guide covers implementing and deploying Vault plugin secrets engines in Kubernetes.

## Understanding Vault Plugin Architecture

Vault plugins run as separate processes that communicate with Vault over RPC. This architecture provides isolation and allows plugins to be written in any language that supports gRPC. Vault includes a plugin SDK for Go that simplifies development.

Plugins must be registered in Vault's catalog before use. The catalog tracks plugin binaries, their SHA256 checksums, and version information. This ensures only verified plugins execute in your Vault cluster.

## Setting Up the Development Environment

Create a development environment for building plugins:

```bash
# Create plugin project structure
mkdir vault-custom-plugin
cd vault-custom-plugin

# Initialize Go module
go mod init github.com/myorg/vault-custom-plugin

# Install Vault SDK
go get github.com/hashicorp/vault/sdk
```

## Implementing a Custom Secrets Engine

Here's a complete example of a custom secrets engine that generates time-limited API tokens:

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/hashicorp/vault/sdk/framework"
    "github.com/hashicorp/vault/sdk/logical"
    "github.com/hashicorp/vault/sdk/plugin"
)

type customBackend struct {
    *framework.Backend
}

func Factory(ctx context.Context, conf *logical.BackendConfig) (logical.Backend, error) {
    b := &customBackend{}

    b.Backend = &framework.Backend{
        Help: "Custom API token secrets engine",
        PathsSpecial: &logical.Paths{
            SealWrapStorage: []string{
                "config",
            },
        },
        Paths: []*framework.Path{
            b.pathConfig(),
            b.pathRoles(),
            b.pathCreds(),
        },
        Secrets: []*framework.Secret{
            b.tokenSecret(),
        },
        BackendType: logical.TypeLogical,
    }

    if err := b.Setup(ctx, conf); err != nil {
        return nil, err
    }

    return b, nil
}

// pathConfig defines the config endpoint
func (b *customBackend) pathConfig() *framework.Path {
    return &framework.Path{
        Pattern: "config",
        Fields: map[string]*framework.FieldSchema{
            "api_endpoint": {
                Type:        framework.TypeString,
                Description: "API endpoint URL",
                Required:    true,
            },
            "api_key": {
                Type:        framework.TypeString,
                Description: "API key for authentication",
                Required:    true,
            },
        },
        Operations: map[logical.Operation]framework.OperationHandler{
            logical.CreateOperation: &framework.PathOperation{
                Callback: b.pathConfigWrite,
            },
            logical.UpdateOperation: &framework.PathOperation{
                Callback: b.pathConfigWrite,
            },
            logical.ReadOperation: &framework.PathOperation{
                Callback: b.pathConfigRead,
            },
        },
    }
}

// pathConfigWrite handles writing configuration
func (b *customBackend) pathConfigWrite(ctx context.Context, req *logical.Request, data *framework.FieldData) (*logical.Response, error) {
    config := map[string]interface{}{
        "api_endpoint": data.Get("api_endpoint").(string),
        "api_key":      data.Get("api_key").(string),
    }

    entry, err := logical.StorageEntryJSON("config", config)
    if err != nil {
        return nil, err
    }

    if err := req.Storage.Put(ctx, entry); err != nil {
        return nil, err
    }

    return nil, nil
}

// pathConfigRead handles reading configuration
func (b *customBackend) pathConfigRead(ctx context.Context, req *logical.Request, data *framework.FieldData) (*logical.Response, error) {
    entry, err := req.Storage.Get(ctx, "config")
    if err != nil {
        return nil, err
    }

    if entry == nil {
        return nil, nil
    }

    var config map[string]interface{}
    if err := entry.DecodeJSON(&config); err != nil {
        return nil, err
    }

    // Don't return sensitive data
    delete(config, "api_key")

    return &logical.Response{
        Data: config,
    }, nil
}

// pathRoles defines role configuration
func (b *customBackend) pathRoles() *framework.Path {
    return &framework.Path{
        Pattern: "roles/" + framework.GenericNameRegex("name"),
        Fields: map[string]*framework.FieldSchema{
            "name": {
                Type:        framework.TypeString,
                Description: "Role name",
            },
            "permissions": {
                Type:        framework.TypeCommaStringSlice,
                Description: "List of permissions",
            },
            "ttl": {
                Type:        framework.TypeDurationSecond,
                Description: "Token TTL",
                Default:     3600,
            },
        },
        Operations: map[logical.Operation]framework.OperationHandler{
            logical.CreateOperation: &framework.PathOperation{
                Callback: b.pathRolesWrite,
            },
            logical.UpdateOperation: &framework.PathOperation{
                Callback: b.pathRolesWrite,
            },
            logical.ReadOperation: &framework.PathOperation{
                Callback: b.pathRolesRead,
            },
            logical.DeleteOperation: &framework.PathOperation{
                Callback: b.pathRolesDelete,
            },
        },
    }
}

// pathRolesWrite handles role creation/updates
func (b *customBackend) pathRolesWrite(ctx context.Context, req *logical.Request, data *framework.FieldData) (*logical.Response, error) {
    name := data.Get("name").(string)

    role := map[string]interface{}{
        "permissions": data.Get("permissions").([]string),
        "ttl":         data.Get("ttl").(int),
    }

    entry, err := logical.StorageEntryJSON("roles/"+name, role)
    if err != nil {
        return nil, err
    }

    if err := req.Storage.Put(ctx, entry); err != nil {
        return nil, err
    }

    return nil, nil
}

// pathRolesRead handles role reading
func (b *customBackend) pathRolesRead(ctx context.Context, req *logical.Request, data *framework.FieldData) (*logical.Response, error) {
    name := data.Get("name").(string)

    entry, err := req.Storage.Get(ctx, "roles/"+name)
    if err != nil {
        return nil, err
    }

    if entry == nil {
        return nil, nil
    }

    var role map[string]interface{}
    if err := entry.DecodeJSON(&role); err != nil {
        return nil, err
    }

    return &logical.Response{
        Data: role,
    }, nil
}

// pathRolesDelete handles role deletion
func (b *customBackend) pathRolesDelete(ctx context.Context, req *logical.Request, data *framework.FieldData) (*logical.Response, error) {
    name := data.Get("name").(string)
    if err := req.Storage.Delete(ctx, "roles/"+name); err != nil {
        return nil, err
    }
    return nil, nil
}

// pathCreds defines credential generation endpoint
func (b *customBackend) pathCreds() *framework.Path {
    return &framework.Path{
        Pattern: "creds/" + framework.GenericNameRegex("name"),
        Fields: map[string]*framework.FieldSchema{
            "name": {
                Type:        framework.TypeString,
                Description: "Role name",
            },
        },
        Operations: map[logical.Operation]framework.OperationHandler{
            logical.ReadOperation: &framework.PathOperation{
                Callback: b.pathCredsRead,
            },
        },
    }
}

// pathCredsRead generates credentials
func (b *customBackend) pathCredsRead(ctx context.Context, req *logical.Request, data *framework.FieldData) (*logical.Response, error) {
    name := data.Get("name").(string)

    // Get role configuration
    entry, err := req.Storage.Get(ctx, "roles/"+name)
    if err != nil {
        return nil, err
    }

    if entry == nil {
        return nil, fmt.Errorf("role not found")
    }

    var role map[string]interface{}
    if err := entry.DecodeJSON(&role); err != nil {
        return nil, err
    }

    // Generate token (simplified example)
    token := fmt.Sprintf("tok_%d", time.Now().Unix())

    // Return secret with lease
    resp := b.Secret("token").Response(map[string]interface{}{
        "token":       token,
        "permissions": role["permissions"],
    }, map[string]interface{}{
        "token": token,
        "role":  name,
    })

    resp.Secret.TTL = time.Duration(role["ttl"].(int)) * time.Second

    return resp, nil
}

// tokenSecret defines the secret type
func (b *customBackend) tokenSecret() *framework.Secret {
    return &framework.Secret{
        Type: "token",
        Fields: map[string]*framework.FieldSchema{
            "token": {
                Type:        framework.TypeString,
                Description: "Generated API token",
            },
        },
        Renew:  b.tokenRenew,
        Revoke: b.tokenRevoke,
    }
}

// tokenRenew handles lease renewal
func (b *customBackend) tokenRenew(ctx context.Context, req *logical.Request, d *framework.FieldData) (*logical.Response, error) {
    // Implement renewal logic
    return framework.LeaseExtend(0, 0, b.System())(ctx, req, d)
}

// tokenRevoke handles secret revocation
func (b *customBackend) tokenRevoke(ctx context.Context, req *logical.Request, d *framework.FieldData) (*logical.Response, error) {
    // Implement revocation logic
    token := req.Secret.InternalData["token"].(string)
    // Call external API to revoke token
    fmt.Printf("Revoking token: %s\n", token)
    return nil, nil
}

func main() {
    apiClientMeta := &plugin.APIClientMeta{}
    flags := apiClientMeta.FlagSet()
    flags.Parse(os.Args[1:])

    tlsConfig := apiClientMeta.GetTLSConfig()
    tlsProviderFunc := plugin.VaultPluginTLSProvider(tlsConfig)

    if err := plugin.Serve(&plugin.ServeOpts{
        BackendFactoryFunc: Factory,
        TLSProviderFunc:    tlsProviderFunc,
    }); err != nil {
        fmt.Println(err)
        os.Exit(1)
    }
}
```

## Building and Packaging the Plugin

Build the plugin binary:

```bash
# Build for Linux (target platform for Kubernetes)
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o vault-custom-plugin

# Calculate SHA256 checksum
sha256sum vault-custom-plugin > vault-custom-plugin.sha256
```

Create a Docker image to distribute the plugin:

```dockerfile
# Dockerfile
FROM alpine:3.18

# Copy plugin binary
COPY vault-custom-plugin /plugins/vault-custom-plugin

# Make executable
RUN chmod +x /plugins/vault-custom-plugin

# Use non-root user
RUN adduser -D -u 1000 vault
USER vault

CMD ["/bin/sh"]
```

Build and push the image:

```bash
docker build -t myorg/vault-custom-plugin:1.0.0 .
docker push myorg/vault-custom-plugin:1.0.0
```

## Deploying Plugin to Vault in Kubernetes

Configure Vault to load the plugin using an init container:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: vault
  namespace: vault-system
spec:
  serviceName: vault
  replicas: 3
  selector:
    matchLabels:
      app: vault
  template:
    metadata:
      labels:
        app: vault
    spec:
      initContainers:
      - name: plugin-loader
        image: myorg/vault-custom-plugin:1.0.0
        command:
        - sh
        - -c
        - |
          cp /plugins/vault-custom-plugin /vault-plugins/
          chmod +x /vault-plugins/vault-custom-plugin
        volumeMounts:
        - name: plugins
          mountPath: /vault-plugins
      containers:
      - name: vault
        image: vault:1.15
        env:
        - name: VAULT_ADDR
          value: "http://127.0.0.1:8200"
        volumeMounts:
        - name: plugins
          mountPath: /vault/plugins
        - name: config
          mountPath: /vault/config
      volumes:
      - name: plugins
        emptyDir: {}
      - name: config
        configMap:
          name: vault-config
```

Register the plugin in Vault:

```bash
# Calculate checksum
SHA256=$(kubectl exec -n vault-system vault-0 -- sha256sum /vault/plugins/vault-custom-plugin | awk '{print $1}')

# Register plugin
kubectl exec -n vault-system vault-0 -- vault plugin register \
    -sha256=$SHA256 \
    -command=vault-custom-plugin \
    secret \
    custom-plugin

# Enable the plugin
kubectl exec -n vault-system vault-0 -- vault secrets enable \
    -path=custom \
    -plugin-name=custom-plugin \
    plugin
```

## Using the Custom Plugin

Configure and use the plugin:

```bash
# Configure the plugin
vault write custom/config \
    api_endpoint="https://api.example.com" \
    api_key="secret-api-key"

# Create a role
vault write custom/roles/developer \
    permissions="read,write" \
    ttl=3600

# Generate credentials
vault read custom/creds/developer
```

Use the plugin from Kubernetes applications:

```go
package main

import (
    "fmt"
    "github.com/hashicorp/vault/api"
)

func getCustomCredentials(vaultAddr, token, role string) (string, error) {
    config := api.DefaultConfig()
    config.Address = vaultAddr

    client, err := api.NewClient(config)
    if err != nil {
        return "", err
    }

    client.SetToken(token)

    // Read credentials from custom plugin
    secret, err := client.Logical().Read(fmt.Sprintf("custom/creds/%s", role))
    if err != nil {
        return "", err
    }

    token := secret.Data["token"].(string)
    return token, nil
}
```

## Implementing Plugin Updates

Update plugins without downtime:

```bash
# Build new version
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o vault-custom-plugin-v2

# Copy to Vault pods
kubectl cp vault-custom-plugin-v2 vault-system/vault-0:/vault/plugins/vault-custom-plugin-v2

# Calculate new checksum
NEW_SHA256=$(kubectl exec -n vault-system vault-0 -- sha256sum /vault/plugins/vault-custom-plugin-v2 | awk '{print $1}')

# Register new version
kubectl exec -n vault-system vault-0 -- vault plugin register \
    -sha256=$NEW_SHA256 \
    -command=vault-custom-plugin-v2 \
    -version=2.0.0 \
    secret \
    custom-plugin

# Reload plugin (uses new version)
kubectl exec -n vault-system vault-0 -- vault plugin reload \
    -plugin=custom-plugin
```

## Monitoring Plugin Performance

Add metrics to your plugin:

```go
import "github.com/armon/go-metrics"

func (b *customBackend) pathCredsRead(ctx context.Context, req *logical.Request, data *framework.FieldData) (*logical.Response, error) {
    defer metrics.MeasureSince([]string{"custom_plugin", "creds", "read"}, time.Now())

    // Existing code...
}
```

Configure Prometheus to scrape metrics:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-vault-plugin-rules
  namespace: monitoring
data:
  plugin-metrics.yaml: |
    groups:
    - name: vault-plugins
      rules:
      - alert: PluginHighLatency
        expr: vault_custom_plugin_creds_read > 1000
        annotations:
          summary: "Custom plugin experiencing high latency"
```

## Conclusion

Custom Vault plugin secrets engines extend Vault's capabilities to meet specialized requirements. By implementing plugins, you can integrate proprietary systems, enforce custom business logic, and support unique credential generation patterns while maintaining Vault's security model and operational characteristics. The plugin architecture ensures isolation and flexibility, making it suitable for production Kubernetes environments.
