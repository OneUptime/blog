# How to Deploy an Application with Helm Charts on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Helm, Kubernetes, Deployment, Charts

Description: Learn how to create a custom Helm chart on RHEL and deploy your application to Kubernetes with configurable values.

---

Creating your own Helm chart allows you to package your Kubernetes manifests into a reusable, versioned, and configurable deployment unit. This guide walks through creating and deploying a custom chart.

## Creating a New Chart

```bash
# Scaffold a new chart
helm create myapp

# View the chart structure
tree myapp/
# myapp/
# ├── Chart.yaml
# ├── charts/
# ├── templates/
# │   ├── deployment.yaml
# │   ├── hpa.yaml
# │   ├── ingress.yaml
# │   ├── service.yaml
# │   ├── serviceaccount.yaml
# │   └── tests/
# └── values.yaml
```

## Customizing Chart.yaml

```yaml
# myapp/Chart.yaml
apiVersion: v2
name: myapp
description: A Helm chart for my web application
type: application
version: 0.1.0
appVersion: "1.0.0"
```

## Customizing values.yaml

```yaml
# myapp/values.yaml
replicaCount: 3

image:
  repository: myregistry.example.com/myapp
  tag: "1.0.0"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: Prefix

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi

env:
  DATABASE_URL: "postgresql://user:pass@db:5432/myapp"
  REDIS_URL: "redis://cache:6379"
```

## Customizing the Deployment Template

```yaml
# myapp/templates/deployment.yaml (key sections)
spec:
  containers:
    - name: {{ .Chart.Name }}
      image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
      ports:
        - containerPort: 80
      env:
        {{- range $key, $value := .Values.env }}
        - name: {{ $key }}
          value: {{ $value | quote }}
        {{- end }}
      resources:
        {{- toYaml .Values.resources | nindent 8 }}
      livenessProbe:
        httpGet:
          path: /health
          port: 80
        initialDelaySeconds: 15
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /ready
          port: 80
        initialDelaySeconds: 5
        periodSeconds: 5
```

## Linting and Testing

```bash
# Lint the chart for errors
helm lint myapp/

# Render templates locally to inspect output
helm template myapp myapp/

# Dry-run to verify against the cluster
helm install myapp myapp/ --dry-run --debug
```

## Deploying the Chart

```bash
# Install the chart
helm install myapp myapp/ \
  --namespace production \
  --create-namespace

# Install with overrides
helm install myapp myapp/ \
  --namespace production \
  --create-namespace \
  --set replicaCount=5 \
  --set image.tag="1.1.0"
```

## Upgrading the Deployment

```bash
# Upgrade with a new image tag
helm upgrade myapp myapp/ \
  --namespace production \
  --set image.tag="1.2.0"

# Verify the rollout
kubectl rollout status deployment/myapp -n production
```

## Packaging and Sharing

```bash
# Package the chart into a .tgz file
helm package myapp/

# Push to a chart repository (e.g., ChartMuseum)
curl --data-binary "@myapp-0.1.0.tgz" http://chartmuseum.example.com/api/charts
```

Always use `helm lint` before deploying and `helm template` to review the rendered manifests. Use `--dry-run` against your cluster to catch RBAC or resource quota issues before actual deployment.
