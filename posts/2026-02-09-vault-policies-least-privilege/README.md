# How to configure Vault policies for least-privilege secret access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HashiCorp Vault, Security Policies, Least Privilege, Access Control, Kubernetes

Description: Master Vault policy creation to implement least-privilege access control, ensuring applications and users only access the secrets they absolutely need.

---

Granting excessive permissions to secrets creates security risks. Vault policies enforce least-privilege access by precisely controlling who can access which secrets and what operations they can perform. This guide shows you how to design and implement granular Vault policies for secure secret access in Kubernetes environments.

## Understanding Vault Policies

Vault policies define capabilities (permissions) for specific paths. Every request to Vault is evaluated against attached policies to determine if it's allowed. The default-deny model means anything not explicitly allowed is denied, ensuring secure-by-default behavior.

Policies are written in HCL (HashiCorp Configuration Language) and specify path patterns with associated capabilities like create, read, update, delete, and list.

## Creating Basic Policies

Start with simple, focused policies:

```bash
# Read-only policy for application secrets
vault policy write app-read-only - <<EOF
# Read secrets for specific app
path "secret/data/myapp/*" {
  capabilities = ["read"]
}
EOF

# Read-write policy for specific service
vault policy write service-admin - <<EOF
# Full access to service secrets
path "secret/data/myservice/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Cannot access other services
EOF

# Database credential generation only
vault policy write db-creds-only - <<EOF
# Can generate database credentials
path "database/creds/readonly" {
  capabilities = ["read"]
}

# Cannot modify database configuration
EOF
```

## Implementing Path-Based Restrictions

Use precise path matching for granular control:

```bash
vault policy write fine-grained - <<EOF
# Exact path match - only this specific secret
path "secret/data/app/prod/api-key" {
  capabilities = ["read"]
}

# Wildcard match - all secrets under this path
path "secret/data/app/prod/*" {
  capabilities = ["read", "list"]
}

# Recursive wildcard - deep path matching
path "secret/data/team-a/+/config" {
  capabilities = ["read"]
}
# Matches: secret/data/team-a/prod/config
#          secret/data/team-a/dev/config
#          secret/data/team-a/staging/config

# Glob pattern matching
path "secret/data/app-*/database" {
  capabilities = ["read"]
}
# Matches: secret/data/app-1/database
#          secret/data/app-frontend/database
EOF
```

## Using Template Policies

Create dynamic policies based on identity:

```bash
vault policy write user-specific - <<EOF
# Each user can only access their own secrets
path "secret/data/users/{{identity.entity.name}}/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Service accounts can access team secrets
path "secret/data/{{identity.entity.metadata.team}}/*" {
  capabilities = ["read", "list"]
}
EOF
```

## Implementing Least-Privilege for Applications

Create minimal policies for apps:

```bash
# Policy for web frontend
vault policy write frontend-app - <<EOF
# Only needs API keys, not database creds
path "secret/data/frontend/api-keys" {
  capabilities = ["read"]
}

# Can read CDN configuration
path "secret/data/shared/cdn-config" {
  capabilities = ["read"]
}

# Explicitly denied from other paths
# (default deny, but explicit for clarity)
EOF

# Policy for backend API
vault policy write backend-api - <<EOF
# Database credentials
path "database/creds/api-role" {
  capabilities = ["read"]
}

# Application secrets
path "secret/data/backend/config" {
  capabilities = ["read"]
}

# Can encrypt/decrypt with Transit
path "transit/encrypt/api-data" {
  capabilities = ["update"]
}

path "transit/decrypt/api-data" {
  capabilities = ["update"]
}
EOF

# Policy for worker jobs
vault policy write worker-job - <<EOF
# Read-only access to job configuration
path "secret/data/jobs/config" {
  capabilities = ["read"]
}

# Can generate short-lived database creds
path "database/creds/worker-role" {
  capabilities = ["read"]
}

# No access to production secrets
EOF
```

## Environment-Based Segregation

Separate access by environment:

```bash
vault policy write prod-access - <<EOF
# Production secrets only
path "secret/data/prod/*" {
  capabilities = ["read"]
}

# Cannot access dev or staging
path "secret/data/dev/*" {
  capabilities = ["deny"]
}

path "secret/data/staging/*" {
  capabilities = ["deny"]
}
EOF

vault policy write dev-access - <<EOF
# Dev secrets with write access
path "secret/data/dev/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Read-only staging for testing
path "secret/data/staging/*" {
  capabilities = ["read"]
}

# No production access
path "secret/data/prod/*" {
  capabilities = ["deny"]
}
EOF
```

## Using Required Parameters

