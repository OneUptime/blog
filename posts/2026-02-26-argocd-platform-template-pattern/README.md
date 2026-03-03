# How to Implement the Platform Template Pattern

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Platform Engineering, Template

Description: Learn how to build reusable platform templates with ArgoCD that standardize infrastructure provisioning and application deployment across your organization.

---

The platform template pattern takes the application catalog concept further. Instead of just providing deployment templates, you provide complete environment templates that include networking, security, observability, and CI/CD configuration alongside the application deployment. A team requests a new service, and the template provisions everything they need - namespace, RBAC, network policies, monitoring, and the application itself.

## The Vision

A developer wants to deploy a new service. Instead of filing tickets with the platform team, they fill in a simple config file:

```yaml
# team-config/services/payment-service.yaml
name: payment-service
team: payments
tier: critical
template: microservice-full
environment: production

config:
  port: 8443
  replicas: 3
  image: org/payment-service:v1.0.0

features:
  ingress: true
  tls: true
  monitoring: true
  logging: true
  tracing: true
  networkPolicy: strict
```

The platform template reads this and provisions:

1. A dedicated namespace with resource quotas
2. RBAC roles for the team
3. Network policies for isolation
4. Service mesh configuration
5. Monitoring dashboards and alerts
6. The application deployment itself

## Template Repository Structure

```text
platform-templates/
├── templates/
│   ├── microservice-full/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/
│   │       ├── namespace.yaml
│   │       ├── rbac.yaml
│   │       ├── resourcequota.yaml
│   │       ├── limitrange.yaml
│   │       ├── networkpolicy.yaml
│   │       ├── deployment.yaml
│   │       ├── service.yaml
│   │       ├── hpa.yaml
│   │       ├── pdb.yaml
│   │       ├── servicemonitor.yaml
│   │       ├── prometheusrule.yaml
│   │       └── ingress.yaml
│   ├── worker-full/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/
│   │       ├── namespace.yaml
│   │       ├── rbac.yaml
│   │       ├── deployment.yaml
│   │       ├── hpa.yaml
│   │       └── servicemonitor.yaml
│   └── stateful-full/
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
└── defaults/
    ├── standard-tier.yaml
    ├── critical-tier.yaml
    └── internal-tier.yaml
```

## The Namespace Template

Every service gets a properly configured namespace:

```yaml
# templates/microservice-full/templates/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.name }}
  labels:
    app: {{ .Values.name }}
    team: {{ .Values.team }}
    tier: {{ .Values.tier }}
    managed-by: platform-template
```

## RBAC Template

Automatically create the right roles for the owning team:

```yaml
# templates/microservice-full/templates/rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: {{ .Values.team }}-developer
  namespace: {{ .Values.name }}
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log", "pods/exec", "services", "configmaps"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch"]
  {{- if eq .Values.tier "standard" }}
  # Standard tier: developers can also restart pods
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["delete"]
  {{- end }}
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: {{ .Values.team }}-developer-binding
  namespace: {{ .Values.name }}
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: {{ .Values.team }}-developer
subjects:
  - kind: Group
    name: {{ .Values.team }}
    apiGroup: rbac.authorization.k8s.io
```

## Resource Quotas by Tier

Different tiers get different resource allocations:

```yaml
# templates/microservice-full/templates/resourcequota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: {{ .Values.name }}-quota
  namespace: {{ .Values.name }}
spec:
  hard:
    {{- if eq .Values.tier "critical" }}
    requests.cpu: "16"
    requests.memory: 32Gi
    limits.cpu: "32"
    limits.memory: 64Gi
    pods: "100"
    {{- else if eq .Values.tier "standard" }}
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.cpu: "16"
    limits.memory: 32Gi
    pods: "50"
    {{- else }}
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"
    {{- end }}
```

## Network Policy Template

```yaml
# templates/microservice-full/templates/networkpolicy.yaml
{{- if .Values.features.networkPolicy }}
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ .Values.name }}-policy
  namespace: {{ .Values.name }}
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow from same namespace
    - from:
        - podSelector: {}
    # Allow from ingress controller
    {{- if .Values.features.ingress }}
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
    {{- end }}
    # Allow from monitoring
    {{- if .Values.features.monitoring }}
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
      ports:
        - port: {{ .Values.config.port }}
    {{- end }}
  egress:
    # Allow DNS
    - to:
        - namespaceSelector: {}
      ports:
        - port: 53
          protocol: TCP
        - port: 53
          protocol: UDP
    # Allow same namespace
    - to:
        - podSelector: {}
    {{- if eq .Values.features.networkPolicy "strict" }}
    # Strict: only allow explicitly declared egress
    {{- else }}
    # Standard: allow all egress
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
    {{- end }}
{{- end }}
```

