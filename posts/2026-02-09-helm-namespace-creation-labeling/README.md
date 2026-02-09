# How to Configure Helm Release Namespace Creation and Labeling Automatically

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, Namespaces

Description: Configure Helm charts to automatically create and label namespaces with proper metadata, resource quotas, and network policies for organized cluster management.

---

Helm can automatically create namespaces during installation, but thoughtful configuration ensures they include proper labels, annotations, and policies. Building namespace creation into your charts simplifies deployment and enforces organizational standards across your cluster.

## Understanding Helm Namespace Creation

The `helm install` and `helm upgrade` commands accept a `--create-namespace` flag that creates the target namespace if it doesn't exist. However, this creates a bare namespace without labels, quotas, or policies. Better practice embeds namespace creation in your chart with proper configuration.

Helm templates can include Namespace resources that get applied during installation. This approach gives you full control over namespace configuration.

## Basic Namespace Template

Create a namespace resource in your chart templates.

```yaml
# templates/namespace.yaml
{{- if .Values.namespaceCreation.enabled }}
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.namespaceCreation.name | default .Release.Namespace }}
  labels:
    {{- include "myapp.namespaceLabels" . | nindent 4 }}
    {{- with .Values.namespaceCreation.labels }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
  {{- with .Values.namespaceCreation.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
{{- end }}
```

Configure namespace creation through values.

```yaml
# values.yaml
namespaceCreation:
  # Enable automatic namespace creation
  enabled: true

  # Namespace name (defaults to Release.Namespace)
  name: ""

  # Labels to apply to the namespace
  labels:
    environment: production
    team: platform
    managed-by: helm
    cost-center: engineering

  # Annotations for the namespace
  annotations:
    description: "Application namespace managed by Helm"
    owner: "platform-team@company.com"
    created-by: "helm-chart"
```

## Adding Helper Templates for Namespace Labels

Create reusable label templates.

```yaml
# templates/_helpers.tpl
{{/*
Common labels for namespace
*/}}
{{- define "myapp.namespaceLabels" -}}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: {{ .Chart.Name }}
helm.sh/chart: {{ include "myapp.chart" . }}
{{- end }}

{{/*
Generate namespace name
*/}}
{{- define "myapp.namespaceName" -}}
{{- if .Values.namespaceCreation.name }}
  {{- .Values.namespaceCreation.name }}
{{- else }}
  {{- .Release.Namespace }}
{{- end }}
{{- end }}
```

## Implementing Resource Quotas

Add resource quotas to control namespace resource consumption.

```yaml
# templates/resourcequota.yaml
{{- if and .Values.namespaceCreation.enabled .Values.namespaceCreation.resourceQuota.enabled }}
apiVersion: v1
kind: ResourceQuota
metadata:
  name: {{ include "myapp.fullname" . }}-quota
  namespace: {{ include "myapp.namespaceName" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  hard:
    {{- toYaml .Values.namespaceCreation.resourceQuota.hard | nindent 4 }}
  {{- with .Values.namespaceCreation.resourceQuota.scopes }}
  scopes:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- with .Values.namespaceCreation.resourceQuota.scopeSelector }}
  scopeSelector:
    {{- toYaml . | nindent 4 }}
  {{- end }}
{{- end }}
```

Configure quotas in values.

```yaml
# values.yaml
namespaceCreation:
  enabled: true

  resourceQuota:
    enabled: true
    hard:
      # Pod limits
      pods: "50"

      # Compute resources
      requests.cpu: "10"
      requests.memory: "20Gi"
      limits.cpu: "20"
      limits.memory: "40Gi"

      # Storage
      requests.storage: "100Gi"
      persistentvolumeclaims: "10"

      # Services
      services: "10"
      services.loadbalancers: "2"
      services.nodeports: "5"

      # Secrets and ConfigMaps
      configmaps: "20"
      secrets: "20"

    # Optional: Scope quotas to specific priority classes
    scopes:
      - BestEffort
      - NotBestEffort

    scopeSelector:
      matchExpressions:
        - operator: In
          scopeName: PriorityClass
          values:
            - high
            - medium
```

## Adding Limit Ranges

