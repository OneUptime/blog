# How to Implement Vault Secret Rotation for Kubernetes ServiceAccounts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vault, Kubernetes, Secret Rotation, ServiceAccount, Automation

Description: Master automatic secret rotation for Kubernetes ServiceAccounts using HashiCorp Vault, implementing zero-downtime credential updates for enhanced security in production environments.

---

Kubernetes ServiceAccount tokens provide identity for pods but often remain static throughout a deployment's lifetime. Implementing automatic rotation of ServiceAccount credentials and associated secrets reduces the risk from compromised credentials. This guide demonstrates using HashiCorp Vault to automate secret rotation for Kubernetes workloads.

## Understanding ServiceAccount Secret Rotation

Traditional Kubernetes ServiceAccount tokens don't expire. Long-lived credentials increase security risk because compromised tokens provide indefinite access. Vault addresses this through short-lived, automatically rotated tokens.

Secret rotation involves generating new credentials, distributing them to applications, and revoking old credentials after a grace period. The process must occur without service interruption, requiring coordination between Vault, Kubernetes, and applications.

## Configuring Kubernetes Auth for Rotation

Set up Kubernetes authentication in Vault:

```bash
# Enable Kubernetes auth
vault auth enable kubernetes

# Configure with cluster information
vault write auth/kubernetes/config \
    kubernetes_host="https://kubernetes.default.svc:443" \
    kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
    token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token

# Create role with short TTL
vault write auth/kubernetes/role/app-role \
    bound_service_account_names=myapp \
    bound_service_account_namespaces=production \
    policies=app-policy \
    ttl=1h \
    max_ttl=2h
```

The short TTL forces regular token rotation.

## Implementing Application-Level Token Renewal

Applications must actively renew tokens before expiration:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "time"

    "github.com/hashicorp/vault/api"
)

type VaultAuthManager struct {
    client           *api.Client
    role             string
    jwtPath          string
    token            string
    tokenExpiry      time.Time
    renewTicker      *time.Ticker
    ctx              context.Context
    cancel           context.CancelFunc
}

func NewVaultAuthManager(vaultAddr, role string) (*VaultAuthManager, error) {
    config := api.DefaultConfig()
    config.Address = vaultAddr

    client, err := api.NewClient(config)
    if err != nil {
        return nil, fmt.Errorf("failed to create client: %w", err)
    }

    ctx, cancel := context.WithCancel(context.Background())

    mgr := &VaultAuthManager{
        client:  client,
        role:    role,
        jwtPath: "/var/run/secrets/kubernetes.io/serviceaccount/token",
        ctx:     ctx,
        cancel:  cancel,
    }

    // Perform initial authentication
    if err := mgr.authenticate(); err != nil {
        cancel()
        return nil, err
    }

    // Start renewal loop
    go mgr.renewalLoop()

    return mgr, nil
}

func (m *VaultAuthManager) authenticate() error {
    // Read ServiceAccount JWT
    jwt, err := os.ReadFile(m.jwtPath)
    if err != nil {
        return fmt.Errorf("failed to read JWT: %w", err)
    }

    // Authenticate with Vault
    secret, err := m.client.Logical().Write(
        fmt.Sprintf("auth/kubernetes/login"),
        map[string]interface{}{
            "role": m.role,
            "jwt":  string(jwt),
        },
    )
    if err != nil {
        return fmt.Errorf("authentication failed: %w", err)
    }

    m.token = secret.Auth.ClientToken
    m.client.SetToken(m.token)

    // Calculate token expiry
    m.tokenExpiry = time.Now().Add(time.Duration(secret.Auth.LeaseDuration) * time.Second)

    log.Printf("Authenticated successfully. Token expires at %v", m.tokenExpiry)

    return nil
}

func (m *VaultAuthManager) renewalLoop() {
    // Renew at 80% of TTL
    renewInterval := time.Until(m.tokenExpiry).Milliseconds() * 8 / 10
    m.renewTicker = time.NewTicker(time.Duration(renewInterval) * time.Millisecond)
    defer m.renewTicker.Stop()

    for {
        select {
        case <-m.renewTicker.C:
            if err := m.renewToken(); err != nil {
                log.Printf("Token renewal failed: %v, re-authenticating", err)
                if err := m.authenticate(); err != nil {
                    log.Printf("Re-authentication failed: %v", err)
                    // In production, implement exponential backoff
                    time.Sleep(10 * time.Second)
                    continue
                }
            }

            // Update ticker with new interval
            renewInterval := time.Until(m.tokenExpiry).Milliseconds() * 8 / 10
            m.renewTicker.Reset(time.Duration(renewInterval) * time.Millisecond)

        case <-m.ctx.Done():
            return
        }
    }
}

