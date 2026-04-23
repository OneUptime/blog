# Rancher with HashiCorp Boundary for Secure Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, HashiCorp Boundary, Kubernetes, Zero Trust, Access Management

Description: Learn how to use HashiCorp Boundary with Rancher-managed Kubernetes clusters to provide zero-trust, just-in-time access to cluster resources without exposing them directly.

## What is HashiCorp Boundary?

HashiCorp Boundary is an identity-based access management tool that provides:

- **Zero-trust access** - Users access resources through Boundary without network-level access to the target
- **Audit events** - Structured audit trails for session authorization and access activity
- **Just-in-time credentials** - Integration with Vault for dynamic credentials
- **Granular permissions** - Role-based access to specific hosts and ports

## Architecture

```bash
Developer workstation (Boundary CLI + kubectl)
        │
        ├── authenticates to Boundary Controller
        └── session traffic through Boundary Worker ──> Kubernetes API Server (Rancher-managed cluster)
```

The developer never has direct network access to the Kubernetes cluster. All traffic flows through Boundary.

## Prerequisites

- Rancher-managed Kubernetes cluster
- HashiCorp Boundary 0.14+
- Boundary controllers and workers deployed with PostgreSQL and at least one KMS key
- Boundary CLI and `kubectl` installed on developer workstations
- An existing Rancher kubeconfig, or Vault-backed brokered Kubernetes credentials
- Vault (optional, for dynamic credentials)

## Step 1: Deploy Boundary

HashiCorp does not publish an official Helm chart for Boundary. For self-managed deployments, follow the official Boundary deployment workflow to install the Boundary binary, configure controller and worker services, and initialize the cluster. If you run Boundary on Kubernetes, use the official `hashicorp/boundary` image with your own manifests and provide both PostgreSQL and at least one KMS key.

## Step 2: Configure Boundary Organization and Scope

```hcl
# boundary.tf

resource "boundary_scope" "org" {
  name                     = "my-org"
  description              = "Primary organization"
  scope_id                 = "global"
  auto_create_admin_role   = true
  auto_create_default_role = true
}

resource "boundary_scope" "project" {
  name                   = "kubernetes-access"
  description            = "Kubernetes cluster access"
  scope_id               = boundary_scope.org.id
  auto_create_admin_role = true
}
```

## Step 3: Define the Rancher Kubernetes Target

```hcl
resource "boundary_host_catalog_static" "k8s" {
  name        = "k8s-hosts"
  description = "Kubernetes cluster hosts"
  scope_id    = boundary_scope.project.id
}

resource "boundary_host_static" "rancher_k8s" {
  name            = "rancher-cluster"
  description     = "Rancher Kubernetes API"
  address         = "10.0.1.100"   # Kubernetes API server internal IP
  host_catalog_id = boundary_host_catalog_static.k8s.id
}

resource "boundary_host_set_static" "k8s_api" {
  name            = "k8s-api-set"
  host_catalog_id = boundary_host_catalog_static.k8s.id
  host_ids        = [boundary_host_static.rancher_k8s.id]
}

resource "boundary_target" "k8s_api" {
  name         = "rancher-k8s-api"
  description  = "Rancher-managed Kubernetes API server"
  type         = "tcp"
  scope_id     = boundary_scope.project.id
  default_port = 6443

  host_source_ids = [boundary_host_set_static.k8s_api.id]
}
```

## Step 4: Create Access Roles

```hcl
resource "boundary_role" "k8s_developer" {
  name          = "k8s-developer"
  description   = "Developer access to Kubernetes"
  scope_id      = boundary_scope.project.id
  principal_ids = ["<developer-group-or-user-id>"]

  grant_strings = [
    "ids=*;type=target;actions=list,no-op",
    "ids=${boundary_target.k8s_api.id};actions=authorize-session,read"
  ]
}
```

## Step 5: Authenticate and Connect

Developers authenticate and connect:

```bash
# Authenticate to Boundary
boundary authenticate oidc \
  -auth-method-id=amoidc_1234567890 \
  -addr=https://boundary.example.com

# List available targets
boundary targets list -scope-id <project-scope-id>

# Run a one-off kubectl command through Boundary.
# This requires Kubernetes credentials, such as an existing Rancher kubeconfig
# or brokered credentials from Vault attached to the target.
boundary connect kube \
  -target-id=ttcp_1234567890 \
  -- get pods --all-namespaces
```

## Step 6: kubectl via Boundary

If you want to keep a local proxy open for repeated `kubectl` commands, start a TCP session in one terminal:

```bash
boundary connect \
  -target-id=ttcp_1234567890 \
  -inactive-timeout=-1 \
  -listen-port=6443
```

Then point your kubeconfig at the local Boundary listener. Reuse the `users:` entry from your existing Rancher kubeconfig, or a brokered token from Vault:

```yaml
# kubeconfig
clusters:
- cluster:
    server: https://127.0.0.1:6443
    tls-server-name: <kubernetes-api-hostname>
    certificate-authority-data: <base64-ca>
  name: rancher-via-boundary

users:
- name: rancher-user
  user:
    token: <existing-rancher-token-or-brokered-token>

contexts:
- context:
    cluster: rancher-via-boundary
    user: rancher-user
  name: rancher-via-boundary

current-context: rancher-via-boundary
```

## Audit Logging

For Kubernetes API access, rely on Boundary audit events. Boundary session recording currently applies to SSH targets, not `boundary connect kube` traffic.

```hcl
# controller.hcl or worker.hcl
events {
  audit_enabled        = true
  observations_enabled = true
  sysevents_enabled    = true

  sink {
    name        = "audit-file"
    description = "Boundary audit events"
    event_types = ["audit"]
    format      = "cloudevents-json"

    file {
      path      = "/var/log/boundary"
      file_name = "audit.log"
    }
  }
}
```

## Best Practices

1. **Use OIDC authentication** tied to your identity provider (Okta, Azure AD)
2. **Enable audit event sinks** for production clusters; session recording currently applies to SSH targets, not Kubernetes API access
3. **Use Vault integration** for just-in-time kubeconfig credentials
4. **Apply least-privilege targets** - separate targets for read-only vs admin access
5. **Monitor boundary worker health** - workers are the access path; their failure blocks access

## Conclusion

HashiCorp Boundary combined with Rancher provides zero-trust access to Kubernetes clusters without exposing the API server to the internet. By routing `kubectl` traffic through Boundary, you get identity-based access control, auditable session authorization events, and optional just-in-time credential management through Vault.
