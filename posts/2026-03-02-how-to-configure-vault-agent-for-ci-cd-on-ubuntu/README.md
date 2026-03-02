# How to Configure Vault Agent for CI/CD on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, HashiCorp Vault, CI/CD, Secrets Management, Security

Description: Learn how to install and configure HashiCorp Vault Agent on Ubuntu to automatically authenticate and inject secrets into CI/CD pipelines and applications without hardcoding credentials.

---

Vault Agent is a client-side daemon that handles Vault authentication, token renewal, and secret retrieval automatically. Instead of writing code in every application to authenticate with Vault and refresh tokens, Vault Agent handles all of that and either writes secrets to files or serves them via a local API endpoint. CI/CD pipelines benefit significantly from Vault Agent - build jobs can authenticate using machine identity (IAM, Kubernetes service accounts, TLS certificates) and access secrets without any hardcoded credentials.

## Installing Vault Agent on Ubuntu

Vault Agent is included in the `vault` package:

```bash
# Add HashiCorp's official GPG key and repository
sudo apt-get update && sudo apt-get install -y wget gpg

wget -O- https://apt.releases.hashicorp.com/gpg | \
    sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
    sudo tee /etc/apt/sources.list.d/hashicorp.list

sudo apt-get update && sudo apt-get install -y vault

# Verify installation (vault binary includes both server and agent)
vault version
```

## Understanding Vault Agent Architecture

Vault Agent works as follows:

1. **Auto-auth** - Authenticates to Vault using a configured method (AWS IAM, Kubernetes, AppRole, TLS, etc.)
2. **Token caching** - Maintains and renews the Vault token automatically
3. **Template rendering** - Fetches secrets and writes them to files using Go templates
4. **API proxy** - Optionally proxies Vault API requests from applications using the cached token

## Setting Up AppRole Authentication for CI/CD

AppRole is a common Vault authentication method for CI/CD pipelines. A CI job provides a Role ID (not secret) and a Secret ID (ephemeral, generated per job) to authenticate.

### Configuring Vault (run these on your Vault server)

```bash
# Enable AppRole auth method
vault auth enable approle

# Create a policy for CI/CD access
vault policy write ci-cd-policy - << 'EOF'
# Allow reading application secrets
path "secret/data/myapp/*" {
  capabilities = ["read"]
}

# Allow reading database credentials
path "database/creds/myapp-role" {
  capabilities = ["read"]
}

# Allow generating PKI certificates
path "pki/issue/myapp" {
  capabilities = ["create", "update"]
}
EOF

# Create an AppRole for CI/CD
vault write auth/approle/role/ci-cd-role \
    secret_id_ttl=1h \           # Secret IDs expire after 1 hour
    token_ttl=1h \               # Tokens expire after 1 hour
    token_max_ttl=4h \
    token_policies=ci-cd-policy \
    bind_secret_id=true

# Get the Role ID (not secret - can be stored in CI config)
vault read auth/approle/role/ci-cd-role/role-id
# Save the role_id value

# Generate a Secret ID (generate one per job in CI)
vault write -f auth/approle/role/ci-cd-role/secret-id
# Save the secret_id value (used once, then discard)
```

## Vault Agent Configuration

Create the Vault Agent configuration file:

```hcl
# /etc/vault-agent/config.hcl
# Vault Agent configuration for CI/CD environment

# Vault server address
vault {
  address = "https://vault.example.com:8200"

  # Path to CA certificate if using custom PKI
  # ca_cert = "/etc/ssl/vault-ca.crt"

  # Retry on Vault being unavailable
  retry {
    num_retries = 5
  }
}

# Auto-auth configuration - authenticate using AppRole
auto_auth {
  method "approle" {
    mount_path = "auth/approle"
    config = {
      role_id_file_path   = "/etc/vault-agent/role-id"
      secret_id_file_path = "/etc/vault-agent/secret-id"
      remove_secret_id_file_after_reading = true  # Delete secret-id after use
    }
  }

  # Store token in a file for applications to use directly
  sink "file" {
    config = {
      path = "/run/vault-agent/token"
      mode = 0640
    }
  }
}

# API proxy - forward requests with the cached token
api_proxy {
  use_auto_auth_token = true
}

listener "tcp" {
  address = "127.0.0.1:8100"
  tls_disable = true  # Only expose locally, no TLS needed
}

# Template rendering - fetch secrets and write to files
template {
  source      = "/etc/vault-agent/templates/app-secrets.tpl"
  destination = "/run/vault-agent/secrets/app-secrets.env"
  # Restart command when secrets are renewed
  command     = "systemctl reload myapp"
  # File permissions for the output
  perms       = 0640
}

template {
  source      = "/etc/vault-agent/templates/db-creds.tpl"
  destination = "/run/vault-agent/secrets/db-creds.env"
  command     = "systemctl reload myapp"
  perms       = 0640
}
```

### Template Files

```
{{!-- /etc/vault-agent/templates/app-secrets.tpl --}}
{{!-- Fetches secrets and renders them as environment variable exports --}}

{{ with secret "secret/data/myapp/production" }}
SECRET_KEY={{ .Data.data.secret_key }}
JWT_SIGNING_KEY={{ .Data.data.jwt_key }}
API_KEY={{ .Data.data.api_key }}
ENCRYPTION_KEY={{ .Data.data.encryption_key }}
{{ end }}
```

```
{{!-- /etc/vault-agent/templates/db-creds.tpl --}}
{{!-- Fetches dynamic database credentials --}}

{{ with secret "database/creds/myapp-role" }}
DATABASE_USER={{ .Data.username }}
DATABASE_PASSWORD={{ .Data.password }}
DATABASE_URL=postgresql://{{ .Data.username }}:{{ .Data.password }}@db.internal:5432/myapp
{{ end }}
```

## Running Vault Agent as a systemd Service

```bash
# Create directories
sudo mkdir -p /etc/vault-agent/templates
sudo mkdir -p /run/vault-agent/secrets

# Create a dedicated user for vault-agent
sudo useradd --system --no-create-home --shell /bin/false vault-agent

# Set permissions
sudo chown vault-agent:vault-agent /run/vault-agent /run/vault-agent/secrets
sudo chmod 750 /run/vault-agent /run/vault-agent/secrets

# Create systemd service
sudo tee /etc/systemd/system/vault-agent.service << 'EOF'
[Unit]
Description=Vault Agent
After=network.target
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
User=vault-agent
Group=vault-agent
ExecStart=/usr/bin/vault agent -config /etc/vault-agent/config.hcl
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
RestartSec=5s
KillSignal=SIGTERM

# Hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
ReadWritePaths=/run/vault-agent

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now vault-agent
sudo systemctl status vault-agent
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy Application

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: self-hosted  # Requires self-hosted runner on Ubuntu

    steps:
      - uses: actions/checkout@v4

      - name: Get Vault Secret ID
        id: vault-auth
        env:
          VAULT_ADDR: "https://vault.example.com:8200"
        run: |
          # Generate a fresh Secret ID for this job
          # VAULT_ROLE_ID is stored in GitHub Secrets (not secret itself)
          ROLE_ID="${{ secrets.VAULT_ROLE_ID }}"

          # Generate ephemeral Secret ID using the Vault API
          # This requires an initial bootstrap token with limited permissions
          SECRET_ID=$(curl -s \
            -H "X-Vault-Token: ${{ secrets.VAULT_BOOTSTRAP_TOKEN }}" \
            -X POST \
            "$VAULT_ADDR/v1/auth/approle/role/ci-cd-role/secret-id" | \
            jq -r '.data.secret_id')

          echo "::add-mask::$SECRET_ID"
          echo "secret_id=$SECRET_ID" >> $GITHUB_OUTPUT
          echo "$ROLE_ID" > /tmp/vault-role-id
          echo "$SECRET_ID" > /tmp/vault-secret-id

      - name: Run Vault Agent
        run: |
          # Start vault agent briefly to render templates
          vault agent \
            -config /etc/vault-agent/ci-config.hcl \
            -exit-after-auth \
            2>&1 | tail -20

      - name: Deploy with secrets
        run: |
          # Source the rendered secrets
          set -a
          source /run/vault-agent/secrets/app-secrets.env
          source /run/vault-agent/secrets/db-creds.env
          set +a

          # Deploy using the secrets
          ./deploy.sh
```