func (m *VaultAuthManager) renewToken() error {
    secret, err := m.client.Auth().Token().RenewSelf(3600)
    if err != nil {
        return fmt.Errorf("renewal failed: %w", err)
    }

    m.tokenExpiry = time.Now().Add(time.Duration(secret.Auth.LeaseDuration) * time.Second)
    log.Printf("Token renewed successfully. New expiry: %v", m.tokenExpiry)

    return nil
}

func (m *VaultAuthManager) GetClient() *api.Client {
    return m.client
}

func (m *VaultAuthManager) Stop() {
    m.cancel()
}

// Usage example
func main() {
    mgr, err := NewVaultAuthManager(
        "http://vault.vault-system:8200",
        "app-role",
    )
    if err != nil {
        log.Fatal(err)
    }
    defer mgr.Stop()

    // Use Vault client for operations
    client := mgr.GetClient()
    secret, err := client.Logical().Read("secret/data/myapp")
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("Secret: %v", secret.Data)

    // Keep application running
    select {}
}
```

## Using Vault Agent for Automatic Rotation

Vault Agent handles token rotation automatically:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vault-agent-config
  namespace: production
data:
  agent-config.hcl: |
    pid_file = "/tmp/pidfile"

    vault {
      address = "http://vault.vault-system:8200"
    }

    auto_auth {
      method {
        type = "kubernetes"

        config = {
          role = "app-role"
        }
      }

      sink {
        type = "file"
        config = {
          path = "/vault/.vault-token"
          mode = 0640
        }
      }
    }

    # Template for secrets with automatic rotation
    template {
      source      = "/vault/configs/database.tpl"
      destination = "/vault/secrets/database.json"

      # Wait for changes before updating
      wait {
        min = "2s"
        max = "10s"
      }

      # Command to run after template updates
      command = "/bin/sh -c 'kill -HUP $(pidof myapp)'"
    }
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: vault-templates
  namespace: production
data:
  database.tpl: |
    {{- with secret "database/creds/app-role" }}
    {
      "username": "{{ .Data.username }}",
      "password": "{{ .Data.password }}",
      "connection_string": "postgres://{{ .Data.username }}:{{ .Data.password }}@postgres:5432/myapp"
    }
    {{- end }}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      serviceAccountName: myapp
      containers:
      - name: vault-agent
        image: vault:1.15
        args:
        - agent
        - -config=/vault/config/agent-config.hcl
        env:
        - name: VAULT_ADDR
          value: http://vault.vault-system:8200
        volumeMounts:
        - name: vault-config
          mountPath: /vault/config
        - name: vault-templates
          mountPath: /vault/configs
        - name: vault-secrets
          mountPath: /vault/secrets
        - name: vault-token
          mountPath: /vault
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"

      - name: app
        image: myapp:latest
        command: ["/app/myapp"]
        volumeMounts:
        - name: vault-secrets
          mountPath: /vault/secrets
          readOnly: true
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

      volumes:
      - name: vault-config
        configMap:
          name: vault-agent-config
      - name: vault-templates
        configMap:
          name: vault-templates
      - name: vault-secrets
        emptyDir:
          medium: Memory
      - name: vault-token
        emptyDir:
          medium: Memory
```

## Implementing Graceful Secret Rotation

Applications must handle secret updates gracefully:

```go
package main

import (
    "encoding/json"
    "log"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/fsnotify/fsnotify"
)

type DatabaseConfig struct {
    Username         string `json:"username"`
    Password         string `json:"password"`
    ConnectionString string `json:"connection_string"`
}

type Application struct {
    configPath     string
    config         *DatabaseConfig
    configWatcher  *fsnotify.Watcher
    reloadSignal   chan os.Signal
}

func NewApplication(configPath string) (*Application, error) {
    app := &Application{
        configPath:   configPath,
        reloadSignal: make(chan os.Signal, 1),
    }

    // Load initial configuration
    if err := app.loadConfig(); err != nil {
        return nil, err
    }

    // Watch for config file changes
    watcher, err := fsnotify.NewWatcher()
    if err != nil {
        return nil, err
    }
    app.configWatcher = watcher

    if err := watcher.Add(configPath); err != nil {
        return nil, err
    }

    // Watch for SIGHUP from Vault Agent
    signal.Notify(app.reloadSignal, syscall.SIGHUP)

    // Start watching for changes
    go app.watchForChanges()

    return app, nil
}

func (a *Application) loadConfig() error {
    data, err := os.ReadFile(a.configPath)
    if err != nil {
        return err
    }

    var config DatabaseConfig
    if err := json.Unmarshal(data, &config); err != nil {
        return err
    }

    a.config = &config
    log.Printf("Loaded configuration with username: %s", config.Username)

    return nil
}

func (a *Application) watchForChanges() {
    for {
        select {
        case event, ok := <-a.configWatcher.Events:
            if !ok {
                return
            }

            if event.Op&fsnotify.Write == fsnotify.Write {
                log.Println("Config file changed, reloading...")
                // Add slight delay for file to be fully written
                time.Sleep(100 * time.Millisecond)
                if err := a.reloadConfiguration(); err != nil {
                    log.Printf("Failed to reload config: %v", err)
                }
            }

        case <-a.reloadSignal:
            log.Println("Received SIGHUP, reloading configuration...")
            if err := a.reloadConfiguration(); err != nil {
                log.Printf("Failed to reload config: %v", err)
            }

        case err, ok := <-a.configWatcher.Errors:
            if !ok {
                return
            }
            log.Printf("Watcher error: %v", err)
        }
    }
}

func (a *Application) reloadConfiguration() error {
    // Load new configuration
    newConfig := &DatabaseConfig{}
    data, err := os.ReadFile(a.configPath)
    if err != nil {
        return err
    }

    if err := json.Unmarshal(data, newConfig); err != nil {
        return err
    }

    // Update database connections with new credentials
    if err := a.updateDatabaseConnections(newConfig); err != nil {
        return err
    }

    a.config = newConfig
    log.Printf("Configuration reloaded successfully with username: %s", newConfig.Username)

    return nil
}

func (a *Application) updateDatabaseConnections(config *DatabaseConfig) error {
    // Implement database connection pool rotation
    // 1. Create new connection pool with new credentials
    // 2. Drain old connection pool
    // 3. Close old connections
    log.Printf("Updating database connections to use new credentials")
    return nil
}

func (a *Application) Run() {
    log.Println("Application running...")
    // Application logic here
    select {}
}
```

## Automating Secret Rotation with CronJobs

Create CronJobs for periodic rotation:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rotate-app-secrets
  namespace: production
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: secret-rotator
          restartPolicy: OnFailure
          containers:
          - name: rotator
            image: vault:1.15
            env:
            - name: VAULT_ADDR
              value: http://vault.vault-system:8200
            command:
            - /bin/sh
            - -c
            - |
              # Authenticate with Vault
              VAULT_TOKEN=$(vault write -field=token auth/kubernetes/login \
                role=secret-rotator \
                jwt=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token))

              export VAULT_TOKEN

              # Rotate database credentials
              echo "Rotating database credentials..."
              NEW_CREDS=$(vault read -format=json database/creds/app-role)

              NEW_USER=$(echo $NEW_CREDS | jq -r .data.username)
              NEW_PASS=$(echo $NEW_CREDS | jq -r .data.password)

              # Update Kubernetes Secret
              kubectl create secret generic app-db-creds \
                --from-literal=username=$NEW_USER \
                --from-literal=password=$NEW_PASS \
                --dry-run=client -o yaml | kubectl apply -f -

              # Trigger rolling restart to pick up new credentials
              kubectl rollout restart deployment/myapp -n production

              echo "Rotation complete"
```

## Monitoring Secret Rotation

Track rotation events with audit logs:

```bash
# Query rotation events
kubectl exec -n vault-system vault-0 -- cat /vault/logs/audit.log | \
    jq 'select(.request.path | contains("database/creds"))'

# Count credential generations
kubectl exec -n vault-system vault-0 -- cat /vault/logs/audit.log | \
    jq -r 'select(.request.path | contains("database/creds")) | .time' | \
    wc -l
```

Set up Prometheus monitoring:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rotation-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: secret-rotation
      rules:
      - alert: SecretRotationFailed
        expr: |
          rate(vault_database_creds_generation_failures[5m]) > 0
        labels:
          severity: critical
        annotations:
          summary: "Secret rotation failures detected"

      - alert: StaleCredentials
        expr: |
          time() - vault_token_creation_time > 7200
        labels:
          severity: warning
        annotations:
          summary: "Credentials haven't rotated in 2 hours"
```

## Best Practices

Set rotation intervals based on security requirements and operational constraints. More frequent rotation improves security but increases complexity.

Implement graceful handling of credential updates. Applications should reload configurations without dropping active connections or requests.

Monitor rotation success rates. Failed rotations can leave applications with expired credentials.

Use connection pooling that supports credential rotation. Pools should drain old connections and establish new ones with updated credentials.

Test rotation procedures regularly in non-production environments. Ensure the entire rotation workflow operates correctly under various conditions.

## Conclusion

Implementing automatic secret rotation for Kubernetes ServiceAccounts significantly reduces the risk from compromised credentials. By combining Vault's dynamic secret generation with application-level rotation handling, you create a robust security posture where credentials have limited lifetimes and rotate automatically. This pattern is essential for production environments requiring strong security controls and compliance with regulatory frameworks that mandate regular credential rotation.

Adopt automated secret rotation to improve your security posture while maintaining operational efficiency.
