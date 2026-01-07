# How to Implement Secrets Management in Go for Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Kubernetes, Secrets Management, HashiCorp Vault, Security

Description: Implement secure secrets management in Go for Kubernetes using HashiCorp Vault, mounted secrets, and automatic rotation patterns.

---

Secrets management is one of the most critical aspects of building secure applications in Kubernetes. Whether you are dealing with database credentials, API keys, or TLS certificates, how you handle these sensitive values can make or break your application's security posture. In this comprehensive guide, we will explore various approaches to managing secrets in Go applications running on Kubernetes, from native Kubernetes secrets to advanced HashiCorp Vault integration with automatic rotation.

## Why Secrets Management Matters

Before diving into implementation details, let us understand why proper secrets management is crucial:

1. **Security Compliance**: Many regulatory frameworks (SOC 2, PCI-DSS, HIPAA) require proper handling of sensitive data
2. **Breach Prevention**: Hardcoded secrets are a leading cause of security breaches
3. **Operational Efficiency**: Centralized secrets management simplifies credential rotation
4. **Audit Trail**: Understanding who accessed what secrets and when is essential for security audits

## Kubernetes Native Secrets

Kubernetes provides built-in secret management through the Secret resource. While not the most secure option (secrets are base64 encoded, not encrypted by default), it serves as a foundation for many applications.

### Creating Kubernetes Secrets

The following YAML manifest demonstrates creating a Kubernetes Secret with database credentials:

```yaml
# kubernetes/database-secret.yaml
# This creates an Opaque secret type containing database credentials
# Note: Values must be base64 encoded
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
type: Opaque
data:
  # echo -n "mydbuser" | base64
  username: bXlkYnVzZXI=
  # echo -n "supersecretpassword" | base64
  password: c3VwZXJzZWNyZXRwYXNzd29yZA==
  # echo -n "postgres://mydbuser:supersecretpassword@db:5432/myapp" | base64
  connection-string: cG9zdGdyZXM6Ly9teWRidXNlcjpzdXBlcnNlY3JldHBhc3N3b3JkQGRiOjU0MzIvbXlhcHA=
```

### Mounting Secrets as Environment Variables

This approach injects secrets directly as environment variables into your container:

```yaml
# kubernetes/deployment-env-secrets.yaml
# Mounting secrets as environment variables is simple but has security implications
# Environment variables can leak through process listings and crash dumps
apiVersion: apps/v1
kind: Deployment
metadata:
  name: go-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: go-app
  template:
    metadata:
      labels:
        app: go-app
    spec:
      containers:
      - name: go-app
        image: myregistry/go-app:latest
        env:
        # Individual secret keys as environment variables
        - name: DB_USERNAME
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: password
        # Using envFrom to inject all keys from a secret
        envFrom:
        - secretRef:
            name: api-keys
            optional: false
```

### Mounting Secrets as Files

This is the recommended approach for Kubernetes native secrets as it provides better security:

```yaml
# kubernetes/deployment-volume-secrets.yaml
# File-based secrets are more secure than environment variables
# They can be mounted with specific permissions and updated without restart
apiVersion: apps/v1
kind: Deployment
metadata:
  name: go-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: go-app
  template:
    metadata:
      labels:
        app: go-app
    spec:
      containers:
      - name: go-app
        image: myregistry/go-app:latest
        volumeMounts:
        # Mount the secret volume at a specific path
        - name: db-credentials
          mountPath: /etc/secrets/database
          readOnly: true
        - name: tls-certs
          mountPath: /etc/secrets/tls
          readOnly: true
      volumes:
      # Define secret volumes
      - name: db-credentials
        secret:
          secretName: database-credentials
          # Set restrictive file permissions (owner read-only)
          defaultMode: 0400
      - name: tls-certs
        secret:
          secretName: tls-certificates
          defaultMode: 0400
          # Optionally specify which keys to mount
          items:
          - key: tls.crt
            path: server.crt
          - key: tls.key
            path: server.key
```

## Reading Secrets in Go

Now let us implement Go code to read secrets from various sources safely.

### Reading Environment Variable Secrets

This utility function provides safe environment variable reading with validation:

```go
// pkg/secrets/env.go
package secrets

import (
	"fmt"
	"os"
	"strings"
)

// EnvSecretReader provides methods for reading secrets from environment variables
// It includes validation and sanitization to prevent common security issues
type EnvSecretReader struct {
	// prefix is prepended to all secret names for namespacing
	prefix string
}

// NewEnvSecretReader creates a new environment secret reader with an optional prefix
func NewEnvSecretReader(prefix string) *EnvSecretReader {
	return &EnvSecretReader{
		prefix: prefix,
	}
}

// Get retrieves a secret from environment variables
// Returns an error if the secret is not found or is empty
func (r *EnvSecretReader) Get(name string) (string, error) {
	// Build the full environment variable name
	fullName := name
	if r.prefix != "" {
		fullName = fmt.Sprintf("%s_%s", r.prefix, name)
	}

	// Convert to uppercase as per convention
	fullName = strings.ToUpper(fullName)

	value := os.Getenv(fullName)
	if value == "" {
		return "", fmt.Errorf("secret %s not found or empty", fullName)
	}

	return value, nil
}

// GetWithDefault retrieves a secret with a fallback default value
// Use cautiously - defaults for secrets can hide configuration issues
func (r *EnvSecretReader) GetWithDefault(name, defaultValue string) string {
	value, err := r.Get(name)
	if err != nil {
		return defaultValue
	}
	return value
}

// MustGet retrieves a secret and panics if not found
// Useful during application startup for required secrets
func (r *EnvSecretReader) MustGet(name string) string {
	value, err := r.Get(name)
	if err != nil {
		panic(fmt.Sprintf("required secret %s not found: %v", name, err))
	}
	return value
}
```

### Reading File-Based Secrets

This implementation handles file-based secrets with proper security considerations:

```go
// pkg/secrets/file.go
package secrets

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// FileSecretReader reads secrets from files, typically mounted as Kubernetes volumes
// It includes caching to avoid repeated file system access and supports hot-reloading
type FileSecretReader struct {
	basePath string
	cache    map[string]string
	mu       sync.RWMutex
}

// NewFileSecretReader creates a reader that looks for secrets in the specified directory
func NewFileSecretReader(basePath string) *FileSecretReader {
	return &FileSecretReader{
		basePath: basePath,
		cache:    make(map[string]string),
	}
}

// Get reads a secret from a file
// The secret name corresponds to the filename within the base path
func (r *FileSecretReader) Get(name string) (string, error) {
	// Check cache first using read lock
	r.mu.RLock()
	if value, ok := r.cache[name]; ok {
		r.mu.RUnlock()
		return value, nil
	}
	r.mu.RUnlock()

	// Construct the file path safely
	// filepath.Clean prevents directory traversal attacks
	filePath := filepath.Clean(filepath.Join(r.basePath, name))

	// Verify the path is still within our base directory
	// This prevents attacks like name = "../../../etc/passwd"
	if !strings.HasPrefix(filePath, filepath.Clean(r.basePath)) {
		return "", fmt.Errorf("invalid secret path: attempted directory traversal")
	}

	// Read the secret file
	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return "", fmt.Errorf("secret %s not found", name)
		}
		return "", fmt.Errorf("failed to read secret %s: %w", name, err)
	}

	// Trim whitespace - secret files often have trailing newlines
	value := strings.TrimSpace(string(data))

	// Update cache with write lock
	r.mu.Lock()
	r.cache[name] = value
	r.mu.Unlock()

	return value, nil
}

// Refresh clears the cache, forcing secrets to be re-read from disk
// Call this after receiving a signal that secrets have been updated
func (r *FileSecretReader) Refresh() {
	r.mu.Lock()
	r.cache = make(map[string]string)
	r.mu.Unlock()
}

// Watch monitors the secrets directory for changes and triggers a callback
// This enables hot-reloading of secrets without application restart
func (r *FileSecretReader) Watch(onChange func()) error {
	// In production, use fsnotify for efficient file watching
	// This is a simplified example using file modification times
	return nil // Implementation would use fsnotify
}
```

## HashiCorp Vault Integration

For production environments, HashiCorp Vault provides enterprise-grade secrets management with encryption, access control, audit logging, and dynamic secret generation.

### Setting Up the Vault Client

This implementation provides a robust Vault client with automatic token renewal:

