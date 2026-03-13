# How to Configure Flagger with NGINX Ingress Canary Annotations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, NGINX Ingress, Kubernetes, Canary Deployments, Progressive Delivery

Description: Learn how to configure Flagger with NGINX Ingress canary annotations for automated canary deployments on Kubernetes.

---

## Introduction

NGINX Ingress Controller is one of the most widely used ingress controllers in the Kubernetes ecosystem. It supports canary deployments through special annotations that control traffic splitting between different backend services. Flagger automates this process by managing the NGINX canary annotations during progressive delivery, gradually shifting traffic to a new version while analyzing metrics to determine whether the release is safe to promote.

This guide walks you through configuring Flagger with the NGINX Ingress Controller using canary annotations. You will learn how to set up the integration, define canary analysis rules, and run your first automated canary deployment.

## Prerequisites

Before you begin, ensure the following are in place:

- A Kubernetes cluster running version 1.22 or later.
- `kubectl` installed and configured.
- Helm 3 installed.
- NGINX Ingress Controller deployed in your cluster.
- Prometheus installed for metrics collection.

## Installing NGINX Ingress Controller

If NGINX Ingress is not already installed, deploy it using Helm.

```bash
# Add the ingress-nginx Helm repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install the NGINX Ingress Controller
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.metrics.enabled=true \
  --set controller.metrics.serviceMonitor.enabled=true
```

Enabling metrics is important because Flagger relies on NGINX metrics to evaluate canary health.

## Installing Flagger for NGINX

Install Flagger with the NGINX mesh provider.

```bash
helm repo add flagger https://flagger.app

helm install flagger flagger/flagger \
  --namespace ingress-nginx \
  --set meshProvider=nginx \
  --set metricsServer=http://prometheus.monitoring:9090
```

## Deploying the Application

Create a namespace and deploy your application along with a ClusterIP service.

```yaml
# app.yaml
# Application deployment and service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: podinfo
  namespace: test
  labels:
    app: podinfo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: podinfo
  template:
    metadata:
      labels:
        app: podinfo
    spec:
      containers:
        - name: podinfo
          image: stefanprodan/podinfo:6.1.0
          ports:
            - containerPort: 9898
              name: http
          readinessProbe:
            httpGet:
              path: /readyz
              port: 9898
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: podinfo
  namespace: test
spec:
  type: ClusterIP
  selector:
    app: podinfo
  ports:
    - name: http
      port: 80
      targetPort: 9898
```

## Creating the Ingress Resource

Create an Ingress resource that routes traffic to your application. Flagger will create a canary Ingress with the appropriate NGINX canary annotations during the deployment process.

```yaml
# ingress.yaml
# NGINX Ingress resource for the application
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: podinfo
  namespace: test
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: podinfo
                port:
                  number: 80
```

Apply the resources.

```bash
kubectl apply -f app.yaml
kubectl apply -f ingress.yaml
```

## Configuring the Flagger Canary Resource

Define the Canary resource that instructs Flagger on how to manage progressive delivery with NGINX Ingress annotations.

```yaml
# canary.yaml
# Flagger Canary resource for NGINX Ingress integration
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: test
spec:
  provider: nginx
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo
  ingressRef:
    apiVersion: networking.k8s.io/v1
    kind: Ingress
    name: podinfo
  progressDeadlineSeconds: 60
  service:
    port: 80
    targetPort: 9898
  analysis:
    interval: 30s
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
```

Apply the Canary resource.

```bash
kubectl apply -f canary.yaml
```

## Understanding How NGINX Canary Annotations Work

When Flagger detects a change in the target Deployment, it creates a canary Ingress resource with NGINX-specific annotations to control traffic splitting. The annotations that Flagger manages include the following.

```yaml
# Example of annotations Flagger applies to the canary Ingress
# These are managed automatically by Flagger
metadata:
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
```

The `canary-weight` annotation value is updated at each step of the analysis based on the `stepWeight` configuration. Flagger increases the weight if metrics are healthy and resets it to zero if a rollback is triggered.

## Installing the Load Tester

Deploy the Flagger load tester to generate traffic during canary analysis.

```bash
helm install flagger-loadtester flagger/loadtester \
  --namespace test
```

You can also add a webhook to your Canary resource to trigger load testing automatically.

```yaml
# Add this to the analysis section of canary.yaml
    webhooks:
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://podinfo-canary.test/"
```

## Triggering and Monitoring a Canary Release

Trigger a canary deployment by updating the container image.

```bash
kubectl set image deployment/podinfo \
  podinfo=stefanprodan/podinfo:6.2.0 -n test
```

Monitor the canary progression.

```bash
# Watch the canary status
kubectl get canary podinfo -n test -w

# Check the canary Ingress annotations
kubectl get ingress -n test -o yaml
```

As Flagger progresses through the analysis, you will see the canary weight increase in the Ingress annotations. If all metrics pass, the canary is promoted and becomes the new primary.

## Conclusion

Configuring Flagger with NGINX Ingress canary annotations provides a straightforward way to implement progressive delivery without requiring a service mesh. NGINX Ingress is already present in many Kubernetes clusters, making this integration easy to adopt. Flagger automates the management of canary annotations, metric analysis, and traffic shifting, allowing you to deploy new versions with confidence and automatic rollback protection.
