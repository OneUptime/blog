# How to Deploy OpenFaaS on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, OpenFaaS, Serverless, Function, Kubernetes

Description: Guide to deploying OpenFaaS serverless functions platform on Rancher for easy function-as-a-service workloads.

## Introduction

OpenFaaS (Functions as a Service) makes it easy to deploy serverless functions to Kubernetes. With its simple API, built-in UI, and support for any language, OpenFaaS is popular for building event-driven and API workloads on Rancher.

## Step 1: Install OpenFaaS with Helm

```bash
# Create namespaces

kubectl apply -f https://raw.githubusercontent.com/openfaas/faas-netes/master/namespaces.yml

# Add OpenFaaS chart repository
helm repo add openfaas https://openfaas.github.io/faas-netes/
helm repo update

# Create admin password
PASSWORD=$(head -c 12 /dev/urandom | shasum | cut -d' ' -f1)

kubectl create secret generic basic-auth \
  --from-literal=basic-auth-user=admin \
  --from-literal=basic-auth-password="$PASSWORD" \
  --namespace openfaas

# Install OpenFaaS
helm install openfaas openfaas/openfaas \
  --namespace openfaas \
  --set functionNamespace=openfaas-fn \
  --set generateBasicAuth=false \
  --set basic_auth=true \
  --set operator.create=true \
  --set clusterRole=true \
  --set gateway.replicas=2
```

## Step 2: Verify Installation

```bash
# Check all pods are running
kubectl get pods -n openfaas

# Port-forward for testing
kubectl port-forward svc/gateway -n openfaas 8080:8080 &
```

## Step 3: Install the faas-cli

```bash
# Install faas-cli
curl -sSL https://cli.openfaas.com | sudo sh

# Login to OpenFaaS
echo -n "$PASSWORD" | faas-cli login \
  --username admin \
  --password-stdin \
  --gateway http://127.0.0.1:8080
```

## Step 4: Deploy Your First Function

```bash
# Create a new function
export OPENFAAS_PREFIX=registry.example.com/functions
faas-cli new hello-python \
  --lang python3-http \
  --gateway http://127.0.0.1:8080
```

```python
# hello-python/handler.py
def handle(event, context):
    return {
        "statusCode": 200,
        "body": "Hello from Rancher OpenFaaS! Input: " + str(event.body)
    }
```

```bash
# Build and deploy
faas-cli build -f stack.yaml
faas-cli push -f stack.yaml
faas-cli deploy -f stack.yaml
```

## Step 5: Function YAML Configuration

```yaml
# stack.yaml
version: 1.0
provider:
  name: openfaas
  gateway: http://127.0.0.1:8080

functions:
  hello-python:
    lang: python3-http
    handler: ./hello-python
    image: registry.example.com/functions/hello-python:latest
    limits:
      memory: 128Mi
      cpu: 100m
    requests:
      memory: 64Mi
      cpu: 50m
    labels:
      com.openfaas.scale.min: "1"
      com.openfaas.scale.max: "10"
    environment:
      LOG_LEVEL: info
```

## Step 6: Configure HTTP Ingress

```yaml
# openfaas-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: openfaas-gateway
  namespace: openfaas
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "8m"
spec:
  ingressClassName: nginx
  rules:
  - host: functions.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: gateway
            port:
              number: 8080
  tls:
  - hosts:
    - functions.example.com
    secretName: functions-tls
```

## Monitoring Functions

```bash
# List deployed functions
faas-cli list

# View function logs
faas-cli logs hello-python

# Invoke function
echo "test input" | faas-cli invoke hello-python
```

## Conclusion

OpenFaaS provides a simple, developer-friendly serverless platform on Rancher. With its CLI, UI, and broad language support, it allows teams to deploy functions quickly without deep Kubernetes expertise. Autoscaling can help handle variable workloads, and Prometheus metrics integration provides observability out of the box.
