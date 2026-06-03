# How to Configure Vault Lease Management and Renewal in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vault, Kubernetes, Lease Management, Secret Rotation, Security

Description: Master HashiCorp Vault lease management and automatic renewal strategies in Kubernetes to maintain continuous access to dynamic secrets and credentials.

---

HashiCorp Vault uses leases to manage the lifecycle of secrets and credentials. Every dynamic secret comes with a lease that defines how long it remains valid. Proper lease management ensures applications maintain continuous access to credentials without interruption. This guide covers configuring lease management and implementing automatic renewal in Kubernetes environments.

## Understanding Vault Leases

When Vault generates a dynamic secret, it creates a lease with a time-to-live (TTL). Once the TTL expires, the secret becomes invalid. Leases serve multiple purposes: they limit the blast radius of compromised credentials, enable automatic credential rotation, and provide audit trails for secret access.

Vault supports two types of TTLs: default TTL and maximum TTL. The default TTL determines initial lease duration, while the maximum TTL sets the absolute limit for renewals. After reaching the maximum TTL, you must request a new secret rather than renewing the existing lease.

## Configuring Default Lease TTLs

Set system-wide default TTLs in Vault's configuration:

```hcl
# vault-config.hcl

storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}

default_lease_ttl = "1h"
max_lease_ttl = "24h"
```

These defaults apply to all secrets unless overridden by specific secret engines. You can also configure TTLs per secret engine:

```bash
# Configure database secret engine TTLs
vault secrets tune \
    -default-lease-ttl=30m \
    -max-lease-ttl=2h \
    database/

# Configure PKI certificate TTLs
vault secrets tune \
    -default-lease-ttl=6h \
    -max-lease-ttl=72h \
    pki/
```

## Implementing Automatic Lease Renewal in Applications

Applications must actively renew leases before they expire. Here's a Go implementation using the Vault client library:

```go
package main

import (
    "context"
    "log"

    "github.com/hashicorp/vault/api"
)

type LeaseManager struct {
    client *api.Client
    secret *api.Secret
    ctx    context.Context
    cancel context.CancelFunc
}

func NewLeaseManager(client *api.Client, secret *api.Secret) *LeaseManager {
    ctx, cancel := context.WithCancel(context.Background())
    return &LeaseManager{
        client: client,
        secret: secret,
        ctx:    ctx,
        cancel: cancel,
    }
}

func (lm *LeaseManager) StartRenewal() {
    if lm.secret.LeaseID == "" {
        log.Println("Secret has no lease ID, renewal not required")
        return
    }

    // Create a renewer
    renewer, err := lm.client.NewLifetimeWatcher(&api.LifetimeWatcherInput{
        Secret:    lm.secret,
        Increment: 3600, // Request 1 hour renewal
    })
    if err != nil {
        log.Printf("Failed to create renewer: %v", err)
        return
    }

    go renewer.Start()
    defer renewer.Stop()

    for {
        select {
        case err := <-renewer.DoneCh():
            if err != nil {
                log.Printf("Renewal failed: %v", err)
            }
            // Lease reached max TTL or renewal failed
            // Request a new secret
            log.Println("Lease renewal ended, requesting new secret")
            return

        case renewal := <-renewer.RenewCh():
            log.Printf("Lease renewed successfully. New lease duration: %d seconds",
                renewal.Secret.LeaseDuration)

        case <-lm.ctx.Done():
            return
        }
    }
}

func (lm *LeaseManager) Stop() {
    lm.cancel()
}
```

This implementation uses Vault's `LifetimeWatcher` to automatically renew leases at appropriate intervals.

## Configuring Lease Renewal with Vault Agent

Vault Agent automates lease renewal without application code changes. Deploy Vault Agent as a sidecar container:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vault-agent-config
  namespace: production
data:
  agent-config.hcl: |
    pid_file = "/tmp/agent.pid"

    vault {
      address = "http://vault.vault-system:8200"
    }

    auto_auth {
      method {
        type = "kubernetes"
        config = {
          role = "myapp"
        }
      }

      sink {
        type = "file"
        config = {
          path = "/vault/token"
        }
      }
    }

    template {
      contents    = <<EOH
{{ with secret "database/creds/myapp" }}
{
  "username": "{{ .Data.username }}",
  "password": "{{ .Data.password }}"
}
{{ end }}
EOH
      destination = "/vault/secrets/database-config.json"
    }
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
      initContainers:
      - name: vault-agent-init
        image: vault:1.15
        args:
        - agent
        - -config=/vault/config/agent-config.hcl
        - -exit-after-auth
        volumeMounts:
        - name: vault-config
          mountPath: /vault/config
        - name: vault-secrets
          mountPath: /vault/secrets
        - name: vault-token
          mountPath: /vault
      containers:
      - name: vault-agent
        image: vault:1.15
        args:
        - agent
        - -config=/vault/config/agent-config.hcl
        volumeMounts:
        - name: vault-config
          mountPath: /vault/config
        - name: vault-secrets
          mountPath: /vault/secrets
        - name: vault-token
          mountPath: /vault
      - name: app
        image: myapp:latest
        volumeMounts:
        - name: vault-secrets
          mountPath: /vault/secrets
      volumes:
      - name: vault-config
        configMap:
          name: vault-agent-config
      - name: vault-secrets
        emptyDir:
          medium: Memory
      - name: vault-token
        emptyDir:
          medium: Memory