```go
// pkg/secrets/vault.go
package secrets

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	vault "github.com/hashicorp/vault/api"
	auth "github.com/hashicorp/vault/api/auth/kubernetes"
)

// VaultClient wraps the HashiCorp Vault client with additional functionality
// including automatic token renewal and caching
type VaultClient struct {
	client      *vault.Client
	cache       map[string]*CachedSecret
	cacheTTL    time.Duration
	mu          sync.RWMutex
	stopRenewal chan struct{}
}

// CachedSecret stores a secret value along with its expiration time
type CachedSecret struct {
	Value     map[string]interface{}
	ExpiresAt time.Time
}

// VaultConfig contains configuration options for the Vault client
type VaultConfig struct {
	// Address is the Vault server URL (e.g., https://vault.example.com:8200)
	Address string
	// Role is the Kubernetes auth role to use
	Role string
	// MountPath is the Vault auth mount path (default: kubernetes)
	MountPath string
	// ServiceAccountTokenPath is the path to the service account token
	ServiceAccountTokenPath string
	// CacheTTL is how long to cache secrets before refreshing
	CacheTTL time.Duration
}

// NewVaultClient creates a new Vault client configured for Kubernetes authentication
func NewVaultClient(cfg VaultConfig) (*VaultClient, error) {
	// Create the base Vault configuration
	config := vault.DefaultConfig()
	config.Address = cfg.Address

	// Enable connection pooling for better performance
	config.MaxRetries = 3
	config.Timeout = 30 * time.Second

	// Create the client
	client, err := vault.NewClient(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create vault client: %w", err)
	}

	// Set up Kubernetes authentication
	// This uses the pod's service account token to authenticate with Vault
	k8sAuth, err := auth.NewKubernetesAuth(
		cfg.Role,
		auth.WithServiceAccountTokenPath(cfg.ServiceAccountTokenPath),
		auth.WithMountPath(cfg.MountPath),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create kubernetes auth: %w", err)
	}

	// Authenticate and get an initial token
	authInfo, err := client.Auth().Login(context.Background(), k8sAuth)
	if err != nil {
		return nil, fmt.Errorf("failed to authenticate with vault: %w", err)
	}

	if authInfo == nil {
		return nil, fmt.Errorf("no auth info returned from vault")
	}

	vc := &VaultClient{
		client:      client,
		cache:       make(map[string]*CachedSecret),
		cacheTTL:    cfg.CacheTTL,
		stopRenewal: make(chan struct{}),
	}

	// Start the token renewal goroutine
	go vc.renewToken(authInfo)

	return vc, nil
}

// renewToken continuously renews the Vault token before it expires
func (vc *VaultClient) renewToken(authInfo *vault.Secret) {
	// Create a token renewal watcher
	watcher, err := vc.client.NewLifetimeWatcher(&vault.LifetimeWatcherInput{
		Secret: authInfo,
		// Renew the token when 75% of its lifetime has elapsed
		Increment: 3600,
	})
	if err != nil {
		log.Printf("failed to create token watcher: %v", err)
		return
	}

	go watcher.Start()
	defer watcher.Stop()

	for {
		select {
		case <-vc.stopRenewal:
			return
		case err := <-watcher.DoneCh():
			if err != nil {
				log.Printf("token renewal failed: %v", err)
			}
			return
		case renewal := <-watcher.RenewCh():
			log.Printf("token renewed successfully, valid for %ds", renewal.Secret.Auth.LeaseDuration)
		}
	}
}

// GetSecret retrieves a secret from Vault's KV v2 secrets engine
func (vc *VaultClient) GetSecret(ctx context.Context, path string) (map[string]interface{}, error) {
	// Check cache first
	vc.mu.RLock()
	if cached, ok := vc.cache[path]; ok && time.Now().Before(cached.ExpiresAt) {
		vc.mu.RUnlock()
		return cached.Value, nil
	}
	vc.mu.RUnlock()

	// Read from Vault
	secret, err := vc.client.KVv2("secret").Get(ctx, path)
	if err != nil {
		return nil, fmt.Errorf("failed to read secret %s: %w", path, err)
	}

	if secret == nil || secret.Data == nil {
		return nil, fmt.Errorf("secret %s not found", path)
	}

	// Update cache
	vc.mu.Lock()
	vc.cache[path] = &CachedSecret{
		Value:     secret.Data,
		ExpiresAt: time.Now().Add(vc.cacheTTL),
	}
	vc.mu.Unlock()

	return secret.Data, nil
}

// GetSecretField retrieves a specific field from a Vault secret
func (vc *VaultClient) GetSecretField(ctx context.Context, path, field string) (string, error) {
	data, err := vc.GetSecret(ctx, path)
	if err != nil {
		return "", err
	}

	value, ok := data[field]
	if !ok {
		return "", fmt.Errorf("field %s not found in secret %s", field, path)
	}

	strValue, ok := value.(string)
	if !ok {
		return "", fmt.Errorf("field %s is not a string", field)
	}

	return strValue, nil
}

// Close stops the token renewal goroutine and cleans up resources
func (vc *VaultClient) Close() {
	close(vc.stopRenewal)
}
```

### Dynamic Database Credentials

Vault can generate short-lived database credentials on demand, enhancing security:

