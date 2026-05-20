# How to Deploy Teleport with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Teleport, Security

Description: Learn how to deploy Teleport for secure infrastructure access using ArgoCD with Kubernetes authentication, session recording, and role-based access control.

---

Teleport is an open-source infrastructure access platform that provides secure, audited access to SSH servers, Kubernetes clusters, databases, and web applications through a single gateway. Deploying Teleport with ArgoCD means your access infrastructure is managed through GitOps - the same workflow you use for your applications and other infrastructure components.

This guide covers deploying the Teleport cluster with ArgoCD, configuring Kubernetes access, and setting up role-based access control for your team.

## What Teleport Provides

Teleport acts as an identity-aware access proxy that:

- **Replaces VPNs** with identity-based access to infrastructure
- **Records sessions** for SSH, Kubernetes, and database access
- **Provides SSO** through OIDC, SAML, and GitHub authentication
- **Enforces RBAC** with fine-grained roles for every resource type
- **Generates audit logs** for every access event

## Teleport Architecture

```mermaid
graph TB
    subgraph Users
        U1[Developer] --> P[Teleport Proxy]
        U2[SRE] --> P
    end
    subgraph Teleport Cluster
        P --> A[Auth Service]
        A --> DB[(Audit/Session Storage)]
    end
    subgraph Resources
        P --> K8S[Kubernetes Cluster]
        P --> SSH[SSH Servers]
        P --> PG[PostgreSQL]
        P --> Web[Internal Web Apps]
    end
```

## Repository Structure

```text
access/
  teleport/
    Chart.yaml
    values.yaml
    values-production.yaml
  teleport-agents/
    kube-agent.yaml
    db-agent.yaml
  teleport-roles/
    developer-role.yaml
    sre-role.yaml
    readonly-role.yaml
```

## Deploying the Teleport Cluster

### Wrapper Chart

```yaml
# access/teleport/Chart.yaml

apiVersion: v2
name: teleport-cluster
description: Wrapper chart for Teleport
type: application
version: 1.0.0
dependencies:
  - name: teleport-cluster
    version: "18.8.1"
    repository: "https://charts.releases.teleport.dev"
```

### Teleport Values

```yaml
# access/teleport/values.yaml
teleport-cluster:
  # Cluster name must be a valid DNS name
  clusterName: teleport.example.com
  kubeClusterName: platform-cluster

  # Authentication configuration
  authentication:
    type: github
    connectorName: github
    localAuth: true

  # Proxy service configuration
  proxyListenerMode: multiplex

  # Operator for managing Teleport resources as Kubernetes CRDs
  operator:
    enabled: true

  # TLS/cert-manager configuration
  highAvailability:
    replicaCount: 1
    certManager:
      enabled: true
      issuerName: letsencrypt-prod
      issuerKind: ClusterIssuer

  # Persistence
  persistence:
    enabled: true
    storageClassName: gp3
    volumeSize: 50Gi

  # Ingress
  service:
    type: ClusterIP

  ingress:
    enabled: true
    spec:
      ingressClassName: nginx
  annotations:
    ingress:
      nginx.ingress.kubernetes.io/backend-protocol: HTTPS
      nginx.ingress.kubernetes.io/ssl-passthrough: "true"

  # Resources
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      memory: 1Gi

  # Session recording
  sessionRecording: node-sync
  chartMode: standalone

  # Teleport configuration
  auth:
    teleportConfig:
      teleport:
        log:
          severity: INFO
          format:
            output: json
      auth_service:
        authentication:
          type: github
          second_factor: "on"
          webauthn:
            rp_id: teleport.example.com
  proxy:
    teleportConfig:
      teleport:
        log:
          severity: INFO
          format:
            output: json
      proxy_service:
        https_keypairs: []
```

For multi-replica Auth Service deployments, use one of the chart's HA backend modes such as `aws`, `gcp`, or `azure`. Standalone mode with a single persistent volume is appropriate for a simple single-replica deployment.

### ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: teleport
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: access
  source:
    repoURL: https://github.com/your-org/gitops-repo.git
    targetRevision: main
    path: access/teleport
    helm:
      valueFiles:
        - values.yaml
        - values-production.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: teleport
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
    retry:
      limit: 5
      backoff:
        duration: 10s
        factor: 2
        maxDuration: 5m
  ignoreDifferences:
    - group: ""
      kind: Secret
      jsonPointers:
        - /data
```

## Configuring GitHub SSO

Create a GitHub OAuth application and configure the connector. The connector and roles below use the Teleport Kubernetes Operator CRDs enabled in the chart values, and should be applied in the Teleport namespace where the operator watches resources.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: teleport-github-connector
  annotations:
    resources.teleport.dev/allow-lookup-from-cr: "*"
stringData:
  githubSecret: your-github-client-secret
```

