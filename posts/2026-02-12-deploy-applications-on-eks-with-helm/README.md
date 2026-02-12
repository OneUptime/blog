# How to Deploy Applications on EKS with Helm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EKS, Kubernetes, Helm, DevOps

Description: A practical guide to using Helm for deploying, managing, and upgrading applications on Amazon EKS, including chart creation and best practices.

---

Writing raw Kubernetes manifests for every application gets old fast. You end up with dozens of YAML files that are almost identical between environments, with subtle differences that are easy to mess up. Helm solves this problem by turning your Kubernetes resources into parameterized templates - charts - that you can install, upgrade, and roll back with a single command.

This guide covers using Helm with EKS, from installing third-party charts to building your own.

## Installing Helm

Helm 3 is a client-side tool with no server component. Installation is straightforward.

On macOS:

```bash
# Install Helm on macOS
brew install helm
```

On Linux:

```bash
# Install Helm on Linux
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

Verify the installation:

```bash
# Check Helm version
helm version
```

Make sure kubectl is configured for your EKS cluster. Helm uses the same kubeconfig. If you need help with that, see our [kubectl configuration guide](https://oneuptime.com/blog/post/configure-kubectl-for-eks/view).

## Using Helm Repositories

Helm charts are published in repositories. You add repos, search for charts, and install from them.

```bash
# Add some commonly used Helm repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

# Update your local chart cache
helm repo update

# Search for charts
helm search repo nginx
```

## Installing a Chart

Let's install NGINX as a quick example:

```bash
# Install NGINX from the Bitnami chart
helm install my-nginx bitnami/nginx \
  --namespace web \
  --create-namespace \
  --set service.type=ClusterIP \
  --set replicaCount=3
```

This creates a release named `my-nginx` in the `web` namespace. Helm tracks the release state, so you can upgrade, rollback, or uninstall it later.

Check the release:

```bash
# List installed Helm releases
helm list -n web

# Get detailed info about a release
helm status my-nginx -n web

# See what Kubernetes resources were created
kubectl get all -n web -l app.kubernetes.io/instance=my-nginx
```

## Customizing with Values Files

For anything beyond trivial overrides, use a values file instead of --set flags:

```yaml
# nginx-values.yaml - Custom configuration for NGINX
replicaCount: 3

image:
  tag: "1.25"

service:
  type: ClusterIP
  port: 80

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 250m
    memory: 256Mi

ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
  hosts:
    - host: web.example.com
      paths:
        - path: /
          pathType: Prefix

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

```bash
# Install using the values file
helm install my-nginx bitnami/nginx -n web -f nginx-values.yaml
```

## Upgrading a Release

When you need to change configuration or update the chart version:

```bash
# Upgrade with new values
helm upgrade my-nginx bitnami/nginx -n web -f nginx-values.yaml

# Upgrade to a specific chart version
helm upgrade my-nginx bitnami/nginx -n web --version 15.4.0 -f nginx-values.yaml
```

Helm performs a rolling update by default, keeping your application available during the upgrade.

## Rolling Back

If an upgrade goes wrong, roll back to the previous version:

```bash
# See release history
helm history my-nginx -n web

# Roll back to the previous revision
helm rollback my-nginx 1 -n web
```

## Creating Your Own Chart

For your custom applications, you'll want to create your own Helm chart. Scaffold one:

```bash
# Create a new chart skeleton
helm create my-app
```

This creates the following structure:

```
my-app/
  Chart.yaml          # Chart metadata
  values.yaml         # Default values
  templates/          # Kubernetes manifest templates
    deployment.yaml
    service.yaml
    ingress.yaml
    serviceaccount.yaml
    hpa.yaml
    _helpers.tpl      # Template helper functions
  charts/             # Dependencies
```

Let's customize the deployment template for an EKS workload:

```yaml
# templates/deployment.yaml - Custom deployment template
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "my-app.fullname" . }}
  labels:
    {{- include "my-app.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "my-app.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "my-app.selectorLabels" . | nindent 8 }}
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
    spec:
      serviceAccountName: {{ include "my-app.serviceAccountName" . }}
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          ports:
            - containerPort: {{ .Values.containerPort }}
          env:
            {{- range $key, $value := .Values.env }}
            - name: {{ $key }}
              value: {{ $value | quote }}
            {{- end }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          livenessProbe:
            httpGet:
              path: {{ .Values.healthCheck.path }}
              port: {{ .Values.containerPort }}
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: {{ .Values.healthCheck.path }}
              port: {{ .Values.containerPort }}
            initialDelaySeconds: 5
            periodSeconds: 5
```

And a corresponding values file:

```yaml
# values.yaml - Default values for my-app chart
replicaCount: 2

image:
  repository: 123456789012.dkr.ecr.us-west-2.amazonaws.com/my-app
  tag: latest
  pullPolicy: IfNotPresent

containerPort: 8080

env:
  APP_ENV: production
  LOG_LEVEL: info

healthCheck:
  path: /healthz

resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi

service:
  type: ClusterIP
  port: 80

serviceAccount:
  create: true
  annotations: {}
```

## Testing Your Chart

Before deploying, validate and test:

```bash
# Lint the chart for errors
helm lint my-app/

# Render templates without installing (dry run)
helm template my-app my-app/ -f custom-values.yaml

# Dry run against the cluster to validate
helm install my-app my-app/ --dry-run --debug
```

## Environment-Specific Values

Use separate values files for each environment:

```bash
# Deploy to staging
helm upgrade --install my-app ./my-app \
  -n staging \
  -f values.yaml \
  -f values-staging.yaml

# Deploy to production
helm upgrade --install my-app ./my-app \
  -n production \
  -f values.yaml \
  -f values-production.yaml
```

Values files are merged in order, so `values-production.yaml` overrides `values.yaml` where they conflict.

## Storing Charts in ECR

AWS ECR supports OCI-compatible Helm charts. Push your chart to ECR for team-wide access:

```bash
# Authenticate Helm with ECR
aws ecr get-login-password --region us-west-2 | \
  helm registry login --username AWS --password-stdin 123456789012.dkr.ecr.us-west-2.amazonaws.com

# Package and push the chart
helm package my-app/
helm push my-app-0.1.0.tgz oci://123456789012.dkr.ecr.us-west-2.amazonaws.com/helm-charts
```

## Helm with GitOps

Helm works well with GitOps tools like [ArgoCD](https://oneuptime.com/blog/post/set-up-argocd-for-gitops-on-eks/view) and [Flux](https://oneuptime.com/blog/post/set-up-flux-for-gitops-on-eks/view). Both can install and manage Helm releases declaratively from a Git repository, giving you version-controlled, auditable deployments.

Helm isn't perfect - the templating syntax can feel clunky, and debugging template errors is sometimes painful. But it's the closest thing Kubernetes has to a package manager, and once you're comfortable with it, deploying applications on EKS becomes significantly more manageable.
