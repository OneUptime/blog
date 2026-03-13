# How to Set Up Flagger with Gloo Edge Ingress

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Gloo Edge, Kubernetes, Canary Deployments, Ingresses

Description: Learn how to set up Flagger with Gloo Edge ingress controller for automated canary deployments on Kubernetes.

---

## Introduction

Flagger is a progressive delivery tool that automates the release process for applications running on Kubernetes. When paired with Gloo Edge, an Envoy-based API gateway and ingress controller, Flagger can leverage Gloo's powerful routing capabilities to perform canary deployments, A/B testing, and blue-green deployments with fine-grained traffic control.

Gloo Edge provides advanced traffic management features including rate limiting, external authentication, and web application firewall capabilities. By integrating Flagger with Gloo Edge, you gain automated canary analysis and promotion while taking advantage of Gloo's enterprise-grade ingress features. This guide walks you through setting up Flagger with Gloo Edge from scratch.

## Prerequisites

Before you begin, make sure you have the following in place:

- A Kubernetes cluster running version 1.22 or later.
- `kubectl` installed and configured to interact with your cluster.
- Helm 3 installed on your local machine.
- Gloo Edge installed on your cluster.
- A metrics provider such as Prometheus available in your cluster.

## Installing Gloo Edge

If you have not yet installed Gloo Edge, you can deploy it using Helm. Add the Gloo Edge Helm repository and install it into your cluster.

```bash
# Add the Gloo Edge Helm repository
helm repo add gloo https://storage.googleapis.com/solo-public-helm
helm repo update

# Install Gloo Edge into the gloo-system namespace
helm install gloo gloo/gloo \
  --namespace gloo-system \
  --create-namespace
```

Verify that Gloo Edge pods are running before proceeding.

```bash
kubectl get pods -n gloo-system
```

## Installing Flagger with Gloo Edge Support

Flagger needs to be installed with the Gloo Edge mesh provider. Add the Flagger Helm repository and install it with the correct provider configuration.

```yaml
# flagger-values.yaml
# Helm values for Flagger configured to work with Gloo Edge
meshProvider: gloo
metricsServer: http://prometheus.monitoring:9090
```

Install Flagger using the values file.

```bash
# Add the Flagger Helm repository
helm repo add flagger https://flagger.app

# Install Flagger with Gloo Edge provider
helm install flagger flagger/flagger \
  --namespace gloo-system \
  --values flagger-values.yaml
```

## Creating an Upstream for Your Application

Gloo Edge uses Upstream resources to define backend services. Create an Upstream that points to your application service.

```yaml
# upstream.yaml
# Gloo Edge Upstream resource pointing to the application service
apiVersion: gloo.solo.io/v1
kind: Upstream
metadata:
  name: podinfo
  namespace: gloo-system
spec:
  kube:
    serviceName: podinfo
    serviceNamespace: test
    servicePort: 9898
```

Apply the Upstream resource.

```bash
kubectl apply -f upstream.yaml
```

## Creating a VirtualService for Routing

Define a Gloo Edge VirtualService that routes traffic to your application through the Upstream.

```yaml
# virtualservice.yaml
# Gloo Edge VirtualService defining the routing rules
apiVersion: gateway.solo.io/v1
kind: VirtualService
metadata:
  name: podinfo
  namespace: gloo-system
spec:
  virtualHost:
    domains:
      - app.example.com
    routes:
      - matchers:
          - prefix: /
        routeAction:
          single:
            upstream:
              name: podinfo
              namespace: gloo-system
```

Apply the VirtualService.

```bash
kubectl apply -f virtualservice.yaml
```

## Deploying the Application

Deploy a sample application that Flagger will manage. The podinfo application is commonly used for demonstration purposes.

```yaml
# deployment.yaml
# Sample application deployment managed by Flagger
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
```

## Configuring the Flagger Canary Resource

Create a Canary custom resource that tells Flagger how to manage progressive delivery for your application using Gloo Edge.

```yaml
# canary.yaml
# Flagger Canary resource for Gloo Edge integration
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: test
spec:
  provider: gloo
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo
  upstreamRef:
    apiVersion: gloo.solo.io/v1
    kind: Upstream
    name: podinfo
    namespace: gloo-system
  progressDeadlineSeconds: 60
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

## Verifying the Setup

After applying the Canary resource, Flagger will initialize it by creating the primary and canary Deployments along with the corresponding ClusterIP services.

```bash
# Check the canary status
kubectl get canary -n test

# Describe the canary for detailed status
kubectl describe canary podinfo -n test
```

The canary status should show `Initialized` once Flagger has completed the setup. Flagger will have created `podinfo-primary` and `podinfo-canary` Deployments and updated the Gloo Edge routing configuration to point to the primary.

## Triggering a Canary Deployment

To trigger a canary deployment, update the container image in the original Deployment. Flagger detects the change and starts the canary analysis.

```bash
kubectl set image deployment/podinfo \
  podinfo=stefanprodan/podinfo:6.2.0 -n test
```

Monitor the canary progression.

```bash
# Watch the canary events
kubectl describe canary podinfo -n test

# Check Flagger logs for detailed analysis
kubectl logs -l app.kubernetes.io/name=flagger -n gloo-system
```

Flagger will gradually shift traffic from the primary to the canary based on the step weight configuration. If metrics remain healthy, the canary is promoted. If metrics breach the thresholds, Flagger automatically rolls back.

## Conclusion

Setting up Flagger with Gloo Edge gives you automated progressive delivery with the advanced traffic management capabilities of an Envoy-based ingress controller. By defining Canary resources, you let Flagger handle the complexity of traffic shifting, metric analysis, and automated rollbacks. This combination reduces deployment risk and gives your team confidence to ship changes more frequently while maintaining reliability.
