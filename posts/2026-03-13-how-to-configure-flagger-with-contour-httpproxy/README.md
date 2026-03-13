# How to Configure Flagger with Contour HTTPProxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Contour, HTTPProxy, Kubernetes, Canary Deployments

Description: Learn how to configure Flagger with Contour HTTPProxy for progressive delivery and canary deployments on Kubernetes.

---

## Introduction

Contour is a Kubernetes ingress controller that uses Envoy as its data plane proxy. Its HTTPProxy custom resource provides a more expressive and safer way to configure ingress routing compared to the standard Ingress resource. When combined with Flagger, Contour enables automated canary deployments with traffic shifting managed through HTTPProxy weighted routing.

Flagger integrates natively with Contour by manipulating HTTPProxy resources to gradually shift traffic between the primary and canary versions of your application. This guide covers the complete setup process from installing Contour and Flagger to running your first canary deployment.

## Prerequisites

Before starting, ensure you have the following ready:

- A Kubernetes cluster running version 1.22 or later.
- `kubectl` installed and configured.
- Helm 3 installed.
- Prometheus installed for metrics collection.

## Installing Contour

Deploy Contour using the official Helm chart.

```bash
# Add the Bitnami Helm repository for Contour
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install Contour
helm install contour bitnami/contour \
  --namespace projectcontour \
  --create-namespace
```

Verify that the Contour and Envoy pods are running.

```bash
kubectl get pods -n projectcontour
```

## Installing Flagger for Contour

Install Flagger with the Contour mesh provider.

```yaml
# flagger-values.yaml
# Flagger Helm values for Contour integration
meshProvider: contour
metricsServer: http://prometheus.monitoring:9090
```

```bash
helm repo add flagger https://flagger.app

helm install flagger flagger/flagger \
  --namespace projectcontour \
  --values flagger-values.yaml
```

## Deploying the Application

Create a namespace and deploy your application.

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: test
```

```yaml
# deployment.yaml
# Application deployment that Flagger will manage
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
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9898"
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
# ClusterIP service for the application
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

Apply both resources.

```bash
kubectl apply -f namespace.yaml
kubectl apply -f deployment.yaml
```

## Creating the HTTPProxy Resource

Create an HTTPProxy resource that defines how Contour should route traffic to your application. Flagger will modify this resource during canary analysis to shift traffic weights.

```yaml
# httpproxy.yaml
# Contour HTTPProxy resource for routing traffic
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: podinfo
  namespace: test
spec:
  virtualhost:
    fqdn: app.example.com
  routes:
    - conditions:
        - prefix: /
      services:
        - name: podinfo
          port: 80
          weight: 100
```

Apply the HTTPProxy.

```bash
kubectl apply -f httpproxy.yaml
```

## Configuring the Flagger Canary Resource

Create the Canary custom resource that instructs Flagger on how to perform progressive delivery using Contour.

```yaml
# canary.yaml
# Flagger Canary resource for Contour HTTPProxy integration
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: test
spec:
  provider: contour
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
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
    webhooks:
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://podinfo-canary.test/"
```

Apply the Canary resource.

```bash
kubectl apply -f canary.yaml
```

## Installing the Load Tester

Flagger provides a load testing service that can generate traffic during canary analysis. This is useful in environments where your application does not receive enough organic traffic to produce meaningful metrics.

```bash
helm install flagger-loadtester flagger/loadtester \
  --namespace test
```

## Verifying the Initialization

Once the Canary resource is applied, Flagger initializes the canary by creating primary and canary Deployments, Services, and updating the HTTPProxy with weighted routing.

```bash
# Check the canary status
kubectl get canary -n test

# Inspect the HTTPProxy to see Flagger's modifications
kubectl get httpproxy podinfo -n test -o yaml
```

You should see that Flagger has updated the HTTPProxy to include weighted services pointing to the primary and canary backends.

## Triggering and Monitoring a Canary Release

Trigger a canary deployment by updating the container image.

```bash
kubectl set image deployment/podinfo \
  podinfo=stefanprodan/podinfo:6.2.0 -n test
```

Watch the canary progression in real time.

```bash
kubectl get canary podinfo -n test -w
```

Flagger will step through the traffic weights defined in the Canary resource, check metrics at each interval, and either promote the canary or roll it back based on the analysis results. The HTTPProxy resource will be updated automatically at each step to reflect the new traffic split.

## Conclusion

Configuring Flagger with Contour HTTPProxy gives you a robust progressive delivery pipeline that leverages Contour's expressive routing capabilities. The HTTPProxy resource provides a cleaner model for defining traffic routing compared to standard Ingress resources, and Flagger's integration with Contour makes it straightforward to automate canary deployments with metric-driven analysis and rollback. This setup reduces the risk of deploying new versions and gives your team confidence in the release process.
