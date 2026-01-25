# How to Configure Boundary for Zero Trust Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HashiCorp Boundary, Zero Trust, Security, Access Management, Kubernetes, Identity-Based Access

Description: Learn how to deploy HashiCorp Boundary for zero trust access to infrastructure. This guide covers installation, target configuration, and integration with identity providers for secure, audited access.

---

> HashiCorp Boundary provides identity-based access management for dynamic infrastructure. By eliminating the need for direct network access and credentials distribution, Boundary enables a true zero trust security model.

Traditional perimeter-based security assumes trust once inside the network. Boundary flips this model by requiring identity verification for every access request, regardless of network location. This approach is particularly valuable for distributed teams accessing cloud infrastructure.

---

## Understanding Boundary Architecture

Boundary consists of several components:

**Controllers**: Manage authentication, authorization, and session management. They coordinate access but never see actual traffic.

**Workers**: Handle the actual proxying of connections. They can be deployed close to targets for performance.

**Targets**: The resources users connect to (servers, databases, Kubernetes clusters).

**Scopes**: Organizational boundaries that contain projects, targets, and users.

---

## Architecture Diagram

```mermaid
graph TB
    subgraph "Users"
        U1[Developer] --> CLI[Boundary CLI]
        U2[DBA] --> Desktop[Boundary Desktop]
    end

    subgraph "Boundary Cluster"
        CLI --> Controller[Controller<br/>Auth & Session]
        Desktop --> Controller
        Controller --> Worker1[Worker<br/>Region A]
        Controller --> Worker2[Worker<br/>Region B]
    end

    subgraph "Identity"
        Controller --> IDP[Identity Provider<br/>OIDC/LDAP]
    end

    subgraph "Targets"
        Worker1 --> DB[(PostgreSQL)]
        Worker1 --> SSH1[SSH Server]
        Worker2 --> K8S[Kubernetes API]
        Worker2 --> SSH2[SSH Server]
    end
```

---

## Prerequisites

Before deploying Boundary:

- Kubernetes cluster (v1.21+) or VMs for deployment
- PostgreSQL 11+ for controller database
- TLS certificates for controller and workers
- OIDC provider for SSO (optional but recommended)

---

## Deploying Boundary Controllers

Deploy Boundary controllers using Helm:

```yaml
# boundary-controller-values.yaml
# Helm values for Boundary controller deployment

controller:
  replicas: 2

  # Database configuration for controller state
  database:
    url: "postgres://boundary:password@postgres:5432/boundary?sslmode=require"

  # KMS configuration for encryption
  kms:
    # Root KMS key for encrypting other keys
    root:
      purpose: root
      aead:
        type: aead
        aead_type: aes-gcm
        key: "replace-with-32-byte-base64-key"

    # Recovery KMS for disaster recovery
    recovery:
      purpose: recovery
      aead:
        type: aead
        aead_type: aes-gcm
        key: "replace-with-32-byte-base64-key"

    # Worker auth KMS for worker-controller communication
    workerAuth:
      purpose: worker-auth
      aead:
        type: aead
        aead_type: aes-gcm
        key: "replace-with-32-byte-base64-key"

  # TLS configuration
  tls:
    certSecret: boundary-controller-tls
    cert: tls.crt
    key: tls.key

  # Listener configuration
  listener:
    api:
      address: "0.0.0.0"
      port: 9200
    cluster:
      address: "0.0.0.0"
      port: 9201

  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 2000m
      memory: 1Gi

# Service configuration
service:
  type: LoadBalancer
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
```

Install the controller:

```bash
# Create namespace
kubectl create namespace boundary

# Create TLS secret
kubectl create secret tls boundary-controller-tls \
  --cert=controller.crt \
  --key=controller.key \
  -n boundary

# Install Boundary controller
helm install boundary-controller hashicorp/boundary \
  --namespace boundary \
  --values boundary-controller-values.yaml

# Initialize the database
kubectl exec -n boundary deploy/boundary-controller -- \
  boundary database init \
  -config=/etc/boundary/config.hcl
```

---

## Deploying Boundary Workers

Workers proxy connections and can be deployed in multiple regions:

```yaml
# boundary-worker-values.yaml
# Configuration for Boundary worker deployment

worker:
  # Connect to controller cluster
  controllers:
  - "boundary-controller.boundary.svc.cluster.local:9201"

  # Worker authentication
  auth:
    # Method for authenticating to controller
    method: "controller-generated"

  # Public address for client connections
  publicAddr: "worker-east.example.com:9202"

  # Tags for target matching
  tags:
    region: ["us-east-1"]
    type: ["prod"]

  # Listener configuration
  listener:
    proxy:
      address: "0.0.0.0"
      port: 9202

  resources:
    requests:
      cpu: 250m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 512Mi

# Deploy as DaemonSet for high availability
kind: DaemonSet
```

Deploy workers:

```bash
# Deploy worker in us-east region
helm install boundary-worker-east hashicorp/boundary-worker \
  --namespace boundary \
  --values boundary-worker-values.yaml \
  --set worker.tags.region=["us-east-1"]

# Deploy worker in us-west region
helm install boundary-worker-west hashicorp/boundary-worker \
  --namespace boundary \
  --values boundary-worker-values.yaml \
  --set worker.tags.region=["us-west-2"] \
  --set worker.publicAddr="worker-west.example.com:9202"
```

---

## Configuring Scopes and Auth Methods

Set up organizational structure with Terraform:

```hcl
# boundary-config.tf
# Terraform configuration for Boundary resources

terraform {
  required_providers {
    boundary = {
      source  = "hashicorp/boundary"
      version = "~> 1.1"
    }
  }
}

provider "boundary" {
  addr             = "https://boundary.example.com:9200"
  recovery_kms_hcl = <<EOT
kms "aead" {
  purpose   = "recovery"
  aead_type = "aes-gcm"
  key       = "replace-with-recovery-key"
}
EOT
}

# Global scope - top level organization
resource "boundary_scope" "global" {
  global_scope = true
  scope_id     = "global"
  name         = "global"
  description  = "Global scope"
}

# Organization scope
resource "boundary_scope" "org" {
  name                     = "engineering"
  description              = "Engineering organization"
  scope_id                 = boundary_scope.global.id
  auto_create_admin_role   = true
  auto_create_default_role = true
}

# Project scopes for different environments
resource "boundary_scope" "production" {
  name                   = "production"
  description            = "Production environment"
  scope_id               = boundary_scope.org.id
  auto_create_admin_role = true
}

resource "boundary_scope" "staging" {
  name                   = "staging"
  description            = "Staging environment"
  scope_id               = boundary_scope.org.id
  auto_create_admin_role = true
}

# OIDC auth method for SSO
resource "boundary_auth_method_oidc" "google" {
  name          = "Google SSO"
  description   = "Google Workspace authentication"
  scope_id      = boundary_scope.org.id

  issuer            = "https://accounts.google.com"
  client_id         = var.google_client_id
  client_secret     = var.google_client_secret
  signing_algorithms = ["RS256"]

  # Map OIDC claims to Boundary accounts
  claims_scopes = ["email", "profile"]
  account_claim_maps = ["email=email"]

  # API URL for callback
  api_url_prefix = "https://boundary.example.com"

  # Make this the primary auth method
  is_primary_for_scope = true
}

# Managed group for automatic role assignment
resource "boundary_managed_group" "engineers" {
  name           = "engineers"
  description    = "Engineering team members"
  auth_method_id = boundary_auth_method_oidc.google.id

  # Filter based on email domain
  filter = "\"@engineering.example.com\" in \"/token/email\""
}
```

---

## Creating Targets

Define the resources users can access:

```hcl
# targets.tf
# Target configurations for Boundary

# Host catalog for static hosts
resource "boundary_host_catalog_static" "production_servers" {
  name        = "production-servers"
  description = "Production server catalog"
  scope_id    = boundary_scope.production.id
}

# Static host definition
resource "boundary_host_static" "web_server_1" {
  name            = "web-server-1"
  description     = "Production web server 1"
  address         = "10.0.1.10"
  host_catalog_id = boundary_host_catalog_static.production_servers.id
}

resource "boundary_host_static" "web_server_2" {
  name            = "web-server-2"
  description     = "Production web server 2"
  address         = "10.0.1.11"
  host_catalog_id = boundary_host_catalog_static.production_servers.id
}

# Host set grouping related hosts
resource "boundary_host_set_static" "web_servers" {
  name            = "web-servers"
  description     = "All production web servers"
  host_catalog_id = boundary_host_catalog_static.production_servers.id
  host_ids = [
    boundary_host_static.web_server_1.id,
    boundary_host_static.web_server_2.id,
  ]
}

# SSH target with credential injection
resource "boundary_target" "ssh_web_servers" {
  name        = "ssh-web-servers"
  description = "SSH access to production web servers"
  type        = "tcp"
  scope_id    = boundary_scope.production.id

  # Default port for SSH
  default_port = 22

  # Session settings
  session_max_seconds        = 28800  # 8 hours
  session_connection_limit   = 10

  # Worker filter - use workers in the same region
  egress_worker_filter = "\"us-east-1\" in \"/tags/region\""

  # Associated hosts
  host_source_ids = [
    boundary_host_set_static.web_servers.id
  ]

  # Inject SSH credentials automatically
  brokered_credential_source_ids = [
    boundary_credential_library_vault.ssh_creds.id
  ]
}

# PostgreSQL target
resource "boundary_target" "postgres_production" {
  name        = "postgres-production"
  description = "Production PostgreSQL database"
  type        = "tcp"
  scope_id    = boundary_scope.production.id

  default_port             = 5432
  session_max_seconds      = 3600  # 1 hour
  session_connection_limit = 1     # Single connection per session

  egress_worker_filter = "\"us-east-1\" in \"/tags/region\""

  host_source_ids = [
    boundary_host_set_static.postgres.id
  ]

  # Database credential injection
  brokered_credential_source_ids = [
    boundary_credential_library_vault.postgres_creds.id
  ]
}

# Kubernetes API target
resource "boundary_target" "kubernetes_production" {
  name        = "kubernetes-production"
  description = "Production Kubernetes API server"
  type        = "tcp"
  scope_id    = boundary_scope.production.id

  default_port             = 6443
  session_max_seconds      = 14400  # 4 hours
  session_connection_limit = -1     # Unlimited

  egress_worker_filter = "\"us-east-1\" in \"/tags/region\""

  host_source_ids = [
    boundary_host_set_static.kubernetes.id
  ]
}
```

