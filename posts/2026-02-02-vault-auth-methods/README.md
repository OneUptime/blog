# How to Configure Vault Authentication Methods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vault, HashiCorp, Authentication, Security, DevOps, Secrets Management, Kubernetes

Description: A comprehensive guide to configuring HashiCorp Vault authentication methods, covering token, userpass, AppRole, Kubernetes, LDAP, and OIDC authentication with practical examples and best practices.

---

HashiCorp Vault provides multiple authentication methods to verify the identity of users and applications before granting access to secrets. Choosing the right authentication method depends on your use case, whether you're authenticating humans, machines, or both.

## Understanding Vault Authentication

Authentication in Vault works through auth methods that verify identity and return a Vault token. Every request to Vault must include a valid token for authorization.

```mermaid
flowchart LR
    subgraph Clients
        A[Human User]
        B[Application]
        C[Kubernetes Pod]
    end

    subgraph AuthMethods["Auth Methods"]
        D[Userpass/LDAP/OIDC]
        E[AppRole]
        F[Kubernetes Auth]
    end

    subgraph Vault
        G[Token Generation]
        H[Policy Attachment]
        I[Secret Access]
    end

    A --> D
    B --> E
    C --> F
    D --> G
    E --> G
    F --> G
    G --> H
    H --> I
```

### Core Concepts

Every auth method in Vault follows the same pattern:
1. Client provides credentials specific to the auth method
2. Vault verifies the credentials against the configured backend
3. Vault returns a token with attached policies
4. Client uses the token for subsequent requests

## Token Authentication

Token auth is the foundational method in Vault. All other auth methods ultimately generate tokens.

### Creating and Managing Tokens

The following command creates a new token with an attached policy and a 24-hour TTL:

```bash
# Create a token with a specific policy
vault token create -policy="my-app-policy" -ttl="24h"

# Create a token with metadata for auditing
vault token create \
  -policy="my-app-policy" \
  -metadata="environment=production" \
  -metadata="team=platform"
```

### Creating Orphan Tokens

Orphan tokens are not children of the parent token, so they survive when the parent is revoked:

```bash
# Create an orphan token (not revoked when parent is revoked)
vault token create -orphan -policy="batch-job-policy" -ttl="1h"
```

### Token Lookup and Management

Inspect token details to understand its capabilities and remaining lifetime:

```bash
# Look up token details
vault token lookup <token>

# Renew a token before expiration
vault token renew <token>

# Revoke a token immediately
vault token revoke <token>
```

### Batch Tokens vs Service Tokens

Service tokens are the default, persisted to storage, and can be renewed. Batch tokens are lightweight and ideal for high-volume, short-lived operations:

```bash
# Create a batch token (lightweight, not persisted)
vault token create -type=batch -policy="read-only" -ttl="5m"
```

## Userpass Authentication

Userpass auth is the simplest method for human users, storing username/password combinations directly in Vault.

### Enabling Userpass Auth

Enable the userpass auth method at the default path:

```bash
# Enable userpass auth method
vault auth enable userpass
```

### Creating Users

Create users with specific policies attached. Each user can have multiple policies:

```bash
# Create a user with password and policies
vault write auth/userpass/users/alice \
  password="secure-password-here" \
  policies="dev-team,read-only" \
  token_ttl="8h" \
  token_max_ttl="24h"
```

### Configuring Password Policies

Set password requirements to enforce security standards:

```bash
# Configure password policy
vault write sys/policies/password/strong-password policy=-<<EOF
length=16
rule "charset" {
  charset = "abcdefghijklmnopqrstuvwxyz"
  min-chars = 2
}
rule "charset" {
  charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  min-chars = 2
}
rule "charset" {
  charset = "0123456789"
  min-chars = 2
}
rule "charset" {
  charset = "!@#$%^&*"
  min-chars = 1
}
EOF
```

### Authenticating with Userpass

Log in using username and password to receive a client token:

```bash
# Login with userpass
vault login -method=userpass username=alice password=secure-password-here
```

## AppRole Authentication

AppRole is designed for machine-to-machine authentication. Applications authenticate using a Role ID (like a username) and Secret ID (like a password).

