# How to Secure Rancher API Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Security

Description: Learn how to secure the Rancher API with authentication, authorization, rate limiting, and access controls to prevent unauthorized access.

The Rancher API provides programmatic access to your entire Kubernetes infrastructure. A compromised API key can give an attacker control over all your clusters. Securing API access is critical for protecting your Rancher deployment. This guide covers hardening Rancher API access with multiple layers of protection.

## Prerequisites

- Rancher v2.13 or later
- Admin access to Rancher
- kubectl access with cluster admin privileges
- Understanding of Rancher RBAC model

## Step 1: Use Least-Privilege API Keys and Tokens Instead of Admin Tokens

Never use the admin token for automation. Create API keys or tokens with minimum required permissions.

### Create a Scoped API Key via UI

1. Log in to Rancher as the appropriate user (not admin).
2. Click the user icon > **Account & API Keys**.
3. Click **Create API Key**.
4. Set a **Description** for the key.
5. Set an **Expiration** (e.g., 30 days).
6. Under **Scope**, select the specific cluster if you only need Kubernetes API access to that cluster.
7. Click **Create**.

### Create a Rancher API Token via Kubernetes API

```bash
kubectl create -o jsonpath='{.status.value}' -f - <<'EOF'
apiVersion: ext.cattle.io/v1
kind: Token
spec:
  description: CI/CD pipeline token
  ttl: 2592000000 # 30 days in milliseconds
EOF
```

## Step 2: Set Token Expiration Policies

Configure maximum token lifetime to prevent long-lived credentials:

```bash
kubectl edit setting auth-token-max-ttl-minutes
```

Set `value` to `43200` to enforce a maximum token lifetime of 30 days.

Through the Rancher UI:

1. Go to **Global Settings**.
2. Find **auth-token-max-ttl-minutes**.
3. Set to your desired maximum (e.g., `43200` for 30 days).

## Step 3: Restrict API Access by IP

Use network-level controls to limit which IP addresses can reach the Rancher API.

### Using an Ingress Controller

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rancher
  namespace: cattle-system
  annotations:
    nginx.ingress.kubernetes.io/whitelist-source-range: "10.0.0.0/8,172.16.0.0/12,203.0.113.0/24"
spec:
  rules:
  - host: rancher.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rancher
            port:
              number: 80
```

### Using a Network Policy

Use this only if your ingress or load balancer preserves the original client source IP to the Rancher pods.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-rancher-api
  namespace: cattle-system
spec:
  podSelector:
    matchLabels:
      app: rancher
  policyTypes:
  - Ingress
  ingress:
  - from:
    - ipBlock:
        cidr: 10.0.0.0/8
    - ipBlock:
        cidr: 203.0.113.0/24
    ports:
    - protocol: TCP
      port: 80
```

## Step 4: Enable Rate Limiting

Protect the API from abuse and excessive token-management requests with rate limiting.

### Using NGINX Ingress Controller

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rancher
  namespace: cattle-system
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "10"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"
    nginx.ingress.kubernetes.io/limit-connections: "5"
spec:
  rules:
  - host: rancher.yourdomain.com
    http:
      paths:
      - path: /apis/ext.cattle.io/v1/tokens
        pathType: Prefix
        backend:
          service:
            name: rancher
            port:
              number: 80
```

This limits token-management requests to 10 requests per second per client.

## Step 5: Configure External Authentication

Use an external identity provider for stronger security:

### LDAP/Active Directory

1. Go to **Users & Authentication** > **Auth Provider**.
2. Select **Active Directory**.
3. Configure the LDAP connection:

```plaintext
Server: ldap.yourdomain.com
Port: 636
TLS: true
Service Account DN: cn=rancher,ou=service,dc=yourdomain,dc=com
Search Base: dc=yourdomain,dc=com
```

4. Test and enable.

### SAML/OIDC Providers

1. Go to **Users & Authentication** > **Auth Provider**.
2. Select the provider that matches your identity provider (for example, Okta, Azure AD, Keycloak SAML, or Generic OIDC).
3. Configure the connection details required by that provider.
4. Map users or groups to the minimum required Rancher roles.

### After enabling external auth, keep break-glass local users:

Keep a few local authentication users for emergency access if your external identity provider is unavailable.

## Step 6: Use Dedicated Automation Users

For automation and CI/CD, use a dedicated Rancher user:

```bash
# Create a dedicated local Rancher user for CI/CD
kubectl create -f - <<'EOF'
apiVersion: management.cattle.io/v3
kind: User
metadata:
  name: cicd-deployer
