# How to Integrate ArgoCD with Teleport

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Teleport, Zero Trust

Description: Learn how to integrate ArgoCD with Teleport for zero-trust access, including certificate-based authentication, session recording, and just-in-time access controls for GitOps workflows.

---

Teleport is a zero-trust access platform that provides certificate-based authentication, session recording, and just-in-time access for infrastructure. Integrating ArgoCD with Teleport adds a powerful security layer: every ArgoCD session is recorded, access can be time-limited, and authentication uses short-lived certificates instead of long-lived tokens. This is especially valuable for organizations with strict compliance requirements.

This guide covers integrating ArgoCD with Teleport for both web UI access and Kubernetes-level access control.

## Why Teleport for ArgoCD

Teleport brings capabilities that standard OIDC/SAML providers do not offer:

- **Session recording**: Every ArgoCD web session can be recorded for audit
- **Short-lived certificates**: No long-lived tokens or passwords
- **Just-in-time access**: Users request elevated access that expires automatically
- **Access requests with approvals**: Require manager approval for production access
- **Unified audit log**: All ArgoCD access in one audit trail alongside SSH and database access

## Integration Approaches

There are two ways to integrate ArgoCD with Teleport:

```mermaid
graph TD
    A[Approach 1: OIDC via Dex] --> B[Teleport as OIDC Provider]
    B --> C[ArgoCD Web UI SSO]

    D[Approach 2: Teleport Application Access] --> E[Teleport Proxy]
    E --> F[ArgoCD Behind Teleport]
    F --> G[Session Recording + Audit]
```

Approach 1 gives you SSO authentication. Approach 2 gives you full session recording and zero-trust access. Many organizations use both.

## Approach 1: Teleport as OIDC Provider

Teleport can act as an OIDC identity provider for ArgoCD through Dex.

### Step 1: Create a SAML/OIDC Connector in Teleport

Teleport supports acting as an OIDC provider. Create a Teleport application:

```yaml
# teleport-argocd-app.yaml
kind: app
version: v3
metadata:
  name: argocd
  description: ArgoCD GitOps Platform
  labels:
    env: production
spec:
  uri: https://argocd.internal.example.com
  public_addr: argocd.example.com
```

Register it:

```bash
tctl create teleport-argocd-app.yaml
```

### Step 2: Configure Teleport OIDC Connector

Create an OIDC connector in Teleport:

```yaml
# teleport-oidc-connector.yaml
kind: oidc
version: v3
metadata:
  name: argocd-oidc
spec:
  issuer_url: https://teleport.example.com
  client_id: argocd
  client_secret: "generated-client-secret"
  redirect_url:
  - https://argocd.example.com/api/dex/callback
  scope:
  - openid
  - profile
  - email
  - groups
  claims_to_roles:
  - claim: groups
    value: platform-team
    roles:
    - argocd-admin
  - claim: groups
    value: developers
    roles:
    - argocd-developer
```

### Step 3: Configure Dex in ArgoCD

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.example.com

  dex.config: |
    connectors:
    - type: oidc
      id: teleport
      name: Teleport
      config:
        issuer: https://teleport.example.com
        clientID: argocd
        clientSecret: $dex.teleport.clientSecret
        redirectURI: https://argocd.example.com/api/dex/callback
        scopes:
        - openid
        - profile
        - email
        - groups
        insecureEnableGroups: true
        groupsKey: groups
        userIDKey: sub
        userNameKey: preferred_username
```

## Approach 2: Teleport Application Access (Recommended)

This approach puts ArgoCD entirely behind Teleport's application access proxy. This gives you full session recording, access requests, and certificate-based auth.

### Step 1: Deploy Teleport Agent

Deploy a Teleport agent in the ArgoCD namespace:

```yaml
# teleport-agent.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: teleport-agent
  namespace: argocd
spec:
  replicas: 1
  selector:
    matchLabels:
      app: teleport-agent
  template:
    metadata:
      labels:
        app: teleport-agent
    spec:
      containers:
      - name: teleport
        image: public.ecr.aws/gravitational/teleport:14
        args:
        - start
        - --roles=app
        - --token=/etc/teleport-secrets/token
        - --auth-server=teleport.example.com:443
        - --app-name=argocd
        - --app-uri=http://argocd-server.argocd.svc.cluster.local:80
        volumeMounts:
        - name: token
          mountPath: /etc/teleport-secrets
          readOnly: true
        - name: teleport-data
          mountPath: /var/lib/teleport
      volumes:
      - name: token
        secret:
          secretName: teleport-join-token
      - name: teleport-data
        emptyDir: {}