```mermaid
flowchart TB
    subgraph Setup["Setup Phase"]
        A[Admin creates AppRole] --> B[Admin retrieves Role ID]
        A --> C[Admin configures Secret ID delivery]
    end

    subgraph Runtime["Runtime Phase"]
        D[App receives Role ID via config]
        E[App requests Secret ID via trusted channel]
        D --> F[App authenticates with both IDs]
        E --> F
        F --> G[Vault returns client token]
    end

    Setup --> Runtime
```

### Enabling AppRole

Enable the AppRole auth method for application authentication:

```bash
# Enable AppRole auth method
vault auth enable approle
```

### Creating an AppRole

Define an AppRole with specific token settings and policies:

```bash
# Create an AppRole for your application
vault write auth/approle/role/my-app \
  token_policies="my-app-policy" \
  token_ttl="1h" \
  token_max_ttl="4h" \
  secret_id_ttl="10m" \
  secret_id_num_uses="1"
```

### Retrieving Role ID and Secret ID

Get the Role ID, which remains static, and generate a Secret ID for each authentication attempt:

```bash
# Get the Role ID (static, can be embedded in config)
vault read auth/approle/role/my-app/role-id

# Generate a Secret ID (should be delivered securely)
vault write -f auth/approle/role/my-app/secret-id
```

### Authenticating with AppRole

Use both the Role ID and Secret ID to authenticate and receive a token:

```bash
# Authenticate with AppRole
vault write auth/approle/login \
  role_id="<role-id>" \
  secret_id="<secret-id>"
```

### AppRole Best Practices

Configure AppRoles with appropriate security constraints based on your use case:

```bash
# Create a restrictive AppRole with CIDR binding
vault write auth/approle/role/production-app \
  token_policies="production-secrets" \
  token_ttl="30m" \
  token_max_ttl="1h" \
  secret_id_ttl="5m" \
  secret_id_num_uses="1" \
  token_bound_cidrs="10.0.0.0/8" \
  secret_id_bound_cidrs="10.0.0.0/8"
```

### AppRole Authentication in Code

Here is an example of authenticating with AppRole using Python:

```python
#!/usr/bin/env python3
"""
AppRole authentication example for HashiCorp Vault.
Demonstrates secure secret retrieval using role_id and secret_id.
"""

import hvac
import os

def authenticate_with_approle():
    """
    Authenticate to Vault using AppRole and retrieve a secret.
    Role ID should be in config, Secret ID should be injected at runtime.
    """
    # Initialize the Vault client
    client = hvac.Client(url=os.environ.get('VAULT_ADDR', 'http://localhost:8200'))

    # Retrieve credentials from environment
    # Role ID is typically embedded in application config
    # Secret ID should be injected via secure mechanism (Kubernetes secret, etc.)
    role_id = os.environ['VAULT_ROLE_ID']
    secret_id = os.environ['VAULT_SECRET_ID']

    # Authenticate using AppRole
    response = client.auth.approle.login(
        role_id=role_id,
        secret_id=secret_id
    )

    # The client is now authenticated
    print(f"Successfully authenticated. Token accessor: {response['auth']['accessor']}")

    # Read a secret using the authenticated client
    secret = client.secrets.kv.v2.read_secret_version(
        path='my-app/config',
        mount_point='secret'
    )

    return secret['data']['data']

if __name__ == '__main__':
    config = authenticate_with_approle()
    print(f"Retrieved configuration: {config}")
```

## Kubernetes Authentication

Kubernetes auth allows pods to authenticate using their service account tokens. Vault validates the token against the Kubernetes API.

```mermaid
flowchart LR
    A[Pod with ServiceAccount] --> B[JWT Token]
    B --> C[Vault Kubernetes Auth]
    C --> D[Kubernetes TokenReview API]
    D --> E{Valid?}
    E -->|Yes| F[Return Vault Token]
    E -->|No| G[Reject]
```

### Enabling Kubernetes Auth

Enable the Kubernetes auth method in Vault:

```bash
# Enable Kubernetes auth
vault auth enable kubernetes
```

### Configuring Kubernetes Auth Backend

Configure Vault to communicate with the Kubernetes API for token validation:

```bash
# Configure Kubernetes auth with cluster details
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
  token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token
```

### Creating Kubernetes Roles

Create roles that map Kubernetes service accounts to Vault policies:

```bash
# Create a role that maps service accounts to policies
vault write auth/kubernetes/role/my-app \
  bound_service_account_names="my-app-sa" \
  bound_service_account_namespaces="production" \
  policies="my-app-policy" \
  token_ttl="1h" \
  token_max_ttl="4h"
```

