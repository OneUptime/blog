# How to Deploy OpenFaaS on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, OpenFaaS, Serverless, Function, Kubernetes, Auto-Scaling

Description: Deploy OpenFaaS on Rancher to create a serverless function platform with auto-scaling, the OpenFaaS Store catalog, and function deployment via CLI.

## Introduction

OpenFaaS (Functions as a Service) is an open-source serverless framework that runs on Kubernetes. It provides a simple function deployment model where any Docker container can be a function, automatic scaling based on request rate, and a rich ecosystem of pre-built functions in the OpenFaaS Store.

## Step 1: Install arkade (OpenFaaS CLI manager)

```bash
curl -sSL https://get.arkade.dev | sudo -E sh
arkade get faas-cli
```

## Step 2: Deploy OpenFaaS with Helm

```bash
# Add OpenFaaS repository

helm repo add openfaas https://openfaas.github.io/faas-netes/
helm repo update

# Create namespaces
kubectl apply -f https://raw.githubusercontent.com/openfaas/faas-netes/master/namespaces.yml

# Generate a password for the admin user
PASSWORD=$(head -c 12 /dev/urandom | shasum | cut -d' ' -f1)
kubectl create secret generic basic-auth \
  --from-literal=basic-auth-user=admin \
  --from-literal=basic-auth-password="$PASSWORD" \
  -n openfaas

# Install OpenFaaS
helm upgrade --install openfaas openfaas/openfaas \
  --namespace openfaas \
  --set functionNamespace=openfaas-fn \
  --set generateBasicAuth=false \
  --set gateway.replicas=2
```

## Step 3: Access the OpenFaaS Gateway

```bash
# Port-forward the gateway
kubectl port-forward svc/gateway -n openfaas 8080:8080 &

# Login with faas-cli
echo -n "$PASSWORD" | faas-cli login --gateway http://127.0.0.1:8080 \
  --username admin --password-stdin

# Open the UI at http://127.0.0.1:8080/ui/
```

## Step 4: Deploy a Function from the Store

```bash
# List available functions
faas-cli store list

# Deploy a function from the store
faas-cli store deploy nodeinfo \
  --gateway http://127.0.0.1:8080

# Test the function
curl http://127.0.0.1:8080/function/nodeinfo
```

## Step 5: Create a Custom Function

```bash
# Create a new function using the Python template
faas-cli new my-function --lang python3-http --prefix your-dockerhub-username

# Edit the function handler
cat > my-function/handler.py << 'EOF'
import json

def handle(event, context):
    data = json.loads(event.body) if event.body else {}
    return {
        "statusCode": 200,
        "body": f"Hello, {data.get('name', 'World')}!"
    }
EOF

# Build and deploy
faas-cli build -f stack.yaml
docker login
faas-cli push -f stack.yaml
faas-cli deploy -f stack.yaml --gateway http://127.0.0.1:8080
```

## Step 6: Configure Autoscaling

```yaml
# Add autoscaling labels to the function in stack.yaml
functions:
  my-function:
    lang: python3-http
    handler: ./my-function
    image: your-dockerhub-username/my-function:latest
    labels:
      com.openfaas.scale.min: "1"
      com.openfaas.scale.max: "10"
      com.openfaas.scale.factor: "20"
```

## Conclusion

OpenFaaS on Rancher provides an accessible serverless platform that treats any Docker container as a function. Its simplicity and the OpenFaaS Store catalog make it practical for teams that want serverless capabilities without the complexity of Knative. In Community Edition, legacy auto-scaling based on Prometheus request-rate metrics and per-function min/max replica settings can help improve resource utilization.