```

Generate a join token:

```bash
# On Teleport auth server
tctl tokens add --type=app --ttl=1h
```

Store the token:

```bash
kubectl create secret generic teleport-join-token \
  --namespace argocd \
  --from-literal=token='your-join-token'
```

### Step 2: Configure Teleport Roles

Define roles that control who can access ArgoCD and at what level:

```yaml
# teleport-argocd-roles.yaml
kind: role
version: v7
metadata:
  name: argocd-admin
spec:
  allow:
    app_labels:
      'name': 'argocd'
    # Additional Kubernetes access for ArgoCD namespace
    kubernetes_labels:
      'env': 'production'
    kubernetes_resources:
    - kind: pod
      namespace: argocd
      name: '*'
    kubernetes_groups:
    - argocd-admins
  options:
    # Session recording
    record_session:
      desktop: best_effort
    # Maximum session duration
    max_session_ttl: 8h
---
kind: role
version: v7
metadata:
  name: argocd-developer
spec:
  allow:
    app_labels:
      'name': 'argocd'
    # Request access to production (requires approval)
    request:
      roles:
      - argocd-admin
      # Limit elevated access duration
      max_duration: 2h
  options:
    max_session_ttl: 8h
    record_session:
      desktop: best_effort
```

Apply the roles:

```bash
tctl create teleport-argocd-roles.yaml
```

### Step 3: Configure Just-in-Time Access

Set up access request workflows so developers can request temporary admin access:

```yaml
# teleport-access-request-config.yaml
kind: role
version: v7
metadata:
  name: argocd-jit-admin
spec:
  allow:
    app_labels:
      'name': 'argocd'
    # Full ArgoCD access for approved requests
    request:
      roles: []
    # Auto-approve from specific groups or require manual approval
    review_requests:
      roles:
      - argocd-admin
      where: 'contains(request.roles, "argocd-jit-admin")'
  options:
    max_session_ttl: 2h  # Short-lived elevated access
```

Developers request access:

```bash
# Developer requests elevated access
tsh request create --roles=argocd-jit-admin --reason="Deploying hotfix for JIRA-1234"

# Admin approves the request
tsh request approve <request-id>

# Developer now has time-limited admin access
tsh app login argocd
```

## Session Recording and Audit

All ArgoCD web sessions through Teleport are recorded and auditable:

```bash
# View recent ArgoCD sessions
tsh recordings ls --type=app

# View a specific recording
tsh play <session-id>

# Export audit events
tctl get events --type=app.session.start --since=24h --format=json
```

This is invaluable for compliance - you can prove exactly who did what in ArgoCD and when.

## Teleport with ArgoCD CLI

For CLI access through Teleport:

```bash
# Login to Teleport
tsh login --proxy=teleport.example.com

# Access ArgoCD through Teleport tunnel
tsh app login argocd

# Now use ArgoCD CLI - it routes through Teleport
export ARGOCD_SERVER=$(tsh app config --format=uri argocd)
argocd app list
```

The CLI traffic goes through Teleport's proxy, which means it is also recorded and subject to access policies.

## Monitoring the Integration

Monitor both Teleport and ArgoCD health to ensure the authentication chain is working:

```yaml
# PrometheusRule for Teleport agent health
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: teleport-agent-health
spec:
  groups:
  - name: teleport-argocd
    rules:
    - alert: TeleportAgentDown
      expr: up{job="teleport-agent"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Teleport agent for ArgoCD is down"
```

Integrate with OneUptime for comprehensive monitoring of both the Teleport agent and ArgoCD health.

## Conclusion

Teleport integration elevates ArgoCD security from basic SSO to full zero-trust access with session recording, short-lived certificates, and just-in-time access controls. The application access approach is the most powerful, giving you complete audit trails of every ArgoCD interaction. For organizations in regulated industries or those requiring SOC 2 compliance, the combination of Teleport's session recording with ArgoCD's GitOps audit trail creates a comprehensive evidence chain for every deployment. The trade-off is added complexity in the access path, but for organizations that already use Teleport, the ArgoCD integration is straightforward and the security benefits are substantial.
