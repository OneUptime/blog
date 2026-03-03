# How to Set Up OIDC Authentication on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, OIDC, Authentication, Kubernetes, Security, Identity

Description: Step-by-step guide to configuring OpenID Connect authentication on Talos Linux clusters for secure, centralized identity management with external providers.

---

Managing Kubernetes authentication with static credentials or client certificates gets messy fast. As your team grows, you need a better way to manage who can access the cluster. OpenID Connect (OIDC) lets you integrate your Kubernetes cluster with an external identity provider, so users authenticate through a familiar login flow and get temporary credentials. This guide shows you how to set up OIDC authentication on a Talos Linux cluster.

## What is OIDC Authentication?

OIDC is an identity layer built on top of OAuth 2.0. When configured with Kubernetes, it works like this:

1. A user authenticates with an identity provider (Google, Okta, Keycloak, etc.)
2. The identity provider issues an ID token (a JWT)
3. The user includes this token in their kubectl requests
4. The Kubernetes API server validates the token against the identity provider
5. If valid, the user is authenticated and their groups/claims are extracted for RBAC

The API server never stores user credentials. It just validates tokens. This is clean, secure, and scalable.

## Prerequisites

Before starting, you need:

- A running Talos Linux cluster
- An OIDC-compatible identity provider (this guide uses Keycloak as an example, but the concepts apply to any provider)
- DNS and TLS configured for your identity provider
- `talosctl` and `kubectl` access to the cluster

## Step 1: Configure Your Identity Provider

First, set up a client application in your identity provider. In Keycloak:

1. Create a new realm (or use an existing one)
2. Create a new client for Kubernetes
3. Configure the client:

```
Client ID: kubernetes
Client Protocol: openid-connect
Access Type: confidential
Valid Redirect URIs: http://localhost:8000/*
```

4. Create a client scope that includes group membership:

```
Scope Name: groups
Protocol: openid-connect
Mapper Type: Group Membership
Token Claim Name: groups
```

Make note of the following values from your identity provider:

- Issuer URL (e.g., `https://keycloak.example.com/realms/my-realm`)
- Client ID (e.g., `kubernetes`)
- Client Secret

## Step 2: Configure the Kubernetes API Server

In Talos Linux, you configure the API server through the machine configuration. Create a patch to add the OIDC configuration:

```yaml
# oidc-patch.yaml
cluster:
  apiServer:
    extraArgs:
      oidc-issuer-url: "https://keycloak.example.com/realms/my-realm"
      oidc-client-id: "kubernetes"
      oidc-username-claim: "preferred_username"
      oidc-username-prefix: "oidc:"
      oidc-groups-claim: "groups"
      oidc-groups-prefix: "oidc:"
```

Apply this patch to all control plane nodes:

```bash
# Apply the OIDC configuration to each control plane node
talosctl patch machineconfig \
    --patch @oidc-patch.yaml \
    -n 10.0.0.1

talosctl patch machineconfig \
    --patch @oidc-patch.yaml \
    -n 10.0.0.2

talosctl patch machineconfig \
    --patch @oidc-patch.yaml \
    -n 10.0.0.3
```

The API server will restart automatically to apply the new configuration.

## Step 3: Verify API Server Configuration

After the API server restarts, verify the OIDC configuration is active:

```bash
# Check that the API server is running with OIDC flags
talosctl logs kube-apiserver -n 10.0.0.1 | grep -i oidc

# Verify the API server is healthy
kubectl get --raw /healthz
```

## Step 4: Set Up kubectl for OIDC

Users need to configure their kubectl to use OIDC tokens. The easiest way is to use the `kubelogin` plugin, which handles the OIDC flow automatically.

Install kubelogin:

```bash
# Install kubelogin (oidc-login)
kubectl krew install oidc-login
```

Configure a kubeconfig that uses OIDC:

```yaml
# kubeconfig-oidc.yaml
apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://10.0.0.1:6443
    certificate-authority-data: <base64-encoded-ca-cert>
  name: my-cluster
contexts:
- context:
    cluster: my-cluster
    user: oidc-user
  name: my-cluster-oidc
current-context: my-cluster-oidc
users:
- name: oidc-user
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: kubectl
      args:
      - oidc-login
      - get-token
      - --oidc-issuer-url=https://keycloak.example.com/realms/my-realm
      - --oidc-client-id=kubernetes
      - --oidc-client-secret=<client-secret>
      - --oidc-extra-scope=groups
      - --oidc-extra-scope=email
```

