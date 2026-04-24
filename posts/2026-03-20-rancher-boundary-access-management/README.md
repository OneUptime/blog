# How to Set Up Rancher with Boundary for Access Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Boundary, HashiCorp, Access-management, Zero-trust, Kubernetes

Description: A guide to integrating Rancher with HashiCorp Boundary for dynamic, identity-based access management to Kubernetes clusters and workloads.

## Overview

HashiCorp Boundary provides identity-based access management for infrastructure, replacing traditional VPN and bastion host approaches with a modern zero-trust model. Integrating Boundary with Rancher-managed Kubernetes clusters provides dynamic, audited access to cluster API servers, internal services, and pods without exposing them directly to the network. This guide covers the integration.

## Architecture

```text
User/Operator
     |
  [OIDC/LDAP Authentication]
     |
  Boundary Controller (public control plane) ----> [Vault credential brokering]
     |
  Boundary Worker (session proxy in private network)
     |
  Kubernetes API / Internal Services
  (Rancher-managed clusters)
```

## Prerequisites

- HashiCorp Boundary v0.20.x (HCP Boundary or self-hosted)
- HashiCorp Vault 1.11+ (for dynamic credentials)
- Rancher v2.7+ with managed clusters
- PostgreSQL for self-hosted Boundary controllers
- OIDC identity provider configured
- `kubectl` installed on the operator workstation

## Step 1: Deploy Boundary Controller

```bash
# Self-hosted Boundary only. Run database initialization once from a
# controller node, then start the controller service.
boundary database init -config=/etc/boundary.d/boundary-controller.hcl
boundary server -config=/etc/boundary.d/boundary-controller.hcl
```

### Boundary Configuration

```hcl
# boundary-controller.hcl
controller {
  name        = "rancher-boundary-controller"
  description = "Boundary controller for Rancher clusters"

  database {
    url = "env://BOUNDARY_PG_URL"
  }
}

listener "tcp" {
  address     = "0.0.0.0:9200"
  purpose     = "api"
  tls_disable = false
  tls_cert_file = "/tls/cert.pem"
  tls_key_file  = "/tls/key.pem"
}

listener "tcp" {
  address = "0.0.0.0:9201"
  purpose = "cluster"
}

kms "transit" {
  purpose    = "root"
  address    = "https://vault.example.com"
  mount_path = "transit/"
  key_name   = "boundary-root"
  key_id     = "global_root"
}

kms "transit" {
  purpose    = "worker-auth"
  address    = "https://vault.example.com"
  mount_path = "transit/"
  key_name   = "boundary-worker-auth"
  key_id     = "global_worker-auth"
}

kms "transit" {
  purpose    = "recovery"
  address    = "https://vault.example.com"
  mount_path = "transit/"
  key_name   = "boundary-recovery"
  key_id     = "global_recovery"
}
```

## Step 2: Deploy Boundary Workers in Kubernetes

Workers run inside the private network and proxy connections to targets:

```yaml
# Boundary worker deployment in Kubernetes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: boundary-worker
  namespace: boundary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: boundary-worker
  template:
    metadata:
      labels:
        app: boundary-worker
    spec:
      containers:
        - name: boundary-worker
          image: hashicorp/boundary:0.20.1
          args:
            - server
            - -config=/boundary/config.hcl
          env:
            - name: BOUNDARY_WORKER_ACTIVATION_TOKEN
              valueFrom:
                secretKeyRef:
                  name: boundary-worker-credentials
                  key: activation-token
          volumeMounts:
            - name: config
              mountPath: /boundary
            - name: auth-storage
              mountPath: /var/lib/boundary
      volumes:
        - name: config
          configMap:
            name: boundary-worker-config
        - name: auth-storage
          persistentVolumeClaim:
            claimName: boundary-worker-auth-storage
```

```hcl
# boundary-worker.hcl
listener "tcp" {
  address     = "0.0.0.0:9202"
  purpose     = "proxy"
  tls_disable = true
}

worker {
  auth_storage_path = "/var/lib/boundary"

  # For HCP Boundary, use hcp_boundary_cluster_id instead of initial_upstreams.
  initial_upstreams = ["boundary-controller.example.com:9201"]
  controller_generated_activation_token = "env://BOUNDARY_WORKER_ACTIVATION_TOKEN"
  public_addr = "boundary-worker.example.com:9202"

  tags {
    type   = ["kubernetes"]
    region = ["us-east-1"]
  }
}
```

## Step 3: Configure Boundary Resources via Terraform