displayName: "CI/CD Deployer"
username: "cicd-deployer"
EOF

kubectl create -f - <<'EOF'
apiVersion: v1
kind: Secret
metadata:
  name: cicd-deployer
  namespace: cattle-local-user-passwords
type: Opaque
stringData:
  password: ChangeMeToALongRandomPassword123!
EOF
```

Assign minimal permissions:

```bash
# Grant project-member access to a specific project
kubectl create -f - <<'EOF'
apiVersion: management.cattle.io/v3
kind: ProjectRoleTemplateBinding
metadata:
  generateName: prtb-
  namespace: c-m-abcde-p-vwxyz
projectName: c-m-abcde:p-vwxyz
roleTemplateName: project-member
userName: cicd-deployer
EOF
```

## Step 7: Audit API Access

Enable and monitor API access logs. If audit logging is enabled with `--set auditLog.level=1`, you can specifically monitor:

```bash
# Check recent API token usage
kubectl logs -n cattle-system -l app=rancher -c rancher-audit-log | \
  jq 'select(.requestURI | startswith("/v3") or startswith("/apis/ext.cattle.io/") or startswith("/apis/management.cattle.io/"))' | head -20
```

Monitor for suspicious patterns:

- Multiple failed authentication attempts from the same IP
- API access from unexpected geographic locations
- High-volume API calls from a single token
- Access to sensitive endpoints (tokens, secrets, cluster registrations)

## Step 8: Secure the Kubernetes API Endpoint

In addition to the Rancher API, secure the underlying Kubernetes API:

### Disable Anonymous Authentication

```yaml
# RKE2 config
kube-apiserver-arg:
  - "anonymous-auth=false"
```

### Enable OIDC Authentication

```yaml
kube-apiserver-arg:
  - "oidc-issuer-url=https://auth.yourdomain.com"
  - "oidc-client-id=kubernetes"
  - "oidc-username-claim=email"
  - "oidc-groups-claim=groups"
```

### Restrict API Server Network Access

On cloud providers, review security group or firewall rules so only trusted networks can reach the API server:

```bash
# AWS - allow a private CIDR after removing any broader rules
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 6443 \
  --cidr 10.0.0.0/8
```

## Step 9: Rotate API Tokens Regularly

Implement a token rotation process:

```bash
#!/bin/bash
# Script to rotate Rancher API tokens

CUTOFF=$(date -u -d '60 days ago' +%s)

TOKENS=$(kubectl get tokens.ext.cattle.io -o json | \
  jq -r --argjson cutoff "$CUTOFF" \
  '.items[] | select((.metadata.creationTimestamp | fromdateiso8601) < $cutoff) | .metadata.name')

for TOKEN_ID in $TOKENS; do
  echo "Revoking old token: $TOKEN_ID"
  kubectl delete tokens.ext.cattle.io "$TOKEN_ID"
done
```

Schedule this as a periodic job.

## Step 10: Restrict Default Admin Access

After setting up external authentication and creating appropriate admin accounts, restrict the default admin:

1. Change the default admin password to a long, random string.
2. Store it in a secure vault for emergency access only.
3. Use named admin users for day-to-day administration, and reserve the default `admin` account for emergency access only.

## Security Checklist

- [ ] Use scoped API keys, not admin tokens
- [ ] Set token expiration policies
- [ ] Restrict API access by IP
- [ ] Enable rate limiting
- [ ] Configure external authentication (LDAP/SAML/OIDC)
- [ ] Keep break-glass local users secured
- [ ] Audit all API access
- [ ] Rotate tokens regularly
- [ ] Disable anonymous Kubernetes API access
- [ ] Restrict default admin account

## Conclusion

Securing the Rancher API requires a defense-in-depth approach combining authentication, authorization, network controls, and monitoring. By using scoped tokens, external authentication, IP restrictions, and rate limiting, you significantly reduce the risk of unauthorized access to your Kubernetes infrastructure. Regular token rotation and audit logging provide ongoing protection and compliance visibility.
