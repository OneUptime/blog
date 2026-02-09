# How to configure Kustomize secretGenerator with external sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Security

Description: Master Kustomize secretGenerator to create Secrets from external sources like environment variables, files, and secret management systems while maintaining security.

---

Kustomize secretGenerator creates Kubernetes Secrets with automatic hash suffixes, similar to configMapGenerator. However, secrets require special handling to avoid committing sensitive data to version control. By integrating with external secret sources and using proper patterns, you can safely manage secrets in your Kustomize configurations.

## Basic secret generation

Create secrets from literals (for non-sensitive defaults):

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml

secretGenerator:
- name: app-secrets
  literals:
  - api_key=placeholder
  - db_password=changeme
```

Never commit real secrets in literal form. Use this only for templates.

## Generating secrets from files

Create secrets from external files:

```yaml
# base/kustomization.yaml
secretGenerator:
- name: tls-certs
  files:
  - tls.crt
  - tls.key
  type: kubernetes.io/tls
```

Add secret files to `.gitignore`:

```bash
# .gitignore
*.key
*.crt
*-secrets.env
secrets/
```

Generate secrets locally before building:

```bash
# Generate TLS certificates
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt -subj "/CN=example.com"

# Build with Kustomize
kustomize build base/
```

## Using environment files for secrets

Store secrets in environment files outside version control:

```yaml
# secrets.env (not in git)
DATABASE_PASSWORD=super-secret-password
API_KEY=sk-1234567890abcdef
JWT_SECRET=my-jwt-secret-key
REDIS_PASSWORD=redis-password-123
```

Generate secrets from env file:

```yaml
# overlays/production/kustomization.yaml
secretGenerator:
- name: app-secrets
  envs:
  - secrets.env
```

## Sourcing from environment variables

Use shell environment variables:

```bash
# Export secrets
export DB_PASSWORD="production-db-password"
export API_KEY="prod-api-key-12345"

# Create env file from variables
cat > secrets.env <<EOF
DATABASE_PASSWORD=${DB_PASSWORD}
API_KEY=${API_KEY}
EOF

# Build with Kustomize
kustomize build overlays/production/
```

Clean up after building:

```bash
rm secrets.env
```

## Integration with external secret managers

Use a secret fetch script:

```bash
#!/bin/bash
# fetch-secrets.sh

# Fetch from AWS Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id prod/app/database \
  --query SecretString \
  --output text > database-secret.json

# Convert to env format
jq -r 'to_entries | .[] | "\(.key)=\(.value)"' database-secret.json > secrets.env

# Clean up
rm database-secret.json
```

Use in CI/CD:

```yaml
# .github/workflows/deploy.yaml
- name: Fetch secrets
  run: ./fetch-secrets.sh
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

- name: Deploy
  run: kubectl apply -k overlays/production/
```

## Using SOPS for encrypted secrets

Install SOPS and encrypt secrets:

```bash
# Install SOPS
brew install sops

# Create secrets file
cat > secrets.yaml <<EOF
DATABASE_PASSWORD: production-password
API_KEY: sk-prod-key-123
EOF

# Encrypt with age
sops --encrypt --age <public-key> secrets.yaml > secrets.enc.yaml

# Commit encrypted file
git add secrets.enc.yaml
```

Decrypt during build:

```bash
# Decrypt secrets
sops --decrypt secrets.enc.yaml > secrets.env

# Build
kustomize build overlays/production/

# Clean up
rm secrets.env
```

Integrate with Kustomize using exec plugin:

```yaml
# kustomization.yaml
generators:
- |-
  apiVersion: builtin
  kind: SecretGenerator
  metadata:
    name: app-secrets
  envs:
  - secrets.env
```

## Vault integration

Fetch secrets from HashiCorp Vault:

```bash
#!/bin/bash
# vault-secrets.sh

# Login to Vault
vault login -method=kubernetes role=myapp

# Fetch secrets
vault kv get -format=json secret/myapp/prod | \
  jq -r '.data.data | to_entries | .[] | "\(.key)=\(.value)"' > secrets.env
```

Use in kustomization:

```yaml
secretGenerator:
- name: vault-secrets
  envs:
  - secrets.env
```

## Sealed Secrets integration

Use Bitnami Sealed Secrets for GitOps:

```bash
# Install kubeseal
brew install kubeseal

