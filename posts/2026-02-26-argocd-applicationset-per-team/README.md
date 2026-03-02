# How to Create Per-Team Applications with ArgoCD ApplicationSets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, ApplicationSet, Multi-Tenancy

Description: Learn how to use ArgoCD ApplicationSets to generate team-specific application configurations with proper isolation, RBAC, and namespace management.

---

In organizations with multiple development teams sharing a Kubernetes cluster (or a fleet of clusters), each team needs its own set of applications with proper isolation. ApplicationSets make it possible to define a single template that generates team-specific applications, namespaces, and access controls automatically. When a new team onboards, you add one entry and everything is provisioned.

This guide covers patterns for per-team ApplicationSets, from simple namespace separation to full multi-tenancy with RBAC and resource quotas.

## Basic Per-Team Application Generation

The simplest approach uses a list generator where each element represents a team.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: team-apps
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - team: payments
            repo: https://github.com/myorg/payments.git
            namespace: payments
            project: team-payments
          - team: search
            repo: https://github.com/myorg/search.git
            namespace: search
            project: team-search
          - team: notifications
            repo: https://github.com/myorg/notifications.git
            namespace: notifications
            project: team-notifications
  template:
    metadata:
      name: '{{team}}-app'
      labels:
        team: '{{team}}'
    spec:
      project: '{{project}}'
      source:
        repoURL: '{{repo}}'
        targetRevision: HEAD
        path: deploy
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

## Git File Generator for Team Configuration

A more scalable approach stores team configurations in Git, letting teams self-service their onboarding.

Create a team config directory structure:

```
teams/
  payments/
    config.json
  search/
    config.json
  notifications/
    config.json
  data-platform/
    config.json
```

Each `config.json` defines team-specific parameters:

```json
{
  "team_name": "payments",
  "repo_url": "https://github.com/myorg/payments.git",
  "namespace": "payments",
  "project": "team-payments",
  "slack_channel": "payments-deploys",
  "oncall_email": "payments-oncall@example.com",
  "resource_cpu_limit": "4",
  "resource_memory_limit": "8Gi"
}
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: team-services
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/platform-config.git
        revision: HEAD
        files:
          - path: 'teams/*/config.json'
  template:
    metadata:
      name: '{{team_name}}-service'
      labels:
        team: '{{team_name}}'
      annotations:
        notifications.argoproj.io/subscribe.on-sync-failed.slack: '{{slack_channel}}'
        notifications.argoproj.io/subscribe.on-health-degraded.email: '{{oncall_email}}'
    spec:
      project: '{{project}}'
      source:
        repoURL: '{{repo_url}}'
        targetRevision: HEAD
        path: deploy
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

New teams just need to create a directory with their config file and submit a pull request. Once merged, the ApplicationSet automatically provisions their application.

## Per-Team Namespace Setup with App-of-Apps

Teams often need more than just their application deployed - they need namespaces, resource quotas, network policies, and RBAC. Use a matrix generator to deploy a team namespace setup alongside the team's applications.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: team-namespaces
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/platform-config.git
        revision: HEAD
        files:
          - path: 'teams/*/config.json'
  template:
    metadata:
      name: '{{team_name}}-namespace-setup'
      labels:
        team: '{{team_name}}'
        component: namespace-setup
    spec:
      project: platform
      source:
        repoURL: https://github.com/myorg/namespace-template.git
        targetRevision: HEAD
        path: template
        helm:
          parameters:
            - name: namespace
              value: '{{namespace}}'
            - name: team
              value: '{{team_name}}'
            - name: resourceQuota.cpu
              value: '{{resource_cpu_limit}}'
            - name: resourceQuota.memory
              value: '{{resource_memory_limit}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

The namespace template Helm chart would include:

```yaml
# ResourceQuota
apiVersion: v1
kind: ResourceQuota
metadata:
  name: {{ .Values.team }}-quota
  namespace: {{ .Values.namespace }}