Enforce specific parameters in requests:

```bash
vault policy write restricted-transit - <<EOF
# Can only encrypt with specific context
path "transit/encrypt/sensitive-data" {
  capabilities = ["update"]
  required_parameters = ["context"]
}

# Must provide TTL for dynamic secrets
path "database/creds/limited" {
  capabilities = ["read"]
  required_parameters = ["ttl"]
}
EOF
```

## Implementing Time-Based Access

Restrict access by time:

```bash
vault policy write business-hours - <<EOF
# Only accessible during business hours
path "secret/data/business/*" {
  capabilities = ["read"]

  # Access only 9 AM to 5 PM UTC
  allowed_parameters = {
    "*" = []
  }

  # Note: Time-based access control requires Sentinel (Enterprise)
}
EOF
```

## Creating Admin Policies

Define administrative access levels:

```bash
# Vault administrator
vault policy write vault-admin - <<EOF
# Manage auth methods
path "auth/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# Manage policies
path "sys/policies/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# View audit logs
path "sys/audit" {
  capabilities = ["read", "list"]
}

# Cannot access secret data
path "secret/*" {
  capabilities = ["deny"]
}
EOF

# Secret administrator
vault policy write secret-admin - <<EOF
# Full secret management
path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Manage secret engines
path "sys/mounts/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Cannot change auth or policies
path "auth/*" {
  capabilities = ["deny"]
}

path "sys/policies/*" {
  capabilities = ["deny"]
}
EOF
```

## Testing Policies

Verify policy behavior:

```bash
# Test policy as if you're that user
vault policy read app-read-only

# Check if path would be allowed
vault token capabilities secret/data/myapp/config

# Output: read

# Test with specific token
vault token capabilities <token> secret/data/myapp/config

# Simulate policy evaluation
vault policy test app-read-only \
  "path=secret/data/myapp/config capability=read"
```

## Attaching Policies to Auth Methods

Associate policies with Kubernetes auth:

```bash
# Create role with minimal policy
vault write auth/kubernetes/role/frontend \
  bound_service_account_names=frontend-sa \
  bound_service_account_namespaces=production \
  policies=frontend-app \
  ttl=1h

# Multiple policies for combined access
vault write auth/kubernetes/role/backend \
  bound_service_account_names=backend-sa \
  bound_service_account_namespaces=production \
  policies="backend-api,transit-encrypt,db-access" \
  ttl=1h
```

## Auditing Policy Usage

Monitor policy effectiveness:

```bash
# Enable audit logging
vault audit enable file file_path=/vault/logs/audit.log

# Find denied requests
cat /vault/logs/audit.log | \
  jq 'select(.type == "response" and .error != "") |
      {time: .time, user: .auth.display_name, path: .request.path, error: .error}'

# Most common denied paths
cat /vault/logs/audit.log | \
  jq -r 'select(.error != "") | .request.path' | \
  sort | uniq -c | sort -rn | head -20
```

## Policy Review Checklist

When creating policies, ask:
- Does this grant more access than necessary?
- Can paths be more specific?
- Are wildcards truly needed or can exact paths be used?
- Should list capability be granted separately?
- Are there any unintentional path overlaps?
- Can multiple granular policies replace one broad policy?
- Are deny rules needed for clarity?
- Is the policy documented with comments?

## Common Policy Patterns

Implement these proven patterns:

```bash
# Pattern 1: App-specific isolation
vault policy write app-${APP_NAME} - <<EOF
path "secret/data/${APP_NAME}/*" {
  capabilities = ["read"]
}
EOF

# Pattern 2: Role-based access
vault policy write role-developer - <<EOF
path "secret/data/dev/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
path "secret/data/staging/*" {
  capabilities = ["read"]
}
EOF

# Pattern 3: Service mesh identity
vault policy write service-${SERVICE} - <<EOF
path "pki/issue/${SERVICE}" {
  capabilities = ["update"]
}
path "secret/data/services/${SERVICE}/*" {
  capabilities = ["read"]
}
EOF
```

## Policy Maintenance

Maintain policies over time:

```bash
# List all policies
vault policy list

# Review policy content
vault policy read app-read-only

# Update policy
vault policy write app-read-only - <<EOF
# Updated policy content
EOF

# Delete unused policies
vault policy delete old-policy

# Export policies for version control
vault policy list | while read policy; do
  vault policy read "$policy" > "policies/${policy}.hcl"
done
```

Vault policies are the foundation of secure secret access. By implementing least-privilege principles through granular policies, you minimize the impact of compromised credentials and ensure applications only access the secrets they need. Regular policy audits and refinements keep your security posture strong as your infrastructure evolves.