When a user runs `kubectl get pods` with this config, kubelogin will open a browser for authentication if no valid token exists.

## Step 5: Create RBAC Rules for OIDC Users

OIDC authentication tells Kubernetes who the user is. RBAC tells Kubernetes what they can do. Create ClusterRoleBindings based on OIDC groups:

```yaml
# cluster-admin for the ops team
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: oidc-ops-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: Group
  name: "oidc:/ops-team"
  apiGroup: rbac.authorization.k8s.io
---
# Read-only for developers
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: oidc-developers-view
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: view
subjects:
- kind: Group
  name: "oidc:/developers"
  apiGroup: rbac.authorization.k8s.io
```

Note the `oidc:` prefix on group names. This matches the `oidc-groups-prefix` we configured on the API server.

```bash
# Apply the RBAC rules
kubectl apply -f rbac-oidc.yaml
```

## Step 6: Test the Authentication Flow

Have a user test the login flow:

```bash
# Set the OIDC kubeconfig
export KUBECONFIG=kubeconfig-oidc.yaml

# This will trigger the OIDC login flow
kubectl get pods

# The browser should open for authentication
# After successful login, the command should return pod list
```

Check the token contents to verify claims:

```bash
# Get the token and decode it
kubectl oidc-login get-token \
    --oidc-issuer-url=https://keycloak.example.com/realms/my-realm \
    --oidc-client-id=kubernetes \
    --oidc-client-secret=<secret> | jq -R 'split(".") | .[1] | @base64d | fromjson'
```

## Step 7: Configure Token Lifetime and Refresh

OIDC tokens expire. Configure appropriate lifetimes in your identity provider. A common setup:

- Access token lifetime: 15 minutes
- Refresh token lifetime: 8 hours (one workday)

The kubelogin plugin handles token refresh automatically. When the access token expires, it uses the refresh token to get a new one without requiring the user to log in again.

## Handling Multiple Identity Providers

If you need to support users from different identity providers, you have two options:

1. **Use a federation broker** like Keycloak that aggregates multiple providers behind a single OIDC endpoint
2. **Use Dex** as an OIDC intermediary that supports multiple upstream providers

The single-issuer approach (option 1) is simpler for the Kubernetes configuration since you only need one set of OIDC flags on the API server.

## Troubleshooting OIDC Issues

Common problems and how to fix them:

**Token validation fails:**

```bash
# Check API server logs for OIDC errors
talosctl logs kube-apiserver -n 10.0.0.1 | grep -i "oidc\|token\|auth"

# Common causes:
# - Wrong issuer URL
# - Clock skew between API server and IdP
# - CA certificate not trusted
```

**Groups not appearing in token:**

```bash
# Verify the token includes groups claim
# Decode the JWT and check for the groups field
# If missing, check your IdP client scope configuration
```

**Cannot reach identity provider:**

```bash
# Check DNS resolution from the cluster
kubectl run dns-test --image=busybox --restart=Never -- nslookup keycloak.example.com
kubectl logs dns-test

# Check that the IdP is accessible from control plane nodes
talosctl ping keycloak.example.com -n 10.0.0.1
```

## Security Considerations

When setting up OIDC, keep these security practices in mind:

- Always use HTTPS for the identity provider URL
- Use short-lived tokens (15 minutes or less)
- Apply the principle of least privilege in RBAC
- Use the username and group prefixes to avoid naming collisions
- Regularly audit RBAC bindings
- Enable audit logging on the API server

```yaml
# Add audit logging for authentication events
cluster:
  apiServer:
    extraArgs:
      audit-log-path: "/var/log/audit.log"
      audit-log-maxage: "30"
      audit-log-maxbackup: "10"
```

## Conclusion

OIDC authentication on Talos Linux gives you centralized identity management without storing credentials in the cluster. The setup involves configuring the API server flags through the Talos machine configuration, setting up your identity provider with the right scopes and claims, and creating RBAC rules that map OIDC groups to Kubernetes permissions. Once configured, users get a familiar login experience and you get a clean audit trail of who accessed what. The initial setup takes some effort, but the result is a much more secure and manageable authentication system.