```go
// pkg/secrets/database.go
package secrets

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"sync"
	"time"

	vault "github.com/hashicorp/vault/api"
	_ "github.com/lib/pq"
)

// DynamicDBCredentials manages database connections using Vault-generated credentials
// It automatically rotates credentials before they expire
type DynamicDBCredentials struct {
	vaultClient *vault.Client
	dbPath      string
	dbRole      string

	currentDB   *sql.DB
	currentLease string
	mu          sync.RWMutex

	stopRotation chan struct{}
}

// DynamicDBConfig contains configuration for dynamic database credentials
type DynamicDBConfig struct {
	// VaultClient is the authenticated Vault client
	VaultClient *vault.Client
	// DBPath is the path to the database secrets engine (e.g., "database")
	DBPath string
	// DBRole is the Vault role to use for generating credentials
	DBRole string
	// ConnectionTemplate is a template for the database connection string
	// Use {{username}} and {{password}} as placeholders
	ConnectionTemplate string
}

// NewDynamicDBCredentials creates a new dynamic database credential manager
func NewDynamicDBCredentials(cfg DynamicDBConfig) (*DynamicDBCredentials, error) {
	ddc := &DynamicDBCredentials{
		vaultClient:  cfg.VaultClient,
		dbPath:       cfg.DBPath,
		dbRole:       cfg.DBRole,
		stopRotation: make(chan struct{}),
	}

	// Get initial credentials and establish connection
	if err := ddc.rotate(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to get initial credentials: %w", err)
	}

	return ddc, nil
}

// rotate fetches new credentials from Vault and creates a new database connection
func (d *DynamicDBCredentials) rotate(ctx context.Context) error {
	// Request new credentials from Vault
	path := fmt.Sprintf("%s/creds/%s", d.dbPath, d.dbRole)
	secret, err := d.vaultClient.Logical().ReadWithContext(ctx, path)
	if err != nil {
		return fmt.Errorf("failed to read database credentials: %w", err)
	}

	if secret == nil || secret.Data == nil {
		return fmt.Errorf("no credentials returned from vault")
	}

	// Extract username and password from the response
	username, ok := secret.Data["username"].(string)
	if !ok {
		return fmt.Errorf("username not found in vault response")
	}

	password, ok := secret.Data["password"].(string)
	if !ok {
		return fmt.Errorf("password not found in vault response")
	}

	// Build connection string (example for PostgreSQL)
	connStr := fmt.Sprintf(
		"host=db.example.com port=5432 user=%s password=%s dbname=myapp sslmode=require",
		username, password,
	)

	// Create new database connection
	newDB, err := sql.Open("postgres", connStr)
	if err != nil {
		return fmt.Errorf("failed to create database connection: %w", err)
	}

	// Verify the connection works
	if err := newDB.PingContext(ctx); err != nil {
		newDB.Close()
		return fmt.Errorf("failed to ping database: %w", err)
	}

	// Swap the connections
	d.mu.Lock()
	oldDB := d.currentDB
	d.currentDB = newDB
	d.currentLease = secret.LeaseID
	d.mu.Unlock()

	// Close the old connection after a grace period
	// This allows in-flight queries to complete
	if oldDB != nil {
		go func() {
			time.Sleep(30 * time.Second)
			oldDB.Close()
		}()
	}

	// Schedule the next rotation before the credentials expire
	// Rotate at 75% of the lease duration
	leaseDuration := time.Duration(secret.LeaseDuration) * time.Second
	rotateIn := time.Duration(float64(leaseDuration) * 0.75)

	go func() {
		select {
		case <-time.After(rotateIn):
			if err := d.rotate(context.Background()); err != nil {
				log.Printf("credential rotation failed: %v", err)
			}
		case <-d.stopRotation:
			return
		}
	}()

	log.Printf("database credentials rotated, next rotation in %v", rotateIn)
	return nil
}

// DB returns the current database connection
func (d *DynamicDBCredentials) DB() *sql.DB {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.currentDB
}

// Close stops credential rotation and closes the database connection
func (d *DynamicDBCredentials) Close() error {
	close(d.stopRotation)

	d.mu.Lock()
	defer d.mu.Unlock()

	if d.currentDB != nil {
		return d.currentDB.Close()
	}
	return nil
}
```

## Vault Agent Sidecar Pattern

The Vault Agent sidecar pattern offloads secret management to a dedicated container, keeping your application code simpler.

### Vault Agent Configuration

This ConfigMap configures the Vault Agent sidecar:

```yaml
# kubernetes/vault-agent-config.yaml
# Vault Agent runs as a sidecar and writes secrets to a shared volume
# Your application simply reads files from the shared volume
apiVersion: v1
kind: ConfigMap
metadata:
  name: vault-agent-config
  namespace: production
data:
  vault-agent-config.hcl: |
    exit_after_auth = false
    pid_file = "/home/vault/pidfile"

    auto_auth {
      method "kubernetes" {
        mount_path = "auth/kubernetes"
        config = {
          role = "go-app"
        }
      }

      sink "file" {
        config = {
          path = "/home/vault/.vault-token"
        }
      }
    }

    # Template for database credentials
    template {
      destination = "/vault/secrets/database.json"
      contents = <<EOT
    {
      "username": "{{ with secret "database/creds/go-app" }}{{ .Data.username }}{{ end }}",
      "password": "{{ with secret "database/creds/go-app" }}{{ .Data.password }}{{ end }}"
    }
    EOT
      # Permissions for the rendered file
      perms = 0400
    }

    # Template for API keys
    template {
      destination = "/vault/secrets/api-keys.env"
      contents = <<EOT
    {{ with secret "secret/data/go-app/api-keys" -}}
    STRIPE_API_KEY={{ .Data.data.stripe }}
    SENDGRID_API_KEY={{ .Data.data.sendgrid }}
    {{ end }}
    EOT
      perms = 0400
    }

    # Template for TLS certificates
    template {
      destination = "/vault/secrets/tls.crt"
      contents = <<EOT
    {{ with secret "pki/issue/go-app" "common_name=app.example.com" -}}
    {{ .Data.certificate }}
    {{ end }}
    EOT
      perms = 0400
    }

    template {
      destination = "/vault/secrets/tls.key"
      contents = <<EOT
    {{ with secret "pki/issue/go-app" "common_name=app.example.com" -}}
    {{ .Data.private_key }}
    {{ end }}
    EOT
      perms = 0400
    }
```

### Deployment with Vault Agent Sidecar

This deployment uses the Vault Agent injector or a manual sidecar configuration:

```yaml
# kubernetes/deployment-vault-agent.yaml
# This deployment uses Vault Agent as a sidecar to manage secrets
apiVersion: apps/v1
kind: Deployment
metadata:
  name: go-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: go-app
  template:
    metadata:
      labels:
        app: go-app
      annotations:
        # These annotations configure the Vault Agent Injector
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "go-app"
        vault.hashicorp.com/agent-inject-secret-database.json: "database/creds/go-app"
        vault.hashicorp.com/agent-inject-template-database.json: |
          {{ with secret "database/creds/go-app" -}}
          {
            "username": "{{ .Data.username }}",
            "password": "{{ .Data.password }}"
          }
          {{- end }}
    spec:
      serviceAccountName: go-app
      containers:
      - name: go-app
        image: myregistry/go-app:latest
        env:
        # Tell the app where to find secrets
        - name: SECRETS_PATH
          value: /vault/secrets
        volumeMounts:
        - name: vault-secrets
          mountPath: /vault/secrets
          readOnly: true
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
      volumes:
      - name: vault-secrets
        emptyDir:
          medium: Memory  # Store secrets in memory, not on disk
```

### Reading Vault Agent Rendered Secrets

This Go code reads secrets rendered by the Vault Agent:

```go
// pkg/secrets/vault_agent.go
package secrets

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
)

// VaultAgentSecrets reads secrets rendered by the Vault Agent sidecar
// It watches for file changes and automatically reloads secrets
type VaultAgentSecrets struct {
	basePath   string
	secrets    map[string]interface{}
	mu         sync.RWMutex
	watcher    *fsnotify.Watcher
	onChange   func(string)
	stopWatch  chan struct{}
}

// NewVaultAgentSecrets creates a new reader for Vault Agent rendered secrets
func NewVaultAgentSecrets(basePath string) (*VaultAgentSecrets, error) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, fmt.Errorf("failed to create file watcher: %w", err)
	}

	vas := &VaultAgentSecrets{
		basePath:  basePath,
		secrets:   make(map[string]interface{}),
		watcher:   watcher,
		stopWatch: make(chan struct{}),
	}

	// Load initial secrets
	if err := vas.loadAllSecrets(); err != nil {
		watcher.Close()
		return nil, fmt.Errorf("failed to load initial secrets: %w", err)
	}

	// Start watching for changes
	if err := watcher.Add(basePath); err != nil {
		watcher.Close()
		return nil, fmt.Errorf("failed to watch secrets directory: %w", err)
	}

	go vas.watchForChanges()

	return vas, nil
}

// loadAllSecrets reads all secret files from the base path
func (v *VaultAgentSecrets) loadAllSecrets() error {
	entries, err := os.ReadDir(v.basePath)
	if err != nil {
		return fmt.Errorf("failed to read secrets directory: %w", err)
	}

	v.mu.Lock()
	defer v.mu.Unlock()

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()
		if err := v.loadSecret(name); err != nil {
			return fmt.Errorf("failed to load secret %s: %w", name, err)
		}
	}

	return nil
}

// loadSecret reads and parses a single secret file
func (v *VaultAgentSecrets) loadSecret(name string) error {
	path := filepath.Join(v.basePath, name)

	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	// Try to parse as JSON
	var jsonData interface{}
	if err := json.Unmarshal(data, &jsonData); err == nil {
		v.secrets[name] = jsonData
	} else {
		// Store as raw string if not valid JSON
		v.secrets[name] = string(data)
	}

	return nil
}

// watchForChanges monitors the secrets directory and reloads when files change
func (v *VaultAgentSecrets) watchForChanges() {
	for {
		select {
		case <-v.stopWatch:
			return
		case event, ok := <-v.watcher.Events:
			if !ok {
				return
			}

			// Vault Agent creates temporary files then renames them
			// We only care about write and create events
			if event.Op&(fsnotify.Write|fsnotify.Create) != 0 {
				name := filepath.Base(event.Name)

				// Small delay to ensure file is fully written
				time.Sleep(100 * time.Millisecond)

				v.mu.Lock()
				if err := v.loadSecret(name); err == nil {
					if v.onChange != nil {
						v.onChange(name)
					}
				}
				v.mu.Unlock()
			}

		case err, ok := <-v.watcher.Errors:
			if !ok {
				return
			}
			fmt.Printf("file watcher error: %v\n", err)
		}
	}
}

// OnChange registers a callback function that is called when secrets change
func (v *VaultAgentSecrets) OnChange(fn func(string)) {
	v.onChange = fn
}

// GetJSON retrieves a secret parsed as JSON
func (v *VaultAgentSecrets) GetJSON(name string) (map[string]interface{}, error) {
	v.mu.RLock()
	defer v.mu.RUnlock()

	secret, ok := v.secrets[name]
	if !ok {
		return nil, fmt.Errorf("secret %s not found", name)
	}

	jsonSecret, ok := secret.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("secret %s is not a JSON object", name)
	}

	return jsonSecret, nil
}

// GetString retrieves a secret as a raw string
func (v *VaultAgentSecrets) GetString(name string) (string, error) {
	v.mu.RLock()
	defer v.mu.RUnlock()

	secret, ok := v.secrets[name]
	if !ok {
		return "", fmt.Errorf("secret %s not found", name)
	}

	strSecret, ok := secret.(string)
	if !ok {
		// If it's not a string, marshal it to JSON
		data, err := json.Marshal(secret)
		if err != nil {
			return "", fmt.Errorf("failed to convert secret to string: %w", err)
		}
		return string(data), nil
	}

	return strSecret, nil
}

// Close stops the file watcher
func (v *VaultAgentSecrets) Close() error {
	close(v.stopWatch)
	return v.watcher.Close()
}
```

## Secret Rotation Handling

Proper secret rotation is critical for security. Here is a comprehensive approach to handling rotations:

```go
// pkg/secrets/rotation.go
package secrets

import (
	"context"
	"log"
	"sync"
	"time"
)

// SecretRotationManager coordinates secret rotation across your application
// It ensures all components are updated atomically when secrets change
type SecretRotationManager struct {
	secretSource  SecretSource
	subscribers   []RotationSubscriber
	checkInterval time.Duration
	lastValues    map[string]string
	mu            sync.RWMutex
	stopChan      chan struct{}
}

// SecretSource is an interface for reading secrets from any backend
type SecretSource interface {
	Get(ctx context.Context, name string) (string, error)
}

// RotationSubscriber receives notifications when secrets change
type RotationSubscriber interface {
	// OnSecretRotation is called when a secret value changes
	// The subscriber should update its internal state accordingly
	OnSecretRotation(ctx context.Context, name string, newValue string) error
}

// NewSecretRotationManager creates a new rotation manager
func NewSecretRotationManager(source SecretSource, checkInterval time.Duration) *SecretRotationManager {
	return &SecretRotationManager{
		secretSource:  source,
		checkInterval: checkInterval,
		lastValues:    make(map[string]string),
		stopChan:      make(chan struct{}),
	}
}

// Subscribe adds a component that should be notified of secret changes
func (m *SecretRotationManager) Subscribe(subscriber RotationSubscriber) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.subscribers = append(m.subscribers, subscriber)
}

// Watch starts monitoring the specified secrets for changes
func (m *SecretRotationManager) Watch(ctx context.Context, secretNames []string) {
	// Get initial values
	for _, name := range secretNames {
		value, err := m.secretSource.Get(ctx, name)
		if err != nil {
			log.Printf("failed to get initial value for secret %s: %v", name, err)
			continue
		}
		m.lastValues[name] = value
	}

	// Start the monitoring loop
	ticker := time.NewTicker(m.checkInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-m.stopChan:
			return
		case <-ticker.C:
			m.checkForRotations(ctx, secretNames)
		}
	}
}

// checkForRotations compares current values against cached values
func (m *SecretRotationManager) checkForRotations(ctx context.Context, secretNames []string) {
	for _, name := range secretNames {
		newValue, err := m.secretSource.Get(ctx, name)
		if err != nil {
			log.Printf("failed to check secret %s: %v", name, err)
			continue
		}

		m.mu.RLock()
		oldValue, exists := m.lastValues[name]
		m.mu.RUnlock()

		// Check if the value has changed
		if exists && oldValue == newValue {
			continue
		}

		log.Printf("secret %s has been rotated", name)

		// Update our cached value
		m.mu.Lock()
		m.lastValues[name] = newValue
		m.mu.Unlock()

		// Notify all subscribers
		m.notifySubscribers(ctx, name, newValue)
	}
}

// notifySubscribers informs all registered subscribers of a rotation
func (m *SecretRotationManager) notifySubscribers(ctx context.Context, name, newValue string) {
	m.mu.RLock()
	subscribers := make([]RotationSubscriber, len(m.subscribers))
	copy(subscribers, m.subscribers)
	m.mu.RUnlock()

	for _, subscriber := range subscribers {
		if err := subscriber.OnSecretRotation(ctx, name, newValue); err != nil {
			log.Printf("subscriber failed to handle rotation for %s: %v", name, err)
		}
	}
}

// Stop halts the rotation monitoring
func (m *SecretRotationManager) Stop() {
	close(m.stopChan)
}
```

