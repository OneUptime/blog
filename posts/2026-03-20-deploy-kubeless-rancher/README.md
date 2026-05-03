# How to Deploy Kubeless on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubeless, Serverless, Kubernetes, Function

Description: Guide to deploying Kubeless serverless framework on Rancher for Kubernetes-native function execution.

## Introduction

Kubeless is a Kubernetes-native serverless framework that leverages Kubernetes CRDs to deploy functions. It integrates natively with Kubernetes resources, making it a lightweight serverless option for Rancher deployments.

## Step 1: Install Kubeless

```bash
# Create kubeless namespace

kubectl create namespace kubeless

# Install Kubeless
KUBELESS_VERSION=v1.0.8
kubectl create -f https://github.com/kubeless/kubeless/releases/download/${KUBELESS_VERSION}/kubeless-non-rbac-${KUBELESS_VERSION}.yaml

# Verify installation
kubectl get pods -n kubeless
kubectl get customresourcedefinitions | grep kubeless
```

## Step 2: Install the kubeless CLI

```bash
# Download kubeless CLI (Linux)
curl -OL https://github.com/kubeless/kubeless/releases/download/v1.0.8/kubeless_linux-amd64.zip
unzip kubeless_linux-amd64.zip
sudo mv bundles/kubeless_linux-amd64/kubeless /usr/local/bin/

kubeless version
```

## Step 3: Deploy a Python Function

```python
# hello.py
def hello(event, context):
    print(event)
    return event['data']
```

```bash
# Deploy function
kubeless function deploy hello \
  --runtime python3.8 \
  --from-file hello.py \
  --handler hello.hello \
  --namespace default

# Check function status
kubeless function ls

# Invoke function
kubeless function call hello --data 'Hello World'
```

## Step 4: Deploy a Node.js Function

```javascript
// greet.js
module.exports = {
  greet: function(event, context) {
    const name = event.data.name || 'World';
    return {
      statusCode: 200,
      body: `Hello, ${name}! From Rancher Kubeless`
    };
  }
};
```

```bash
kubeless function deploy greet \
  --runtime nodejs14 \
  --from-file greet.js \
  --handler greet.greet \
  --namespace default

kubeless function call greet --data '{"name":"Rancher"}'
```

## Step 5: Configure HTTP Triggers

```yaml
# http-trigger.yaml
apiVersion: kubeless.io/v1beta1
kind: HTTPTrigger
metadata:
  name: hello-http
  namespace: default
spec:
  function-name: hello
  host-name: functions.example.com
  path: /hello
  cors-enable: true
```

```bash
kubectl apply -f http-trigger.yaml

# Or using CLI
kubeless trigger http create hello \
  --function-name hello \
  --path /hello \
  --hostname functions.example.com
```

## Step 6: Configure Cron Triggers

```bash
# Run function on schedule
kubeless trigger cronjob create hello-cron \
  --function hello \
  --schedule "*/5 * * * *"

kubeless trigger cronjob ls
```

## Step 7: Declarative Function YAML

```yaml
# function.yaml
apiVersion: kubeless.io/v1beta1
kind: Function
metadata:
  name: hello
  namespace: default
spec:
  runtime: python3.8
  function: |
    def hello(event, context):
        return "Hello from Rancher Kubeless!"
  function-content-type: text
  handler: hello.hello
  deps: |
    requests==2.28.0
  deployment:
    spec:
      template:
        spec:
          containers:
          - name: hello
            resources:
              limits:
                cpu: "100m"
                memory: "128Mi"
```

## Monitoring Functions

```bash
# View function metrics
kubectl port-forward svc/hello -n default 8080:8080 &
curl http://localhost:8080/metrics

# View logs
kubectl logs -n default \
  $(kubectl get pods -n default -l function=hello -o name)
```

## Conclusion

Kubeless provides a lightweight, Kubernetes-native serverless experience in Rancher. By using CRDs directly, functions feel like native Kubernetes resources. While less feature-rich than Knative or OpenFaaS, Kubeless is simpler to operate for basic serverless use cases.