### Multiple Service Accounts and Namespaces

Allow multiple service accounts across namespaces to use the same role:

```bash
# Allow multiple service accounts
vault write auth/kubernetes/role/shared-services \
  bound_service_account_names="app-a,app-b,app-c" \
  bound_service_account_namespaces="team-a,team-b" \
  policies="shared-secrets" \
  token_ttl="30m"
```

### Kubernetes Pod Configuration

Configure your Kubernetes deployment to use Vault authentication:

```yaml
# Kubernetes deployment with Vault sidecar injector annotations
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
      annotations:
        # Enable Vault Agent injection
        vault.hashicorp.com/agent-inject: "true"
        # Specify the Vault role to use
        vault.hashicorp.com/role: "my-app"
        # Inject secrets as files
        vault.hashicorp.com/agent-inject-secret-config: "secret/data/my-app/config"
        # Template the secret output
        vault.hashicorp.com/agent-inject-template-config: |
          {{- with secret "secret/data/my-app/config" -}}
          export DB_HOST="{{ .Data.data.db_host }}"
          export DB_PASSWORD="{{ .Data.data.db_password }}"
          {{- end }}
    spec:
      serviceAccountName: my-app-sa
      containers:
        - name: my-app
          image: my-app:latest
          command: ["/bin/sh", "-c", "source /vault/secrets/config && ./start.sh"]
```

### Service Account Setup

Create the Kubernetes service account that Vault will authenticate:

```yaml
# Service Account for Vault authentication
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app-sa
  namespace: production
---
# Optional: If you need additional RBAC permissions for your app
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: my-app-role
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: my-app-rolebinding
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: my-app-role
subjects:
  - kind: ServiceAccount
    name: my-app-sa
    namespace: production
```

## LDAP Authentication

LDAP auth integrates Vault with existing directory services like Active Directory or OpenLDAP.

### Enabling LDAP Auth

Enable the LDAP auth method:

```bash
# Enable LDAP auth
vault auth enable ldap
```

### Configuring LDAP Backend

Configure Vault to connect to your LDAP server:

```bash
# Configure LDAP authentication
vault write auth/ldap/config \
  url="ldaps://ldap.company.com:636" \
  userdn="ou=Users,dc=company,dc=com" \
  userattr="sAMAccountName" \
  groupdn="ou=Groups,dc=company,dc=com" \
  groupattr="cn" \
  groupfilter="(|(memberUid={{.Username}})(member={{.UserDN}}))" \
  binddn="cn=vault-bind,ou=Service Accounts,dc=company,dc=com" \
  bindpass="bind-password" \
  certificate=@/path/to/ldap-ca.crt \
  insecure_tls=false \
  starttls=true
```

### Mapping LDAP Groups to Policies

Map LDAP groups to Vault policies for role-based access control:

```bash
# Map LDAP groups to Vault policies
vault write auth/ldap/groups/devops policies="infrastructure,admin"
vault write auth/ldap/groups/developers policies="dev-secrets,read-only"
vault write auth/ldap/groups/dba policies="database-secrets"
```

### Mapping Individual Users

Assign additional policies to specific users:

```bash
# Map specific users to additional policies
vault write auth/ldap/users/alice policies="team-lead"
```

### Authenticating with LDAP

Users authenticate using their directory credentials:

```bash
# Login with LDAP credentials
vault login -method=ldap username=alice password=ldap-password
```

## OIDC Authentication

OIDC auth integrates with identity providers like Okta, Auth0, Azure AD, or Google Workspace for federated authentication.

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Vault
    participant IdP as Identity Provider

    User->>Browser: vault login -method=oidc
    Browser->>Vault: Initiate OIDC flow
    Vault->>Browser: Redirect to IdP
    Browser->>IdP: Authentication request
    IdP->>User: Login prompt
    User->>IdP: Credentials
    IdP->>Browser: Authorization code
    Browser->>Vault: Authorization code
    Vault->>IdP: Exchange code for tokens
    IdP->>Vault: ID token, access token
    Vault->>User: Vault token
```

### Enabling OIDC Auth

Enable the OIDC auth method:

```bash
# Enable OIDC auth
vault auth enable oidc
```

### Configuring OIDC with Okta

Configure Vault to use Okta as the identity provider:

```bash
# Configure OIDC with Okta
vault write auth/oidc/config \
  oidc_discovery_url="https://your-company.okta.com" \
  oidc_client_id="your-client-id" \
  oidc_client_secret="your-client-secret" \
  default_role="default"