## Avoiding Secrets in Code and Logs

One of the most important security practices is ensuring secrets never appear in logs or code:

```go
// pkg/secrets/safe.go
package secrets

import (
	"regexp"
	"strings"
)

// SecretValue wraps a string value and prevents accidental logging
// It implements fmt.Stringer to return a redacted value
type SecretValue struct {
	value string
}

// NewSecretValue creates a new secret value wrapper
func NewSecretValue(value string) SecretValue {
	return SecretValue{value: value}
}

// String returns a redacted representation for logging
// This prevents secrets from appearing in logs when using fmt.Printf, etc.
func (s SecretValue) String() string {
	return "[REDACTED]"
}

// Value returns the actual secret value
// Use this method only when you actually need the secret
func (s SecretValue) Value() string {
	return s.value
}

// MarshalJSON returns a redacted value for JSON serialization
func (s SecretValue) MarshalJSON() ([]byte, error) {
	return []byte(`"[REDACTED]"`), nil
}

// LogSanitizer removes sensitive information from log messages
type LogSanitizer struct {
	patterns []*regexp.Regexp
}

// NewLogSanitizer creates a sanitizer with common secret patterns
func NewLogSanitizer() *LogSanitizer {
	patterns := []string{
		// API keys and tokens
		`(?i)(api[_-]?key|token|secret|password|passwd|pwd)[=:]\s*['"]?([^'"\s]+)['"]?`,
		// Bearer tokens
		`(?i)bearer\s+[a-zA-Z0-9\-._~+/]+=*`,
		// Basic auth
		`(?i)basic\s+[a-zA-Z0-9+/]+=*`,
		// Connection strings with passwords
		`(?i)(postgres|mysql|mongodb)://[^:]+:([^@]+)@`,
		// AWS keys
		`(?i)(AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}`,
		// Private keys
		`-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----`,
	}

	compiled := make([]*regexp.Regexp, 0, len(patterns))
	for _, p := range patterns {
		compiled = append(compiled, regexp.MustCompile(p))
	}

	return &LogSanitizer{patterns: compiled}
}

// Sanitize removes sensitive information from a string
func (s *LogSanitizer) Sanitize(input string) string {
	result := input

	for _, pattern := range s.patterns {
		result = pattern.ReplaceAllStringFunc(result, func(match string) string {
			// Keep the key name but redact the value
			if idx := strings.Index(match, "="); idx != -1 {
				return match[:idx+1] + "[REDACTED]"
			}
			if idx := strings.Index(match, ":"); idx != -1 {
				return match[:idx+1] + "[REDACTED]"
			}
			return "[REDACTED]"
		})
	}

	return result
}

// SanitizedLogger wraps a logger to automatically sanitize output
type SanitizedLogger struct {
	sanitizer *LogSanitizer
	logFunc   func(format string, args ...interface{})
}

// NewSanitizedLogger creates a logger that automatically redacts secrets
func NewSanitizedLogger(logFunc func(string, ...interface{})) *SanitizedLogger {
	return &SanitizedLogger{
		sanitizer: NewLogSanitizer(),
		logFunc:   logFunc,
	}
}