# Create secret
kubectl create secret generic app-secrets \
  --from-literal=api_key=my-secret-key \
  --dry-run=client -o yaml | \
  kubeseal -o yaml > sealed-secret.yaml

# Commit sealed secret (safe to commit)
git add sealed-secret.yaml
```

Reference in kustomization:

```yaml
# base/kustomization.yaml
resources:
- sealed-secret.yaml
```

The SealedSecret controller decrypts it in the cluster.

## Mixing public and private data

Combine non-sensitive literals with secret files:

```yaml
secretGenerator:
- name: mixed-secrets
  literals:
  - username=app-user  # Non-sensitive
  - environment=production  # Non-sensitive
  envs:
  - secrets.env  # Sensitive data from external source
```

## Docker registry secrets

Generate imagePullSecrets:

```yaml
secretGenerator:
- name: docker-registry
  type: kubernetes.io/dockerconfigjson
  files:
  - .dockerconfigjson=config.json
```

Create config.json:

```bash
kubectl create secret docker-registry regcred \
  --docker-server=registry.example.com \
  --docker-username=user \
  --docker-password=password \
  --dry-run=client -o jsonpath='{.data.\.dockerconfigjson}' | \
  base64 -d > config.json
```

## SSH key secrets

Generate secrets for SSH keys:

```yaml
secretGenerator:
- name: ssh-keys
  files:
  - id_rsa=~/.ssh/id_rsa
  - id_rsa.pub=~/.ssh/id_rsa.pub
```

## TLS certificates from cert-manager

Generate placeholder TLS secrets:

```yaml
secretGenerator:
- name: tls-cert
  files:
  - tls.crt
  - tls.key
  type: kubernetes.io/tls
```

In production, let cert-manager manage actual certificates.

## Secret rotation strategy

Enable automatic pod restarts on secret changes:

```yaml
# New secret version
secretGenerator:
- name: app-secrets
  envs:
  - secrets-v2.env  # Updated secrets
```

The hash suffix changes, triggering pod restarts.

## External Secrets Operator integration

Use External Secrets Operator for dynamic secrets:

```yaml
# external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: app-secrets
    creationPolicy: Owner
  data:
  - secretKey: database_password
    remoteRef:
      key: prod/database
      property: password
  - secretKey: api_key
    remoteRef:
      key: prod/api
      property: key
```

Reference in kustomization:

```yaml
# base/kustomization.yaml
resources:
- external-secret.yaml
```

## Templating secrets with variable substitution

Use vars for secret references:

```yaml
secretGenerator:
- name: db-connection
  literals:
  - connection_string=postgresql://user:$(DB_PASSWORD)@postgres:5432/mydb
```

Substitute during build:

```bash
export DB_PASSWORD="secure-password"
kustomize build base/ | envsubst
```

## Merging secrets across layers

Base secrets with overlay additions:

```yaml
# base/kustomization.yaml
secretGenerator:
- name: app-secrets
  literals:
  - common_key=value

# overlays/production/kustomization.yaml
secretGenerator:
- name: app-secrets
  behavior: merge
  envs:
  - prod-secrets.env
```

## Best practices for secret management

Never commit plaintext secrets to git. Use encrypted storage or external sources.

Use different secret files per environment to avoid accidentally deploying dev secrets to production.

Implement secret rotation by generating new secrets regularly and updating deployments.

Use Kubernetes RBAC to limit who can view secrets in the cluster.

Enable audit logging for secret access to track who reads sensitive data.

Consider using the External Secrets Operator for centralized secret management.

## Validation and testing

Test secret generation without exposing values:

```bash
# Build and check secret exists
kustomize build overlays/production/ | grep -A 3 "kind: Secret"

# Verify secret name has hash
kustomize build overlays/production/ | grep "name: app-secrets-"

# Check secret type
kustomize build overlays/production/ | yq eval 'select(.kind == "Secret") | .type' -

# Dry run without applying
kustomize build overlays/production/ | kubectl apply --dry-run=server -f -
```

## Conclusion

Kustomize secretGenerator provides flexible secret creation with automatic hash suffixes for rolling updates. By integrating with external secret sources like Vault, SOPS, or cloud secret managers, you maintain security while leveraging Kustomize's declarative configuration benefits. Never commit plaintext secrets to version control, always use encrypted storage or dynamic secret fetching in your deployment pipelines. Combined with proper RBAC and audit logging, secretGenerator enables secure secret management in GitOps workflows.