spec:
  hard:
    requests.cpu: {{ .Values.resourceQuota.cpu }}
    requests.memory: {{ .Values.resourceQuota.memory }}
    limits.cpu: {{ .Values.resourceQuota.cpu }}
    limits.memory: {{ .Values.resourceQuota.memory }}
---
# NetworkPolicy - allow same namespace traffic only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ .Values.team }}-default
  namespace: {{ .Values.namespace }}
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              team: {{ .Values.team }}
  egress:
    - to:
        - namespaceSelector: {}
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
```

## Multiple Services Per Team

Most teams have multiple microservices. Use the matrix generator to combine team configuration with service discovery.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: team-microservices
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - matrix:
        generators:
          # Team configuration
          - git:
              repoURL: https://github.com/myorg/platform-config.git
              revision: HEAD
              files:
                - path: 'teams/*/config.json'
          # Service discovery within each team's repo
          - git:
              repoURL: '{{.repo_url}}'
              revision: HEAD
              directories:
                - path: 'services/*'
  template:
    metadata:
      name: '{{.team_name}}-{{.path.basename}}'
      labels:
        team: '{{.team_name}}'
        service: '{{.path.basename}}'
    spec:
      project: '{{.project}}'
      source:
        repoURL: '{{.repo_url}}'
        targetRevision: HEAD
        path: 'services/{{.path.basename}}/deploy'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{.namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

This dynamically discovers all services within each team's repository and creates an Application for each service.

## Per-Team RBAC Integration

Combine ApplicationSets with ArgoCD RBAC to ensure teams can only manage their own applications.

First, define RBAC policies in ArgoCD's ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Each team can manage only their project
    p, role:team-payments, applications, *, team-payments/*, allow
    p, role:team-search, applications, *, team-search/*, allow
    p, role:team-notifications, applications, *, team-notifications/*, allow

    # Map SSO groups to roles
    g, payments-devs, role:team-payments
    g, search-devs, role:team-search
    g, notifications-devs, role:team-notifications
```

Then create matching ArgoCD Projects per team:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: team-projects
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/platform-config.git
        revision: HEAD
        files:
          - path: 'teams/*/config.json'
  template:
    metadata:
      name: '{{team_name}}-project-setup'
    spec:
      project: platform
      source:
        repoURL: https://github.com/myorg/platform-config.git
        targetRevision: HEAD
        path: project-template
        helm:
          parameters:
            - name: teamName
              value: '{{team_name}}'
            - name: namespace
              value: '{{namespace}}'
            - name: repoUrl
              value: '{{repo_url}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: argocd
```

## SCM Provider Generator for Org-Wide Discovery

For organizations where each team has their own GitHub repositories, the SCM provider generator can automatically discover team repos.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: org-team-discovery
  namespace: argocd
spec:
  generators:
    - scmProvider:
        github:
          organization: myorg
          tokenRef:
            secretName: github-token
            key: token
        filters:
          - repositoryMatch: "^team-.*-service$"
            labelMatch: "deploy-with-argocd"
  template:
    metadata:
      name: '{{repository}}'
      labels:
        org: myorg
    spec:
      project: default
      source:
        repoURL: '{{url}}'
        targetRevision: '{{branch}}'
        path: deploy
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{repository}}'
      syncPolicy:
        automated:
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

## Monitoring Per-Team Applications

Track team-specific application health.

```bash
# List applications for a specific team
argocd app list -l team=payments

# Check all team applications across environments
argocd app list -l team=payments -o wide

# Get ApplicationSet generation status
kubectl describe applicationset team-services -n argocd
```

Per-team ApplicationSets scale your platform engineering effort by making team onboarding self-service. Combined with proper RBAC and namespace isolation, teams get autonomy while the platform team maintains guardrails. For centralized monitoring across all teams, [OneUptime](https://oneuptime.com/blog/post/2026-02-26-argocd-applicationset-per-environment/view) provides team-aware dashboards and alerting.