```

### Creating OIDC Roles

Create roles that map OIDC claims to Vault policies:

```bash
# Create a role for OIDC authentication
vault write auth/oidc/role/default \
  bound_audiences="your-client-id" \
  allowed_redirect_uris="http://localhost:8250/oidc/callback" \
  allowed_redirect_uris="https://vault.company.com/ui/vault/auth/oidc/oidc/callback" \
  user_claim="email" \
  groups_claim="groups" \
  policies="default"
```

### Group-Based Policy Assignment

Map identity provider groups to Vault groups for policy inheritance:

```bash
# Create Vault group that maps to OIDC groups
vault write identity/group name="engineering" \
  policies="engineering-secrets" \
  type="external"

# Get the group ID
GROUP_ID=$(vault read -field=id identity/group/name/engineering)

# Create group alias that maps to OIDC group claim
ACCESSOR=$(vault auth list -format=json | jq -r '.["oidc/"].accessor')
vault write identity/group-alias \
  name="Engineering Team" \
  mount_accessor="$ACCESSOR" \
  canonical_id="$GROUP_ID"
```

### Authenticating with OIDC

Launch browser-based authentication:

```bash
# Login with OIDC (opens browser)
vault login -method=oidc role=default
```

## JWT Authentication

JWT auth is similar to OIDC but validates pre-existing JWT tokens without the browser flow. Ideal for CI/CD pipelines.

### Configuring JWT for GitHub Actions

Configure Vault to trust GitHub Actions OIDC tokens:

```bash
# Enable JWT auth
vault auth enable jwt

# Configure for GitHub Actions
vault write auth/jwt/config \
  bound_issuer="https://token.actions.githubusercontent.com" \
  oidc_discovery_url="https://token.actions.githubusercontent.com"

# Create role for specific repository
vault write auth/jwt/role/github-actions \
  role_type="jwt" \
  bound_audiences="https://github.com/your-org" \
  bound_claims_type="glob" \
  bound_claims='{"repository":"your-org/your-repo","ref":"refs/heads/main"}' \
  user_claim="actor" \
  policies="ci-deploy" \
  token_ttl="10m"
```

### GitHub Actions Workflow

Use the configured JWT auth in your GitHub Actions workflow:

```yaml
# GitHub Actions workflow using Vault JWT auth
name: Deploy
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Import Secrets from Vault
        uses: hashicorp/vault-action@v2
        with:
          url: https://vault.company.com
          method: jwt
          role: github-actions
          # Gets the GitHub Actions OIDC token automatically
          jwtGithubAudience: https://github.com/your-org
          secrets: |
            secret/data/deploy/config api_key | API_KEY ;
            secret/data/deploy/config db_password | DB_PASSWORD

      - name: Deploy Application
        run: ./deploy.sh
        env:
          API_KEY: ${{ env.API_KEY }}
          DB_PASSWORD: ${{ env.DB_PASSWORD }}
```

## AWS Authentication

AWS auth validates AWS IAM credentials, allowing EC2 instances and Lambda functions to authenticate.

### Enabling AWS Auth

Enable the AWS auth method:

```bash
# Enable AWS auth
vault auth enable aws
```

### Configuring AWS Auth Backend

Provide Vault with credentials to validate AWS identities:

```bash
# Configure AWS auth
vault write auth/aws/config/client \
  access_key="AKIAIOSFODNN7EXAMPLE" \
  secret_key="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

### Creating IAM Roles

Create roles that bind to specific IAM principals:

```bash
# Create role for IAM authentication
vault write auth/aws/role/lambda-role \
  auth_type="iam" \
  bound_iam_principal_arn="arn:aws:iam::123456789012:role/lambda-execution-role" \
  policies="lambda-secrets" \
  token_ttl="15m" \
  token_max_ttl="1h"
```

### EC2 Instance Authentication

Configure authentication for EC2 instances based on instance metadata:

```bash
# Create role for EC2 instances
vault write auth/aws/role/ec2-role \
  auth_type="ec2" \
  bound_ami_id="ami-0123456789abcdef0" \
  bound_vpc_id="vpc-12345678" \
  bound_subnet_id="subnet-12345678" \
  bound_iam_instance_profile_arn="arn:aws:iam::123456789012:instance-profile/my-profile" \
  policies="ec2-secrets" \
  token_ttl="1h"
```

