# How to Deploy Keycloak on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Keycloak, Identity Management, SSO, OAuth2, OIDC

Description: Deploy Keycloak on Rancher for centralized identity and access management with SSO, OAuth2/OIDC support, and integration with Rancher authentication.

## Introduction

Keycloak is an open-source Identity and Access Management (IAM) system providing SSO, OAuth2, OIDC, SAML, and LDAP integration. Deploying Keycloak on Rancher and integrating it with Rancher's authentication creates a centralized user management system for your entire Kubernetes platform.

## Step 1: Deploy Keycloak with Helm

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

```yaml
# keycloak-values.yaml

auth:
  adminUser: admin
  adminPassword: "securepassword"

postgresql:
  enabled: true
  auth:
    password: "postgrespassword"
    database: keycloak
  primary:
    persistence:
      enabled: true
      storageClass: longhorn
      size: 20Gi

ingress:
  enabled: true
  ingressClassName: nginx
  hostname: keycloak.example.com
  tls: true
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-buffer-size: "128k"   # Required for Keycloak headers

replicaCount: 2    # Two replicas for HA

resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "2"

extraEnvVars:
  - name: KC_PROXY_HEADERS
    value: "xforwarded"    # Behind reverse proxy (X-Forwarded-* headers)
  - name: KC_HOSTNAME_STRICT
    value: "false"
```

```bash
kubectl create namespace keycloak
helm install keycloak bitnami/keycloak \
  --namespace keycloak \
  --values keycloak-values.yaml
```

## Step 2: Configure a Realm and Client

1. Access Keycloak at `https://keycloak.example.com/admin`
2. Create a new Realm (e.g., `mycompany`)
3. Create an OIDC client:
   - Client ID: `rancher`
   - Client type: OpenID Connect
   - Root URL: `https://rancher.example.com`
   - Redirect URIs: `https://rancher.example.com/*`

## Step 3: Integrate Keycloak with Rancher

In Rancher UI:

1. Go to **Global Settings > Authentication**
2. Select **OIDC (OpenID Connect)**
3. Configure:

```yaml
Client ID: rancher
Client Secret: <from Keycloak client>
Issuer URL: https://keycloak.example.com/realms/mycompany
```

## Step 4: Create Groups for Rancher RBAC

```bash
# Create groups in Keycloak via API
curl -X POST \
  https://keycloak.example.com/admin/realms/mycompany/groups \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "cluster-admins"}'
```

Map Keycloak groups to Rancher cluster roles:
- `cluster-admins` → `cluster-owner`
- `developers` → `view`
- `ops-team` → `cluster-member`

## Step 5: Configure Social Login

```bash
# Add GitHub as an identity provider in Keycloak
# Identity Providers > Add provider > GitHub
# Client ID and Secret from GitHub OAuth App settings
```

## Conclusion

Keycloak on Rancher provides enterprise-grade identity management with SSO across all your applications. The OIDC integration with Rancher enables centralized user provisioning, group-based RBAC, and MFA enforcement-eliminating the need to manage user accounts separately in Rancher and every downstream application.