### GitLab CI with Vault JWT Authentication

Vault supports GitLab's JWT tokens directly, which is cleaner than AppRole for GitLab CI:

```bash
# On Vault server: Configure JWT auth method for GitLab
vault auth enable jwt

vault write auth/jwt/config \
    oidc_discovery_url="https://gitlab.example.com" \
    bound_issuer="https://gitlab.example.com"

vault write auth/jwt/role/ci-cd \
    role_type="jwt" \
    user_claim="project_id" \
    bound_audiences="https://vault.example.com" \
    bound_claims='{"project_path": "mygroup/myproject"}' \
    policies="ci-cd-policy" \
    ttl="1h"
```

```yaml
# .gitlab-ci.yml
variables:
  VAULT_ADDR: "https://vault.example.com:8200"
  VAULT_ROLE: "ci-cd"

deploy:
  stage: deploy
  id_tokens:
    VAULT_ID_TOKEN:
      aud: https://vault.example.com
  before_script:
    # Authenticate to Vault using GitLab's JWT token
    - |
      VAULT_TOKEN=$(curl -s \
        -X POST \
        -H "Content-Type: application/json" \
        -d "{\"role\": \"$VAULT_ROLE\", \"jwt\": \"$VAULT_ID_TOKEN\"}" \
        "$VAULT_ADDR/v1/auth/jwt/login" | jq -r '.auth.client_token')
      export VAULT_TOKEN

    # Fetch secrets
    - |
      export SECRET_KEY=$(vault kv get -field=secret_key secret/myapp/production)
      export DATABASE_URL=$(vault kv get -field=url secret/myapp/database)
  script:
    - ./deploy.sh
```

## Using Vault Agent Template for Configuration Files

Beyond environment files, Vault Agent can render full configuration files:

```
{{!-- /etc/vault-agent/templates/nginx-ssl.tpl --}}
{{!-- Generate nginx SSL configuration with a certificate from Vault PKI --}}

{{ with pkiCert "pki/issue/web" "common_name=web.example.com" "ttl=720h" }}
# Certificate file
{{ .Cert | writeToFile "/etc/nginx/ssl/cert.pem" "nginx" "nginx" "0644" }}
# Private key
{{ .Key | writeToFile "/etc/nginx/ssl/key.pem" "nginx" "nginx" "0600" }}
# CA chain
{{ .CA | writeToFile "/etc/nginx/ssl/ca.pem" "nginx" "nginx" "0644" }}
{{ end }}
```

This template fetches a certificate from Vault's PKI secrets engine and writes it to disk. Vault Agent automatically renews the certificate before it expires and reloads nginx.

## Troubleshooting

```bash
# Check Vault Agent logs
sudo journalctl -u vault-agent -f

# Verify authentication is working
sudo -u vault-agent vault agent \
    -config /etc/vault-agent/config.hcl \
    -log-level debug 2>&1 | head -50

# Test the AppRole authentication manually
vault write auth/approle/login \
    role_id=<role-id> \
    secret_id=<secret-id>

# Verify the rendered secrets file
sudo cat /run/vault-agent/secrets/app-secrets.env
```

Vault Agent significantly simplifies secret management in CI/CD by handling the authentication complexity and token lifecycle automatically. Build jobs authenticate with machine identity instead of long-lived credentials, secrets are available as files or environment variables, and expired credentials trigger automatic re-authentication rather than deployment failures.