// Printf logs a sanitized message
func (l *SanitizedLogger) Printf(format string, args ...interface{}) {
	// Sanitize all string arguments
	sanitizedArgs := make([]interface{}, len(args))
	for i, arg := range args {
		if str, ok := arg.(string); ok {
			sanitizedArgs[i] = l.sanitizer.Sanitize(str)
		} else {
			sanitizedArgs[i] = arg
		}
	}

	l.logFunc(l.sanitizer.Sanitize(format), sanitizedArgs...)
}
```

## Complete Application Example

Here is how to tie everything together in a production-ready application:

```go
// main.go
package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"myapp/pkg/secrets"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Determine the secrets source based on environment
	secretsPath := os.Getenv("SECRETS_PATH")
	vaultAddr := os.Getenv("VAULT_ADDR")

	var db *sql.DB
	var cleanup func()

	if vaultAddr != "" {
		// Use Vault for secrets management
		db, cleanup = initWithVault(ctx)
	} else if secretsPath != "" {
		// Use file-based secrets (Vault Agent or Kubernetes mounted)
		db, cleanup = initWithFileSecrets(ctx, secretsPath)
	} else {
		// Fall back to environment variables
		db, cleanup = initWithEnvSecrets(ctx)
	}

	defer cleanup()

	// Create the HTTP server
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		if err := db.PingContext(r.Context()); err != nil {
			http.Error(w, "Database unhealthy", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	server := &http.Server{
		Addr:    ":8080",
		Handler: mux,
	}

	// Handle graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh

		log.Println("shutting down...")
		cancel()

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer shutdownCancel()

		server.Shutdown(shutdownCtx)
	}()

	log.Println("server starting on :8080")
	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}

// initWithVault initializes the application using HashiCorp Vault
func initWithVault(ctx context.Context) (*sql.DB, func()) {
	vaultClient, err := secrets.NewVaultClient(secrets.VaultConfig{
		Address:                 os.Getenv("VAULT_ADDR"),
		Role:                    os.Getenv("VAULT_ROLE"),
		MountPath:               "kubernetes",
		ServiceAccountTokenPath: "/var/run/secrets/kubernetes.io/serviceaccount/token",
		CacheTTL:                5 * time.Minute,
	})
	if err != nil {
		log.Fatalf("failed to create vault client: %v", err)
	}

	// Get database credentials from Vault
	dbCreds, err := vaultClient.GetSecret(ctx, "database/config")
	if err != nil {
		log.Fatalf("failed to get database credentials: %v", err)
	}

	connStr := dbCreds["connection_string"].(string)
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}

	return db, func() {
		db.Close()
		vaultClient.Close()
	}
}

// initWithFileSecrets initializes using file-based secrets
func initWithFileSecrets(ctx context.Context, path string) (*sql.DB, func()) {
	secretReader, err := secrets.NewVaultAgentSecrets(path)
	if err != nil {
		log.Fatalf("failed to create secret reader: %v", err)
	}

	// Set up rotation handling
	secretReader.OnChange(func(name string) {
		log.Printf("secret %s was updated", name)
		// Handle the rotation - reconnect to database, refresh tokens, etc.
	})

	dbConfig, err := secretReader.GetJSON("database.json")
	if err != nil {
		log.Fatalf("failed to get database config: %v", err)
	}

	connStr := dbConfig["connection_string"].(string)
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}

	return db, func() {
		db.Close()
		secretReader.Close()
	}
}

// initWithEnvSecrets initializes using environment variables
func initWithEnvSecrets(ctx context.Context) (*sql.DB, func()) {
	reader := secrets.NewEnvSecretReader("APP")

	connStr := reader.MustGet("DATABASE_URL")

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}

	return db, func() {
		db.Close()
	}
}
```

## Security Best Practices Summary

When implementing secrets management in Go for Kubernetes, follow these best practices:

1. **Never hardcode secrets** - Always use external secret sources
2. **Prefer file-based secrets over environment variables** - Environment variables can leak through process listings and crash dumps
3. **Use short-lived credentials** - Dynamic secrets from Vault reduce the blast radius of a compromise
4. **Implement secret rotation** - Regularly rotate credentials and handle rotations gracefully
5. **Sanitize logs** - Ensure secrets never appear in logs or error messages
6. **Use memory-backed volumes** - Store secrets in tmpfs to prevent disk persistence
7. **Apply least privilege** - Applications should only access the secrets they need
8. **Enable audit logging** - Track who accesses secrets and when
9. **Encrypt secrets at rest** - Enable Kubernetes encryption or use Vault's encrypted storage
10. **Use service accounts** - Leverage Kubernetes RBAC and Vault policies for access control

## Conclusion

Implementing proper secrets management in Go for Kubernetes requires careful consideration of security, reliability, and operational concerns. Whether you start with Kubernetes native secrets or implement a full HashiCorp Vault solution, the patterns shown in this guide will help you build secure, production-ready applications.

The key takeaways are:
- Use file-based secrets over environment variables when possible
- Implement automatic rotation handling to prevent credential expiry
- Use the Vault Agent sidecar pattern to simplify application code
- Always sanitize logs and prevent secrets from appearing in error messages
- Design for graceful handling of credential rotation

By following these patterns and best practices, you can build Go applications that handle secrets securely while remaining maintainable and operationally sound.
