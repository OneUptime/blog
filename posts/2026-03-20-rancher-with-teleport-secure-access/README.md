# Rancher with Teleport for Secure Cluster Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Teleport, Kubernetes, Zero Trust, SSH Access

Description: Learn how to integrate Teleport with Rancher-managed Kubernetes clusters to provide secure, auditable, and certificate-based access to clusters and nodes.

## What is Teleport?

Teleport is an open-source identity-aware proxy for infrastructure access. It provides:

- **Certificate-based authentication** - Short-lived X.509 certificates replace long-lived static keys
- **Unified access plane** - SSH, Kubernetes, databases, and web apps through one proxy
- **Session recording and replay** - Full audit trail of all sessions
- **Role-based access control** - Fine-grained permissions per cluster or namespace

## Architecture

```text
Developer → Teleport Proxy → Teleport Kubernetes Service → Kubernetes API (Rancher-managed cluster)
Developer → Teleport Proxy → Teleport SSH Service → Cluster nodes
Teleport Auth issues certificates, evaluates RBAC, and stores audit metadata.
```

## Prerequisites

- Rancher-managed Kubernetes cluster
- Teleport 14+ installed (Community or Enterprise)
- `tsh` CLI installed on developer machines
- `kubectl` installed on developer machines
- Teleport Kubernetes Service access to the cluster API server
- Kubernetes RBAC bindings for the users or groups Teleport will impersonate
- Teleport SSH Service installed on cluster nodes if you also want node-level SSH access

## Step 1: Install Teleport on the Cluster

Deploy the Teleport Kubernetes agent using Helm:

```bash
helm repo add teleport https://charts.releases.teleport.dev
helm repo update

# Add --set enterprise=true when connecting to Teleport Enterprise or Teleport Cloud.
helm install teleport-agent teleport/teleport-kube-agent \
  --namespace teleport-agent \
  --create-namespace \
  --set roles=kube \
  --set labels.environment=production \
  --set proxyAddr=teleport.example.com:443 \
  --set authToken=your-join-token \
  --set kubeClusterName=rancher-production
```

## Step 2: Generate a Join Token

On the Teleport Auth server:

```bash
tctl tokens add --type=kube --ttl=1h
```

## Step 3: Configure Teleport Role for Kubernetes Access

Make sure the `developers` Kubernetes group is bound to the required permissions in the downstream cluster.

```yaml
# rancher-developer-role.yaml

kind: role
version: v7
metadata:
  name: rancher-developer
spec:
  allow:
    kubernetes_labels:
      environment: ["production", "staging"]
    kubernetes_groups: ["developers"]
    kubernetes_resources:
      - kind: pod
        namespace: "*"
        name: "*"
        verbs: ["get", "list", "watch", "exec"]
      - kind: deployment
        namespace: "production"
        name: "*"
        verbs: ["get", "list"]
  deny:
    kubernetes_resources:
      - kind: secret
        namespace: "kube-system"
        name: "*"
        verbs: ["*"]
```

```bash
tctl create -f rancher-developer-role.yaml
```

## Step 4: Assign Role to Users

```bash
# Assign role to a user
tctl users update alice --set-roles=rancher-developer

# Or use SSO role mapping (e.g., from Okta groups)
```

## Step 5: Connect to the Cluster

Developers log in and access the cluster:

```bash
# Log in to Teleport
tsh login --proxy=teleport.example.com

# List available Kubernetes clusters
tsh kube ls

# Connect to Rancher cluster
tsh kube login rancher-production

# Use kubectl through Teleport
kubectl get pods --all-namespaces

# Start an interactive kubectl session with recording
tsh kubectl exec -it my-pod -- /bin/bash
```

## Step 6: SSH Access to Rancher Nodes

For SSH access to underlying nodes:

This requires enrolling the nodes with Teleport's SSH Service separately; the Kubernetes agent only provides Kubernetes API access.

```bash
# List nodes
tsh ls

# SSH to a node
tsh ssh ubuntu@node-1.rancher-production

# All sessions are recorded
```

## Enable Session Recording

Session recording is enabled by default. Configure storage:

```yaml
# teleport.yaml
teleport:
  storage:
    audit_sessions_uri: "s3://my-teleport-sessions-bucket?region=us-east-1"

auth_service:
  session_recording: node-sync   # or: off, node, proxy, proxy-sync
```

## Reviewing Sessions in Rancher Context

```bash
# List recent sessions
tsh recordings ls

# Play back a session
tsh play <session-id>
```

## Rancher Integration via SSO

Configure Rancher to use the same OIDC provider as Teleport for unified authentication:

1. In Rancher, go to **Users & Authentication → Auth Provider**, then select the provider that matches your IdP, such as **Keycloak (SAML)** or **Generic OIDC / OpenID Connect**
2. Configure the same identity provider (Okta, Azure AD)
3. Map the same IdP groups in Rancher and Teleport so users receive the appropriate Rancher roles and Teleport roles

## Best Practices

1. **Use short-lived certificates** (TTL of 8–24 hours) - Teleport default is excellent
2. **Enable per-session MFA** for production cluster access
3. **Store session recordings** in S3 or GCS for long-term audit compliance
4. **Use Kubernetes impersonation** so pod exec sessions are attributed to the real user
5. **Alert on privileged access** using Teleport's event stream integration with your SIEM

## Conclusion

Teleport with Rancher provides a secure, auditable access layer for Kubernetes clusters and their underlying nodes. Certificate-based authentication eliminates static keys, session recording satisfies compliance requirements, and RBAC ensures users only access what they need.