```

Vault Agent automatically renews leases and updates secrets in mounted volumes.

## Managing Database Credential Leases

Database credentials are common dynamic secrets requiring lease management:

```bash
# Create database role with specific TTL
vault write database/roles/myapp \
    db_name=postgresql \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Generate credentials
vault read database/creds/myapp
```

The generated credentials have a 1-hour default TTL. Your application must renew the lease before expiration:

```python
import hvac
import time
from threading import Thread

class DatabaseCredentialManager:
    def __init__(self, vault_client, role_name):
        self.client = vault_client
        self.role_name = role_name
        self.credentials = None
        self.lease_id = None
        self.renewal_thread = None

    def get_credentials(self):
        # Get fresh credentials
        response = self.client.read(f'database/creds/{self.role_name}')
        self.credentials = response['data']
        self.lease_id = response['lease_id']
        self.lease_duration = response['lease_duration']

        # Start renewal thread
        self.start_renewal()
        return self.credentials

    def start_renewal(self):
        if self.renewal_thread and self.renewal_thread.is_alive():
            return

        self.renewal_thread = Thread(target=self._renewal_loop)
        self.renewal_thread.daemon = True
        self.renewal_thread.start()

    def _renewal_loop(self):
        while True:
            # Renew at 80% of lease duration
            sleep_time = self.lease_duration * 0.8
            time.sleep(sleep_time)

            try:
                # Attempt renewal
                response = self.client.sys.renew_lease(
                    lease_id=self.lease_id,
                    increment=3600
                )
                self.lease_duration = response['lease_duration']
                print(f"Renewed lease {self.lease_id}")

            except Exception as e:
                print(f"Lease renewal failed: {e}")
                # Get new credentials
                response = self.client.read(f'database/creds/{self.role_name}')
                self.credentials = response['data']
                self.lease_id = response['lease_id']
                self.lease_duration = response['lease_duration']
```

## Revoking Leases

Revoke leases when they're no longer needed to clean up resources:

```bash
# Revoke a specific lease
vault lease revoke database/creds/myapp/abc123

# Revoke all leases under a path
vault lease revoke -prefix database/creds/myapp/

# Force revoke (skip secret engine cleanup; requires -prefix)
vault lease revoke -force -prefix database/creds/myapp/abc123
```

Implement graceful revocation in applications:

```go
func (lm *LeaseManager) Revoke() error {
    if lm.secret.LeaseID == "" {
        return nil
    }

    err := lm.client.Sys().Revoke(lm.secret.LeaseID)
    if err != nil {
        return fmt.Errorf("failed to revoke lease: %w", err)
    }

    log.Printf("Successfully revoked lease %s", lm.secret.LeaseID)
    return nil
}
```

## Monitoring Lease Expiration

Set up monitoring to track lease volume and expiration errors:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-vault-rules
  namespace: monitoring
data:
  vault-alerts.yaml: |
    groups:
    - name: vault-leases
      interval: 30s
      rules:
      - alert: VaultLeasesScheduledForExpiration
        expr: vault_expire_leases_by_expiration > 0
        labels:
          severity: warning
        annotations:
          summary: "Vault leases are scheduled for expiration"

      - alert: VaultLeaseExpirationErrors
        expr: rate(vault_expire_lease_expiration_error[5m]) > 0
        labels:
          severity: critical
        annotations:
          summary: "Vault lease expiration errors detected"
```

## Best Practices for Lease Management

Choose TTL values based on your security requirements and operational needs. Shorter TTLs improve security but increase renewal frequency. For high-availability applications, renew leases at 50-80% of their duration to provide buffer time for retry attempts.

Always implement error handling for renewal failures. When renewal fails, request new credentials rather than continuing with expired ones. Log all renewal attempts and failures for audit and troubleshooting purposes.

Consider using Vault Agent or similar sidecar patterns for applications that don't need custom lease management logic. This approach reduces complexity and ensures consistent behavior across services.

## Conclusion

Effective lease management is crucial for maintaining secure access to dynamic secrets in production environments. By implementing automatic renewal, monitoring lease expiration, and handling failures gracefully, you ensure applications maintain continuous access to credentials while benefiting from the security advantages of short-lived secrets.

Vault's lease system provides the foundation for automated credential rotation, reducing the operational burden of secret management while improving your overall security posture.
