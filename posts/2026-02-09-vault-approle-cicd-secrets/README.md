# How to use Vault AppRole auth method for CI/CD secret access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HashiCorp Vault, AppRole, CI/CD, GitHub Actions, GitLab CI, Secret Management

Description: Learn how to implement Vault AppRole authentication for secure secret access in CI/CD pipelines, enabling automated deployments without long-lived credentials.

---

CI/CD pipelines need secrets to deploy applications, but storing long-lived credentials in pipeline configurations is risky. Vault's AppRole auth method provides machine authentication suitable for CI/CD, using short-lived role IDs and secret IDs to obtain time-limited tokens. This guide shows you how to integrate AppRole with popular CI/CD systems.

## Understanding AppRole Authentication

AppRole provides a "pull" model for authentication where applications provide two credentials: a role ID (similar to a username) and a secret ID (similar to a password). The secret ID can be configured with usage limits and TTL, ensuring credentials are short-lived and single-use.

The workflow operates like this: create AppRole role with policies, generate role ID (static identifier), generate secret ID (temporary credential), pipeline authenticates using both IDs, Vault returns time-limited token, and pipeline uses token to access secrets.

## Enabling and Configuring AppRole

Set up AppRole auth method:

```bash
# Enable AppRole
vault auth enable approle

# Create role for CI/CD
vault write auth/approle/role/cicd \
  token_ttl=20m \
  token_max_ttl=30m \
  token_policies="cicd-deploy" \
  secret_id_ttl=10m \
  secret_id_num_uses=1 \
  bind_secret_id=true

# Get role ID
vault read auth/approle/role/cicd/role-id
# role_id: abc123...

# Store role ID as environment variable in CI/CD system
```

## Creating CI/CD Policy

Define what CI/CD pipelines can access:

```bash
vault policy write cicd-deploy - <<EOF
# Read application secrets
path "secret/data/app/*" {
  capabilities = ["read"]
}

# Read database credentials
path "database/creds/deploy-role" {
  capabilities = ["read"]
}

# Read Kubernetes auth config for app deployment
path "secret/data/kubernetes/config" {
  capabilities = ["read"]
}

# Cannot modify secrets
path "secret/data/*" {
  capabilities = ["deny"]
}
EOF
```

## Integrating with GitHub Actions

Use AppRole in GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy Application

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Get Vault Token
        id: vault-token
        env:
          VAULT_ADDR: ${{ secrets.VAULT_ADDR }}
          ROLE_ID: ${{ secrets.VAULT_ROLE_ID }}
        run: |
          # Request secret ID from secret ID issuing system
          SECRET_ID=$(curl -X POST ${{ secrets.SECRET_ID_ENDPOINT }} \
            -H "Authorization: Bearer ${{ secrets.ISSUER_TOKEN }}" \
            -d '{"role":"cicd"}' | jq -r '.secret_id')

          # Authenticate to Vault
          VAULT_TOKEN=$(curl -X POST $VAULT_ADDR/v1/auth/approle/login \
            -d "{\"role_id\":\"$ROLE_ID\",\"secret_id\":\"$SECRET_ID\"}" | \
            jq -r '.auth.client_token')

          echo "::add-mask::$VAULT_TOKEN"
          echo "vault_token=$VAULT_TOKEN" >> $GITHUB_OUTPUT

      - name: Get Secrets from Vault
        env:
          VAULT_ADDR: ${{ secrets.VAULT_ADDR }}
          VAULT_TOKEN: ${{ steps.vault-token.outputs.vault_token }}
        run: |
          # Get application secrets
          curl -H "X-Vault-Token: $VAULT_TOKEN" \
            $VAULT_ADDR/v1/secret/data/app/config | \
            jq -r '.data.data' > app-config.json

          # Get database credentials
          DB_CREDS=$(curl -H "X-Vault-Token: $VAULT_TOKEN" \
            $VAULT_ADDR/v1/database/creds/deploy-role | \
            jq -r '.data')

          echo "DB_USER=$(echo $DB_CREDS | jq -r '.username')" >> $GITHUB_ENV
          echo "::add-mask::$(echo $DB_CREDS | jq -r '.password')"
          echo "DB_PASS=$(echo $DB_CREDS | jq -r '.password')" >> $GITHUB_ENV

      - name: Deploy Application
        run: |
          # Use secrets from previous step
          ./deploy.sh
```

## Creating Secret ID Issuer

Build a service to generate secret IDs on demand:

```go
package main

import (
    "encoding/json"
    "net/http"
    "github.com/hashicorp/vault/api"
)

type SecretIDRequest struct {
    Role string `json:"role"`
}

type SecretIDResponse struct {
    SecretID string `json:"secret_id"`
}

