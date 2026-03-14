# How to Configure Terraform Variables from Secrets with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Tofu Controller, Terraform, Secrets, Variables, GitOps, Kubernetes, Security

Description: Pass sensitive Terraform variables from Kubernetes Secrets using the Tofu Controller to securely inject credentials and sensitive configuration into Terraform modules.

---

## Introduction

Terraform modules frequently require sensitive inputs: database passwords, API tokens, private keys, and cloud provider credentials. Hardcoding these in the `Terraform` resource spec or ConfigMaps is insecure. The Tofu Controller's `varsFrom` with `Secret` sources provides a clean solution: sensitive variables live in Kubernetes Secrets (which can be encrypted at rest and managed by External Secrets Operator or SOPS), and the controller injects them into Terraform execution without ever exposing them in plaintext in Git.

This guide covers creating SOPS-encrypted secrets for Terraform variables, consuming them in Terraform resources via `varsFrom`, and combining secret variables with non-sensitive ConfigMap variables for a complete variable injection pattern.

## Prerequisites

- Tofu Controller installed via Flux
- SOPS configured with Flux (see the SOPS guide for setup)
- `kubectl` CLI installed
- `sops` CLI installed

## Step 1: Create Encrypted Secrets for Sensitive Variables

```yaml
# Create a plaintext secret file (DO NOT commit this)
# infrastructure/terraform/secrets/production-sensitive-vars.yaml (UNENCRYPTED)
apiVersion: v1
kind: Secret
metadata:
  name: terraform-production-sensitive-vars
  namespace: flux-system
type: Opaque
stringData:
  # Database master password
  db_master_password: "MySuperSecurePassword123!"
  # Third-party API credentials
  datadog_api_key: "dd_api_key_abc123"
  datadog_app_key: "dd_app_key_xyz789"
  # Certificate authority private key
  ca_private_key: |
    -----BEGIN RSA PRIVATE KEY-----
    ...
    -----END RSA PRIVATE KEY-----
  # Slack webhook for notifications
  slack_webhook_url: "https://hooks.slack.com/services/T00/B00/XXX"
```

```bash
# Encrypt the secret with SOPS before committing
sops --encrypt \
  --age age1xxxxxxxxxx \
  infrastructure/terraform/secrets/production-sensitive-vars-plain.yaml \
  > infrastructure/terraform/secrets/production-sensitive-vars.yaml

# Verify encryption
head -20 infrastructure/terraform/secrets/production-sensitive-vars.yaml

# Commit only the encrypted version
git add infrastructure/terraform/secrets/production-sensitive-vars.yaml
git commit -m "feat: add encrypted Terraform sensitive variables"
```

## Step 2: Create AWS Credentials Secret for Provider Access

```yaml
# This secret holds AWS credentials used by the Terraform module
# It is encrypted with SOPS - the file below is for reference only
# infrastructure/terraform/secrets/aws-credentials.yaml (encrypt before commit)
apiVersion: v1
kind: Secret
metadata:
  name: terraform-aws-credentials
  namespace: flux-system
type: Opaque
stringData:
  # These map directly to Terraform variable names in the module
  aws_access_key_id: "AKIAIOSFODNN7EXAMPLE"
  aws_secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  aws_session_token: ""  # Leave empty if not using temporary credentials
```

## Step 3: Use varsFrom with a Secret

```yaml
# infrastructure/terraform/production/database.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: production-database
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/rds
  workspace: production-database
  approvePlan: "manual"

  varsFrom:
    # Non-sensitive variables from ConfigMap
    - kind: ConfigMap
      name: terraform-production-vars
      varsKeys:
        - region
        - environment
        - default_db_instance_class

    # Sensitive variables from Secret
    # The controller injects these as Terraform variables with the same key names
    - kind: Secret
      name: terraform-production-sensitive-vars
      # Limit to only the keys this module needs
      varsKeys:
        - db_master_password
        - datadog_api_key
        - datadog_app_key
      # optional: false means the Terraform resource fails if the Secret is missing
      optional: false

    # AWS credentials for provider authentication
    - kind: Secret
      name: terraform-aws-credentials
      varsKeys:
        - aws_access_key_id
        - aws_secret_access_key
      optional: false

  vars:
    - name: db_name
      value: production-appdb
    - name: multi_az
      value: "true"
```

## Step 4: Reference Secrets in the Terraform Module

```hcl
# modules/rds/variables.tf

# Sensitive variables marked as sensitive to prevent Terraform from
# printing their values in plan output
variable "db_master_password" {
  type        = string
  description = "Master password for the RDS instance"
  sensitive   = true  # Prevents the value from appearing in plan/apply output
}

variable "aws_access_key_id" {
  type      = string
  sensitive = true
}

variable "aws_secret_access_key" {
  type      = string
  sensitive = true
}

variable "datadog_api_key" {
  type      = string
  sensitive = true
  default   = ""
}
```

```hcl
# modules/rds/provider.tf
provider "aws" {
  region     = var.region
  access_key = var.aws_access_key_id
  secret_key = var.aws_secret_access_key
}
```

## Step 5: Inject Secrets as Environment Variables

Some secrets work better as environment variables than Terraform variables, especially for provider authentication.

```yaml
# infrastructure/terraform/production/s3.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: production-s3
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/s3-buckets
  workspace: production-s3
  approvePlan: "auto"

  # Inject secrets as environment variables for the runner pod
  # AWS SDK and Terraform AWS provider read these automatically
  runnerPodTemplate:
    spec:
      env:
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: terraform-aws-credentials
              key: aws_access_key_id
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: terraform-aws-credentials
              key: aws_secret_access_key
        - name: AWS_DEFAULT_REGION
          value: us-east-1

  vars:
    - name: environment
      value: production
```

## Step 6: Use External Secrets Operator for Dynamic Secret Rotation

For production, sync secrets from AWS Secrets Manager automatically.

```yaml
# infrastructure/terraform/secrets/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: terraform-production-sensitive-vars
  namespace: flux-system
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: terraform-production-sensitive-vars
    creationPolicy: Owner
  data:
    - secretKey: db_master_password
      remoteRef:
        key: production/database/master
        property: password
    - secretKey: datadog_api_key
      remoteRef:
        key: production/monitoring/datadog
        property: api_key
```

## Best Practices

- Never use `varsFrom` without `varsKeys` for Secrets. Always explicitly list which keys to inject to prevent accidentally exposing unintended secret values as Terraform variables.
- Mark sensitive Terraform variables with `sensitive = true` in the module's `variables.tf`. This prevents their values from appearing in `terraform plan` output stored in the state or controller logs.
- Prefer injecting cloud provider credentials as environment variables (via `runnerPodTemplate.spec.env`) rather than Terraform variables. The AWS provider, Azure provider, and GCP provider all honor standard environment variables.
- Rotate credentials by updating the Kubernetes Secret. The Tofu Controller will detect the change on the next reconciliation and use the new values.
- Use External Secrets Operator to sync secrets from a cloud secrets manager (AWS Secrets Manager, Azure Key Vault) for automatic rotation without manual kubectl commands.

## Conclusion

Sensitive Terraform variables are now injected securely from Kubernetes Secrets, keeping credentials out of Git while maintaining a fully automated GitOps workflow. The Tofu Controller handles secret injection transparently, and SOPS or External Secrets Operator manages the secret lifecycle. Combined with non-sensitive ConfigMap variables, this pattern provides a complete, secure variable injection system for Terraform GitOps.