---

## Integrating with Vault for Credentials

Use Vault for dynamic credential generation:

```hcl
# vault-integration.tf
# Vault credential store and libraries

# Vault credential store
resource "boundary_credential_store_vault" "vault" {
  name        = "vault"
  description = "HashiCorp Vault credential store"
  scope_id    = boundary_scope.production.id

  address   = "https://vault.example.com:8200"
  token     = var.vault_token
  namespace = "production"

  # TLS verification
  tls_server_name = "vault.example.com"
  tls_skip_verify = false
  ca_cert         = file("vault-ca.pem")
}

# SSH credential library using Vault SSH secrets engine
resource "boundary_credential_library_vault" "ssh_creds" {
  name                = "ssh-credentials"
  description         = "SSH credentials from Vault"
  credential_store_id = boundary_credential_store_vault.vault.id
  credential_type     = "ssh_private_key"

  # Vault path for SSH certificate signing
  path        = "ssh/sign/production-role"
  http_method = "POST"

  # Request body for certificate signing
  http_request_body = jsonencode({
    public_key = "{{user.ssh_public_key}}"
    valid_principals = "ubuntu,ec2-user"
    ttl = "8h"
  })
}

# PostgreSQL credential library
resource "boundary_credential_library_vault" "postgres_creds" {
  name                = "postgres-credentials"
  description         = "PostgreSQL credentials from Vault"
  credential_store_id = boundary_credential_store_vault.vault.id
  credential_type     = "username_password"

  # Vault database secrets engine path
  path = "database/creds/production-readonly"
}
```

---

## Client Configuration

Connect to targets using the Boundary CLI:

```bash
# Install Boundary CLI
# macOS
brew install hashicorp/tap/boundary

# Linux
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install boundary

# Authenticate to Boundary
boundary authenticate oidc \
  -addr=https://boundary.example.com:9200 \
  -auth-method-id=amoidc_1234567890

# List available targets
boundary targets list -recursive

# Connect to SSH target
boundary connect ssh \
  -target-id=ttcp_1234567890 \
  -username=ubuntu

# Connect to PostgreSQL (opens local proxy)
boundary connect postgres \
  -target-id=ttcp_0987654321 \
  -dbname=production

# Connect with kubectl
boundary connect kube \
  -target-id=ttcp_kubernetes \
  -- kubectl get pods

# Generic TCP connection (returns local port)
boundary connect \
  -target-id=ttcp_1234567890 \
  -listen-port=5432
```

---

## Session Recording and Audit

Enable session recording for compliance:

```hcl
# session-recording.tf
# Configure session recording storage

resource "boundary_storage_bucket" "recordings" {
  name        = "session-recordings"
  description = "Storage for session recordings"
  scope_id    = boundary_scope.org.id

  plugin_name = "aws"
  bucket_name = "boundary-session-recordings"

  attributes_json = jsonencode({
    region = "us-east-1"
  })

  secrets_json = jsonencode({
    access_key_id     = var.aws_access_key
    secret_access_key = var.aws_secret_key
  })
}

# Enable recording on target
resource "boundary_target" "ssh_recorded" {
  name        = "ssh-recorded"
  description = "SSH with session recording"
  type        = "ssh"
  scope_id    = boundary_scope.production.id

  default_port           = 22
  session_max_seconds    = 28800
  enable_session_recording = true

  storage_bucket_id = boundary_storage_bucket.recordings.id

  host_source_ids = [
    boundary_host_set_static.web_servers.id
  ]

  injected_application_credential_source_ids = [
    boundary_credential_library_vault.ssh_creds.id
  ]
}
```

---

## Conclusion

HashiCorp Boundary transforms infrastructure access by moving from network-based to identity-based security. By eliminating the need to distribute credentials and providing complete audit trails, Boundary enables true zero trust access.

Start with a pilot project, define clear organizational scopes, and integrate with your identity provider early. The combination of Boundary with Vault for credential management creates a powerful, secure access platform for modern infrastructure.

---

*Complement your zero trust access with comprehensive monitoring. [OneUptime](https://oneuptime.com) provides observability and incident management that integrates with your security infrastructure, helping you correlate access events with application behavior.*