func handleSecretID(w http.ResponseWriter, r *http.Request) {
    // Verify request authentication
    token := r.Header.Get("Authorization")
    if !validateToken(token) {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    var req SecretIDRequest
    json.NewDecoder(r.Body).Decode(&req)

    // Connect to Vault
    client, _ := vault.NewClient(vault.DefaultConfig())
    client.SetToken(getVaultToken())

    // Generate secret ID
    secret, err := client.Logical().Write(
        "auth/approle/role/"+req.Role+"/secret-id",
        map[string]interface{}{
            "metadata": map[string]string{
                "issued_to": "ci-cd-pipeline",
                "job_id":    r.Header.Get("X-Job-ID"),
            },
        },
    )
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    secretID := secret.Data["secret_id"].(string)

    json.NewEncoder(w).Encode(SecretIDResponse{
        SecretID: secretID,
    })
}

func main() {
    http.HandleFunc("/secret-id", handleSecretID)
    http.ListenAndServe(":8080", nil)
}
```

## Integrating with GitLab CI

Use AppRole in GitLab CI:

```yaml
# .gitlab-ci.yml
variables:
  VAULT_ADDR: "https://vault.company.com"

stages:
  - deploy

deploy:
  stage: deploy
  image: vault:latest
  script:
    # Get secret ID
    - |
      SECRET_ID=$(curl -X POST $SECRET_ID_ENDPOINT \
        -H "Authorization: Bearer $CI_JOB_TOKEN" \
        -d "{\"role\":\"cicd\"}" | jq -r '.secret_id')

    # Authenticate to Vault
    - |
      export VAULT_TOKEN=$(vault write -field=token auth/approle/login \
        role_id=$VAULT_ROLE_ID \
        secret_id=$SECRET_ID)

    # Get secrets
    - vault kv get -field=api_key secret/app/config > api_key.txt
    - vault read -field=password database/creds/deploy-role > db_password.txt

    # Deploy using secrets
    - ./deploy.sh
  only:
    - main
```

## Using with Jenkins

Integrate with Jenkins Pipeline:

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        VAULT_ADDR = 'https://vault.company.com'
        ROLE_ID = credentials('vault-role-id')
    }

    stages {
        stage('Deploy') {
            steps {
                script {
                    // Get secret ID
                    def secretIdResponse = sh(
                        script: """
                            curl -X POST ${env.SECRET_ID_ENDPOINT} \
                                -H "Authorization: Bearer ${env.ISSUER_TOKEN}" \
                                -d '{"role":"cicd"}'
                        """,
                        returnStdout: true
                    ).trim()

                    def secretId = readJSON(text: secretIdResponse).secret_id

                    // Authenticate to Vault
                    def vaultResponse = sh(
                        script: """
                            curl -X POST ${VAULT_ADDR}/v1/auth/approle/login \
                                -d '{"role_id":"${ROLE_ID}","secret_id":"${secretId}"}'
                        """,
                        returnStdout: true
                    ).trim()

                    def vaultToken = readJSON(text: vaultResponse).auth.client_token

                    // Get secrets
                    withEnv(["VAULT_TOKEN=${vaultToken}"]) {
                        sh '''
                            vault kv get -field=config secret/app/config > config.json
                            vault read -field=username database/creds/deploy-role > db_user.txt
                            vault read -field=password database/creds/deploy-role > db_pass.txt
                        '''
                    }

                    // Deploy
                    sh './deploy.sh'
                }
            }
        }
    }
}
```

## Implementing Secret ID Wrapping

Use response wrapping for additional security:

```bash
# Generate wrapped secret ID
vault write -wrap-ttl=5m -f \
  auth/approle/role/cicd/secret-id

# Output:
# Key                              Value
# ---                              -----
# wrapping_token:                  hvs.CAES...
# wrapping_token_ttl:              5m
# wrapping_token_creation_time:    2024-02-09 10:00:00

# In CI/CD, unwrap to get secret ID
vault unwrap hvs.CAES...

# Output contains the actual secret ID
```

Use in GitHub Actions:

```yaml
- name: Get Secret ID
  run: |
    # Get wrapped token from secure endpoint
    WRAPPED_TOKEN=$(curl $WRAPPED_TOKEN_ENDPOINT)

    # Unwrap to get secret ID
    SECRET_ID=$(vault unwrap -field=secret_id $WRAPPED_TOKEN)

    echo "::add-mask::$SECRET_ID"
    echo "SECRET_ID=$SECRET_ID" >> $GITHUB_ENV
```

## Monitoring AppRole Usage

Track AppRole authentication:

```bash
# Enable audit logging
vault audit enable file file_path=/vault/logs/audit.log

# Monitor AppRole logins
cat /vault/logs/audit.log | \
  jq 'select(.request.path == "auth/approle/login") |
      {time: .time, role: .request.data.role_id, result: .error}'

# Count failed attempts
cat /vault/logs/audit.log | \
  jq 'select(.request.path == "auth/approle/login" and .error != "") |
      .request.data.role_id' | sort | uniq -c

# Track secret ID generation
cat /vault/logs/audit.log | \
  jq 'select(.request.path | contains("secret-id")) |
      {time: .time, role: .request.path, metadata: .request.data.metadata}'
```

## Security Best Practices

Never commit role IDs to source control - store in CI/CD secrets. Generate secret IDs on-demand, never pre-generate and store. Use secret ID wrapping for additional security layer. Implement strict TTLs on both tokens and secret IDs. Set secret_id_num_uses to 1 for single-use credentials. Monitor for unusual AppRole usage patterns. Rotate role IDs periodically. Use metadata to track secret ID usage. Implement rate limiting on secret ID generation. Audit all AppRole authentications regularly.

AppRole provides secure machine authentication for CI/CD pipelines without storing long-lived credentials. By generating short-lived secret IDs on-demand and using single-use tokens, you minimize the attack surface while enabling automated secret access. This approach works across all major CI/CD platforms while maintaining strong security guarantees.