Enforce default resource limits for containers.

```yaml
# templates/limitrange.yaml
{{- if and .Values.namespaceCreation.enabled .Values.namespaceCreation.limitRange.enabled }}
apiVersion: v1
kind: LimitRange
metadata:
  name: {{ include "myapp.fullname" . }}-limits
  namespace: {{ include "myapp.namespaceName" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  limits:
  {{- range .Values.namespaceCreation.limitRange.limits }}
  - type: {{ .type }}
    {{- with .default }}
    default:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .defaultRequest }}
    defaultRequest:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .max }}
    max:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .min }}
    min:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .maxLimitRequestRatio }}
    maxLimitRequestRatio:
      {{- toYaml . | nindent 6 }}
    {{- end }}
  {{- end }}
{{- end }}
```

Configure limit ranges.

```yaml
# values.yaml
namespaceCreation:
  limitRange:
    enabled: true
    limits:
      # Container limits
      - type: Container
        default:
          cpu: 500m
          memory: 512Mi
        defaultRequest:
          cpu: 100m
          memory: 128Mi
        max:
          cpu: 2
          memory: 2Gi
        min:
          cpu: 50m
          memory: 64Mi
        maxLimitRequestRatio:
          cpu: 4
          memory: 4

      # Pod limits
      - type: Pod
        max:
          cpu: 4
          memory: 4Gi

      # PVC limits
      - type: PersistentVolumeClaim
        max:
          storage: 50Gi
        min:
          storage: 1Gi
```

## Implementing Network Policies

Add default network policies for namespace isolation.

```yaml
# templates/networkpolicy.yaml
{{- if and .Values.namespaceCreation.enabled .Values.namespaceCreation.networkPolicy.enabled }}
{{- range .Values.namespaceCreation.networkPolicy.policies }}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ .name }}
  namespace: {{ include "myapp.namespaceName" $ }}
  labels:
    {{- include "myapp.labels" $ | nindent 4 }}
spec:
  podSelector:
    {{- toYaml .podSelector | nindent 4 }}
  policyTypes:
  {{- range .policyTypes }}
  - {{ . }}
  {{- end }}
  {{- with .ingress }}
  ingress:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- with .egress }}
  egress:
    {{- toYaml . | nindent 4 }}
  {{- end }}
{{- end }}
{{- end }}
```

Define network policies in values.

```yaml
# values.yaml
namespaceCreation:
  networkPolicy:
    enabled: true
    policies:
      # Default deny all ingress
      - name: default-deny-ingress
        podSelector: {}
        policyTypes:
          - Ingress

      # Allow ingress from same namespace
      - name: allow-same-namespace
        podSelector: {}
        policyTypes:
          - Ingress
        ingress:
          - from:
            - podSelector: {}

      # Allow ingress from ingress controller
      - name: allow-ingress-controller
        podSelector:
          matchLabels:
            expose: "true"
        policyTypes:
          - Ingress
        ingress:
          - from:
            - namespaceSelector:
                matchLabels:
                  name: ingress-nginx
            ports:
            - protocol: TCP
              port: 8080

      # Allow egress to DNS and external
      - name: allow-dns-egress
        podSelector: {}
        policyTypes:
          - Egress
        egress:
          # Allow DNS
          - to:
            - namespaceSelector:
                matchLabels:
                  name: kube-system
            ports:
            - protocol: UDP
              port: 53
          # Allow external HTTPS
          - to:
            - podSelector: {}
            ports:
            - protocol: TCP
              port: 443
```

## Creating RBAC Resources for Namespace

Set up service accounts and role bindings.

```yaml
# templates/namespace-rbac.yaml
{{- if and .Values.namespaceCreation.enabled .Values.namespaceCreation.rbac.enabled }}
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: {{ include "myapp.fullname" . }}-deployer
  namespace: {{ include "myapp.namespaceName" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: {{ include "myapp.fullname" . }}-deployer
  namespace: {{ include "myapp.namespaceName" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
rules:
{{- toYaml .Values.namespaceCreation.rbac.rules | nindent 2 }}
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: {{ include "myapp.fullname" . }}-deployer
  namespace: {{ include "myapp.namespaceName" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: {{ include "myapp.fullname" . }}-deployer
subjects:
- kind: ServiceAccount
  name: {{ include "myapp.fullname" . }}-deployer
  namespace: {{ include "myapp.namespaceName" . }}
{{- end }}
```