## Monitoring Template

Automatically set up monitoring for every service:

```yaml
# templates/microservice-full/templates/servicemonitor.yaml
{{- if .Values.features.monitoring }}
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: {{ .Values.name }}
  namespace: {{ .Values.name }}
  labels:
    app: {{ .Values.name }}
spec:
  selector:
    matchLabels:
      app: {{ .Values.name }}
  endpoints:
    - port: http
      interval: 30s
      path: /metrics
---
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: {{ .Values.name }}-alerts
  namespace: {{ .Values.name }}
spec:
  groups:
    - name: {{ .Values.name }}.rules
      rules:
        - alert: {{ .Values.name | title }}HighErrorRate
          expr: |
            rate(http_requests_total{namespace="{{ .Values.name }}", code=~"5.."}[5m])
            / rate(http_requests_total{namespace="{{ .Values.name }}"}[5m]) > 0.05
          for: 5m
          labels:
            severity: {{ if eq .Values.tier "critical" }}critical{{ else }}warning{{ end }}
            team: {{ .Values.team }}
          annotations:
            summary: "High error rate for {{ .Values.name }}"
            description: "Error rate is above 5% for the last 5 minutes"

        - alert: {{ .Values.name | title }}HighLatency
          expr: |
            histogram_quantile(0.95,
              rate(http_request_duration_seconds_bucket{namespace="{{ .Values.name }}"}[5m])
            ) > 1
          for: 10m
          labels:
            severity: warning
            team: {{ .Values.team }}
          annotations:
            summary: "High P95 latency for {{ .Values.name }}"
{{- end }}
```

## ArgoCD Integration

### ApplicationSet for Template Consumption

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: platform-services
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/org/team-configs.git
        revision: main
        files:
          - path: "services/*/config.yaml"
  template:
    metadata:
      name: '{{ index (fromJson .config) "name" }}'
    spec:
      project: '{{ index (fromJson .config) "team" }}'
      sources:
        - repoURL: https://github.com/org/platform-templates.git
          targetRevision: v2.0.0
          path: 'templates/{{ index (fromJson .config) "template" }}'
          helm:
            valueFiles:
              - $values/services/{{ index (fromJson .config) "name" }}/config.yaml
        - repoURL: https://github.com/org/team-configs.git
          targetRevision: main
          ref: values
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{ index (fromJson .config) "name" }}'
      syncPolicy:
        automated:
          selfHeal: true
          prune: true
        syncOptions:
          - CreateNamespace=true
```

### Per-Service Application (Simpler Approach)

For a simpler setup, create individual Applications:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service
  namespace: argocd
spec:
  project: payments
  sources:
    - repoURL: https://github.com/org/platform-templates.git
      targetRevision: v2.0.0
      path: templates/microservice-full
      helm:
        values: |
          name: payment-service
          team: payments
          tier: critical
          config:
            port: 8443
            replicas: 3
            image: org/payment-service:v1.0.0
          features:
            ingress: true
            tls: true
            monitoring: true
            networkPolicy: strict
  destination:
    server: https://production-cluster.example.com
    namespace: payment-service
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
    syncOptions:
      - CreateNamespace=true
```

## Template Versioning and Upgrades

Version your templates with Git tags:

```bash
# Release a new template version
git tag v2.1.0
git push origin v2.1.0
```

Teams can adopt new versions at their own pace by updating the `targetRevision`:

```yaml
# Update from v2.0.0 to v2.1.0
source:
  targetRevision: v2.1.0
```

## Compliance and Guardrails

The platform template pattern naturally enforces organizational standards:

- Every service gets network policies (no exceptions)
- Every service gets monitoring (built into the template)
- Resource quotas prevent runaway resource consumption
- RBAC is consistent and audit-friendly
- The template includes security best practices by default

To enforce that teams must use platform templates, restrict the AppProject source repos to only the platform templates and team config repos.

The platform template pattern is the foundation of a mature internal developer platform. By encoding your organization's best practices into templates, you ensure consistency while empowering teams to self-service their deployments. For more on ArgoCD project configuration, see our guide on [ArgoCD Projects](https://oneuptime.com/blog/post/2026-02-02-argocd-projects/view).
