# How to Deploy an Application with Helm Charts on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Helm, Kubernetes, Containers, Linux

Description: Learn how to deploy an Application with Helm Charts on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Deploying applications with Helm charts on Kubernetes provides repeatable, version-controlled deployments. This guide covers creating a custom Helm chart and deploying it to a cluster from RHEL 9.

## Prerequisites

- RHEL 9 with Helm and kubectl installed
- Access to a Kubernetes cluster

## Step 1: Create a New Chart

```bash
helm create myapp
```

This creates a directory structure:

```
myapp/
  Chart.yaml          # Chart metadata
  values.yaml         # Default configuration
  templates/          # Kubernetes manifest templates
    deployment.yaml
    service.yaml
    ingress.yaml
    hpa.yaml
    _helpers.tpl
```

## Step 2: Customize values.yaml

```yaml
replicaCount: 3

image:
  repository: myregistry/myapp
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
  - name: DATABASE_URL
    value: "postgresql://db:5432/myapp"
```

## Step 3: Customize Templates

Edit `templates/deployment.yaml` to add environment variables:

```yaml
spec:
  containers:
    - name: {{ .Chart.Name }}
      image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
      ports:
        - containerPort: {{ .Values.service.port }}
      env:
        {{- range .Values.env }}
        - name: {{ .name }}
          value: {{ .value | quote }}
        {{- end }}
```

## Step 4: Validate the Chart

```bash
helm lint myapp/
helm template myapp myapp/ --debug
```

## Step 5: Deploy

```bash
helm install myapp ./myapp --namespace production --create-namespace
```

## Step 6: Upgrade

Update values and upgrade:

```bash
helm upgrade myapp ./myapp --namespace production --set image.tag=1.1.0
```

## Step 7: Verify Deployment

```bash
kubectl get pods -n production
kubectl get svc -n production
helm status myapp -n production
```

## Step 8: Package and Share

```bash
helm package myapp/
# Creates myapp-0.1.0.tgz
```

## Conclusion

Creating and deploying Helm charts on RHEL 9 provides a standardized, repeatable process for Kubernetes application deployment. Charts encapsulate all the Kubernetes resources an application needs, making deployments consistent across environments.