Configure RBAC in values.

```yaml
# values.yaml
namespaceCreation:
  rbac:
    enabled: true
    rules:
      - apiGroups: ["", "apps", "batch"]
        resources: ["deployments", "services", "configmaps", "secrets", "jobs"]
        verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
      - apiGroups: [""]
        resources: ["pods", "pods/log"]
        verbs: ["get", "list", "watch"]
```

## Adding Namespace Lifecycle Hooks

Create hooks to run jobs during namespace setup.

```yaml
# templates/namespace-setup-job.yaml
{{- if and .Values.namespaceCreation.enabled .Values.namespaceCreation.setupJob.enabled }}
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "myapp.fullname" . }}-namespace-setup
  namespace: {{ include "myapp.namespaceName" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
  annotations:
    "helm.sh/hook": post-install,post-upgrade
    "helm.sh/hook-weight": "0"
    "helm.sh/hook-delete-policy": before-hook-creation
spec:
  template:
    metadata:
      name: namespace-setup
    spec:
      restartPolicy: Never
      serviceAccountName: {{ include "myapp.fullname" . }}-deployer
      containers:
      - name: setup
        image: {{ .Values.namespaceCreation.setupJob.image }}
        command:
        {{- toYaml .Values.namespaceCreation.setupJob.command | nindent 10 }}
        env:
        - name: NAMESPACE
          value: {{ include "myapp.namespaceName" . }}
        {{- with .Values.namespaceCreation.setupJob.env }}
        {{- toYaml . | nindent 8 }}
        {{- end }}
{{- end }}
```

## Complete Values Example

Here's a comprehensive values file.

```yaml
# values.yaml
namespaceCreation:
  enabled: true
  name: ""  # Defaults to Release.Namespace

  labels:
    environment: production
    team: platform
    cost-center: engineering
    compliance: pci-dss

  annotations:
    description: "Production namespace for MyApp"
    owner: "platform-team@company.com"
    runbook: "https://wiki.company.com/myapp"

  resourceQuota:
    enabled: true
    hard:
      pods: "50"
      requests.cpu: "10"
      requests.memory: "20Gi"
      limits.cpu: "20"
      limits.memory: "40Gi"
      requests.storage: "100Gi"
      persistentvolumeclaims: "10"

  limitRange:
    enabled: true
    limits:
      - type: Container
        default:
          cpu: 500m
          memory: 512Mi
        defaultRequest:
          cpu: 100m
          memory: 128Mi
        max:
          cpu: 2
          memory: 2Gi

  networkPolicy:
    enabled: true
    policies:
      - name: default-deny-ingress
        podSelector: {}
        policyTypes: ["Ingress"]
      - name: allow-same-namespace
        podSelector: {}
        policyTypes: ["Ingress"]
        ingress:
          - from:
            - podSelector: {}

  rbac:
    enabled: true
    rules:
      - apiGroups: ["", "apps"]
        resources: ["deployments", "services"]
        verbs: ["get", "list", "create", "update"]

  setupJob:
    enabled: false
    image: bitnami/kubectl:latest
    command: ["sh", "-c", "echo Namespace setup complete"]
```

## Installing with Namespace Creation

Deploy the chart with automatic namespace creation.

```bash
# Install with namespace creation
helm install myapp ./mychart \
  --namespace myapp-prod \
  --create-namespace \
  --values values-production.yaml

# Verify namespace was created with labels
kubectl get namespace myapp-prod --show-labels

# Check resource quota
kubectl describe resourcequota -n myapp-prod

# Check limit ranges
kubectl describe limitrange -n myapp-prod

# Check network policies
kubectl get networkpolicy -n myapp-prod
```

Automating namespace creation and labeling through Helm charts ensures consistency across deployments. Include resource quotas to prevent resource exhaustion, limit ranges to set sensible defaults, and network policies for security isolation. This approach packages complete namespace configuration with your application deployment.