```hcl
# boundary-resources.tf

# Organization scope
resource "boundary_scope" "org" {
  name        = "Engineering Organization"
  description = "Engineering team scope"
  scope_id    = "global"
  auto_create_admin_role   = true
  auto_create_default_role = true
}

# Project scope for Kubernetes access
resource "boundary_scope" "kubernetes" {
  name     = "Kubernetes Clusters"
  scope_id = boundary_scope.org.id
  auto_create_admin_role   = true
  auto_create_default_role = true
}

# Auth method - OIDC
resource "boundary_auth_method_oidc" "corporate" {
  name          = "Corporate SSO"
  scope_id      = boundary_scope.org.id
  issuer        = "https://login.microsoftonline.com/${var.tenant_id}/v2.0"
  client_id     = var.oidc_client_id
  client_secret = var.oidc_client_secret
  signing_algorithms = ["RS256"]
  api_url_prefix = "https://boundary.example.com"
  is_primary_for_scope = true
}

# Host catalog for Kubernetes API targets
resource "boundary_host_catalog_static" "kubernetes" {
  name     = "Kubernetes API Servers"
  scope_id = boundary_scope.kubernetes.id
}

# Host: Production cluster API server
resource "boundary_host_static" "prod_cluster" {
  name            = "prod-us-east-01"
  host_catalog_id = boundary_host_catalog_static.kubernetes.id
  address         = "10.0.1.100"   # Internal API server IP
}

# Host set
resource "boundary_host_set_static" "production" {
  name            = "Production Clusters"
  host_catalog_id = boundary_host_catalog_static.kubernetes.id
  host_ids        = [boundary_host_static.prod_cluster.id]
}

# Target: Kubernetes API access
resource "boundary_target" "kubernetes_api" {
  name         = "Production Kubernetes API"
  type         = "tcp"
  scope_id     = boundary_scope.kubernetes.id
  default_port = 6443

  host_source_ids = [boundary_host_set_static.production.id]

  # Require Vault dynamic credentials
  brokered_credential_source_ids = [boundary_credential_library_vault.k8s_token.id]
}
```

## Step 4: Dynamic Kubernetes Credentials via Vault

```hcl
# vault-k8s-credentials.hcl
# Configure Vault to issue short-lived Kubernetes ServiceAccount tokens

# Vault Kubernetes secrets engine
resource "vault_kubernetes_secret_backend" "k8s" {
  path                = "kubernetes"
  kubernetes_host     = var.kubernetes_host
  kubernetes_ca_cert  = file("k8s-ca.crt")
  service_account_jwt = var.vault_service_account_jwt
}

resource "vault_kubernetes_secret_backend_role" "developer" {
  backend                       = vault_kubernetes_secret_backend.k8s.path
  name                          = "k8s-developer"
  allowed_kubernetes_namespaces = ["development", "staging"]
  kubernetes_role_name          = "developer"    # Binds generated ServiceAccounts to an existing ClusterRole
  kubernetes_role_type          = "ClusterRole"
  token_default_ttl             = 3600
  token_max_ttl                 = 14400
}
```

```hcl
# Boundary credential store and library using Vault
resource "boundary_credential_store_vault" "main" {
  name     = "Kubernetes Vault Store"
  scope_id = boundary_scope.kubernetes.id
  address  = var.vault_addr
  token    = var.boundary_vault_token   # Use a periodic, renewable, orphan token
}

resource "boundary_credential_library_vault" "k8s_token" {
  name                = "K8s Developer Token"
  credential_store_id = boundary_credential_store_vault.main.id
  path                = "kubernetes/creds/k8s-developer"
  http_method         = "POST"
  http_request_body   = jsonencode({
    kubernetes_namespace = "development"
  })
  credential_type     = "json"
}
```

## Step 5: Connect to Kubernetes via Boundary

```bash
# Authenticate with corporate SSO
boundary authenticate oidc \
  -auth-method-id=amoidc_xxxxxxxx \
  -addr=https://boundary.example.com

# List available Kubernetes targets
boundary targets list -scope-id=p_xxxxxxxxx

# Connect to production Kubernetes API
# Boundary invokes kubectl through the authenticated proxy
boundary connect kube \
  -target-id=ttcp_xxxxxxxxx \
  -- get nodes
```

## Step 6: Audit Access

```bash
# View Boundary sessions
boundary sessions list -scope-id=p_xxxxxxxxx

# View specific session details
boundary sessions read -id=s_xxxxxxxxx

# Export for compliance
boundary sessions list -scope-id=p_xxxxxxxxx -include-terminated -format=json \
  | jq '.items[] | {user: .user_id, target: .target_id, start: .created_time, end: ([.states[]? | select(.status == "terminated") | .start_time] | .[0]), status: .status}'
```

## Conclusion

Integrating Rancher with HashiCorp Boundary replaces traditional VPN access with a zero-trust, identity-driven model. Boundary provides dynamic, short-lived credentials via Vault integration, full session auditing, and fine-grained access control by team and target cluster. The combination of Rancher for Kubernetes management and Boundary for access management creates a strong security posture for enterprise environments requiring detailed access control and audit trails.