```yaml
# access/teleport-agents/github-connector.yaml
apiVersion: resources.teleport.dev/v3
kind: TeleportGithubConnector
metadata:
  name: github
spec:
  client_id: your-github-client-id
  client_secret: secret://teleport-github-connector/githubSecret
  display: GitHub
  redirect_url: https://teleport.example.com/v1/webapi/github/callback
  teams_to_roles:
    - organization: your-org
      team: sre-team
      roles:
        - sre
        - access
    - organization: your-org
      team: developers
      roles:
        - developer
        - access
```

## Defining Access Roles

Manage Teleport roles as Kubernetes custom resources through ArgoCD.

```yaml
# access/teleport-roles/developer-role.yaml
apiVersion: resources.teleport.dev/v5
kind: TeleportRole
metadata:
  name: developer
spec:
  allow:
    # Kubernetes access
    kubernetes_groups: ["developers"]
    kubernetes_labels:
      environment: ["staging", "development"]
    kubernetes_resources:
      - kind: pod
        verbs: ["get", "list", "watch"]
      - kind: pod
        name: "*"
        namespace: "*"
        verbs: ["get", "list"]

    # SSH access
    node_labels:
      environment: ["staging", "development"]
    logins: ["ubuntu", "ec2-user"]

    # Database access
    db_labels:
      environment: ["staging", "development"]
    db_names: ["myapp_staging"]
    db_users: ["readonly"]

    # Session settings
    max_session_ttl: 8h

  deny:
    # Never allow access to production nodes via developer role
    node_labels:
      environment: ["production"]

  options:
    # Force MFA for sensitive actions
    require_session_mfa: yes
    # Session recording
    enhanced_recording:
      - command
      - network
```

```yaml
# access/teleport-roles/sre-role.yaml
apiVersion: resources.teleport.dev/v5
kind: TeleportRole
metadata:
  name: sre
spec:
  allow:
    kubernetes_groups: ["system:masters"]
    kubernetes_labels:
      "*": "*"
    node_labels:
      "*": "*"
    logins: ["root", "ubuntu", "ec2-user"]
    db_labels:
      "*": "*"
    db_names: ["*"]
    db_users: ["admin", "readonly"]
    max_session_ttl: 4h

  options:
    require_session_mfa: yes
    enhanced_recording:
      - command
      - network
      - disk
    max_connections: 5
```

## Deploying Teleport Agents for Remote Clusters

To provide access to Kubernetes clusters that are separate from where Teleport runs, deploy agents.

```yaml
# access/teleport-agents/kube-agent.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: teleport-kube-agent
  namespace: argocd
spec:
  project: access
  source:
    repoURL: https://charts.releases.teleport.dev
    chart: teleport-kube-agent
    targetRevision: "18.8.1"
    helm:
      values: |
        proxyAddr: teleport.example.com:443
        roles: kube,discovery
        joinParams:
          method: kubernetes
          tokenName: kube-agent-token
        teleportClusterName: teleport.example.com
        kubeClusterName: production-cluster
        labels:
          environment: production
          region: us-east-1
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            memory: 256Mi
  destination:
    server: https://kubernetes.default.svc
    namespace: teleport
  syncPolicy:
    automated:
      selfHeal: true
```

## Using Teleport with kubectl

Once Teleport is deployed, users authenticate through the web UI or CLI, then access Kubernetes clusters transparently.

```bash
# Login to Teleport
tsh login --proxy=teleport.example.com

# List available Kubernetes clusters
tsh kube ls

# Connect to a cluster
tsh kube login production-cluster

# Now kubectl works through Teleport
kubectl get pods -n default

# All commands are recorded and auditable
```

## Verifying the Deployment

```bash
# Check Teleport pods
kubectl get pods -n teleport

# Check Teleport status
kubectl exec -n teleport deploy/teleport -- tctl status

# List configured roles
kubectl exec -n teleport deploy/teleport -- tctl get roles

# List registered nodes and clusters
kubectl exec -n teleport deploy/teleport -- tctl get nodes
kubectl exec -n teleport deploy/teleport -- tctl get kube_clusters

# Check ArgoCD sync status
argocd app get teleport
```

## Summary

Deploying Teleport with ArgoCD provides GitOps-managed secure access to your infrastructure. Access roles, SSO configuration, and agent deployments are all version-controlled in Git and automatically synced by ArgoCD. This approach eliminates the need for VPNs, provides complete audit trails for all access events, and enforces consistent access policies across all your infrastructure. The key is properly configuring authentication (GitHub SSO, OIDC), defining granular roles, and deploying agents to every cluster and resource that needs secure access.