### Authenticating from AWS

Authenticate from an EC2 instance or Lambda function:

```bash
# Login from EC2/Lambda (uses instance metadata)
vault login -method=aws role=lambda-role
```

## Auth Method Comparison

```mermaid
graph TB
    subgraph Human["Human Authentication"]
        A[Userpass] --> |Simple setup| A1[Internal users]
        B[LDAP] --> |Enterprise| B1[Directory integration]
        C[OIDC] --> |SSO| C1[Federated identity]
    end

    subgraph Machine["Machine Authentication"]
        D[AppRole] --> |Generic| D1[Any application]
        E[Kubernetes] --> |K8s native| E1[Pod identity]
        F[AWS] --> |Cloud native| F1[EC2/Lambda]
        G[JWT] --> |CI/CD| G1[GitHub Actions]
    end
```

| Method | Use Case | Credentials | Best For |
|--------|----------|-------------|----------|
| Token | Direct access | Token string | Admin, testing |
| Userpass | Human users | Username/password | Small teams |
| LDAP | Enterprise users | Directory credentials | AD/OpenLDAP shops |
| OIDC | SSO users | Browser-based | Modern IdP integration |
| AppRole | Applications | Role ID + Secret ID | Automated deployments |
| Kubernetes | K8s pods | Service account JWT | Container workloads |
| AWS | AWS resources | IAM credentials | EC2, Lambda |
| JWT | CI/CD pipelines | JWT token | GitHub Actions, GitLab CI |

## Security Best Practices

### Limit Token TTLs

Configure appropriate token lifetimes based on use case:

```bash
# Set default token TTL for an auth method
vault write auth/kubernetes/role/my-app \
  token_ttl="30m" \
  token_max_ttl="2h"
```

### Enable Token Bound CIDRs

Restrict token usage to specific IP ranges:

```bash
# Restrict token usage to specific CIDR blocks
vault write auth/approle/role/production-app \
  token_bound_cidrs="10.0.0.0/8,172.16.0.0/12"
```

### Use Response Wrapping

Wrap sensitive responses to prevent interception:

```bash
# Wrap secret ID for secure delivery (expires after 5 minutes)
vault write -wrap-ttl="5m" -f auth/approle/role/my-app/secret-id

# Unwrap on the receiving end
vault unwrap <wrapping-token>
```

### Audit Auth Method Usage

Enable audit logging to track all authentication attempts:

```bash
# Enable audit logging
vault audit enable file file_path=/var/log/vault/audit.log

# View auth method list with details
vault auth list -detailed
```

### Regular Credential Rotation

Rotate AppRole credentials periodically:

```bash
# Rotate Secret ID for AppRole
vault write -f auth/approle/role/my-app/secret-id
vault write auth/approle/role/my-app/secret-id-num-uses num_uses=1
```

## Troubleshooting

### Common Issues

**Authentication fails with "permission denied"**

Check that the auth method is enabled and the role exists:

```bash
# Verify auth method is enabled
vault auth list

# Check role configuration
vault read auth/kubernetes/role/my-app
```

**Token expires too quickly**

Review and adjust TTL settings:

```bash
# Check token details
vault token lookup

# Update role with longer TTL
vault write auth/kubernetes/role/my-app token_ttl="2h"
```

**LDAP authentication fails**

Test LDAP connectivity and binding:

```bash
# Test LDAP connection (requires ldapsearch)
ldapsearch -H ldaps://ldap.company.com:636 \
  -D "cn=vault-bind,ou=Service Accounts,dc=company,dc=com" \
  -W \
  -b "ou=Users,dc=company,dc=com" \
  "(sAMAccountName=testuser)"
```

**Kubernetes auth returns "service account not allowed"**

Verify the service account name and namespace match the role configuration:

```bash
# Check pod service account
kubectl get pod my-pod -o jsonpath='{.spec.serviceAccountName}'

# Verify role configuration
vault read auth/kubernetes/role/my-app
```

---

Properly configured authentication is the foundation of Vault security. Choose the right method for each use case, follow the principle of least privilege when assigning policies, and regularly audit authentication logs to detect anomalies. Start with the simplest method that meets your requirements, then evolve as your security needs grow.
