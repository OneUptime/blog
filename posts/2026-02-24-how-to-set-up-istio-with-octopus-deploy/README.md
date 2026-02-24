# How to Set Up Istio with Octopus Deploy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Octopus Deploy, Continuous Delivery, Kubernetes, Traffic Management

Description: How to integrate Istio traffic management with Octopus Deploy for managing canary rollouts and traffic shifting in Kubernetes.

---

Octopus Deploy is a deployment automation tool that supports Kubernetes natively. While it doesn't have built-in Istio integration like some CD tools do, you can absolutely use it to manage Istio resources and build traffic-managed deployment pipelines. The approach involves using Octopus's Kubernetes steps to deploy and patch Istio VirtualServices and DestinationRules as part of your deployment process.

The key advantage of using Octopus with Istio is Octopus's strong multi-environment support and approval workflows. You can set up deployment processes that move through dev, staging, and production with Istio traffic management at each stage, complete with manual approvals and variable substitution.

## Connecting Octopus to Your Cluster

First, set up a Kubernetes target in Octopus. You need a service account token or kubeconfig that Octopus can use:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: octopus-deploy
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: octopus-istio-deployer
rules:
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["services", "pods", "namespaces"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]
- apiGroups: ["networking.istio.io"]
  resources: ["virtualservices", "destinationrules", "gateways"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]
- apiGroups: ["security.istio.io"]
  resources: ["authorizationpolicies", "peerauthentications"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: octopus-istio-deployer-binding
subjects:
- kind: ServiceAccount
  name: octopus-deploy
  namespace: default
roleRef:
  kind: ClusterRole
  name: octopus-istio-deployer
  apiGroup: rbac.authorization.k8s.io
```

Create a long-lived token for the service account:

```bash
kubectl create token octopus-deploy --duration=8760h
```

In Octopus, go to **Infrastructure > Deployment Targets** and add a Kubernetes cluster target with this token.

## Preparing the Istio Manifests

Store your Istio manifests as part of your Octopus deployment package. Create the base resources:

```yaml
# virtualservice.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: #{AppName}-vsvc
  namespace: #{Namespace}
spec:
  hosts:
  - #{AppName}
  http:
  - route:
    - destination:
        host: #{AppName}
        subset: stable
      weight: #{StableWeight}
    - destination:
        host: #{AppName}
        subset: canary
      weight: #{CanaryWeight}
```

```yaml
# destinationrule.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: #{AppName}-dr
  namespace: #{Namespace}
spec:
  host: #{AppName}
  subsets:
  - name: stable
    labels:
      app: #{AppName}
      version: stable
  - name: canary
    labels:
      app: #{AppName}
      version: canary
```

The `#{Variable}` syntax is Octopus variable substitution. Define these variables in your Octopus project.

## Building the Deployment Process

Create a deployment process in Octopus with these steps:

### Step 1: Deploy Canary Version

Use the "Deploy Kubernetes YAML" step:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: #{AppName}-canary
  namespace: #{Namespace}
  labels:
    app: #{AppName}
    version: canary
spec:
  replicas: #{CanaryReplicas}
  selector:
    matchLabels:
      app: #{AppName}
      version: canary
  template:
    metadata:
      labels:
        app: #{AppName}
        version: canary
    spec:
      containers:
      - name: #{AppName}
        image: #{DockerImage}:#{Version}
        ports:
        - containerPort: 8080
```

### Step 2: Shift Traffic to 10% Canary

Use another "Deploy Kubernetes YAML" step with the VirtualService manifest. Set the Octopus variables:

```
StableWeight = 90
CanaryWeight = 10
```

Or use the "Run a kubectl Script" step for more control:

```bash
kubectl patch virtualservice #{AppName}-vsvc \
  -n #{Namespace} \
  --type=json \
  -p='[
    {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 90},
    {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 10}
  ]'
```

### Step 3: Wait and Verify

Add a "Run a Script" step that checks Istio metrics from Prometheus:

```bash
#!/bin/bash
PROM_URL="http://prometheus.monitoring.svc.cluster.local:9090"
APP_NAME="#{AppName}"
NAMESPACE="#{Namespace}"

# Wait for traffic to accumulate
sleep 120

# Check error rate
ERROR_RATE=$(curl -s "${PROM_URL}/api/v1/query" \
  --data-urlencode "query=sum(rate(istio_requests_total{destination_workload=\"${APP_NAME}-canary\",namespace=\"${NAMESPACE}\",response_code=~\"5.*\"}[5m]))/sum(rate(istio_requests_total{destination_workload=\"${APP_NAME}-canary\",namespace=\"${NAMESPACE}\"}[5m]))" \
  | python3 -c "import sys,json; data=json.load(sys.stdin); print(data['data']['result'][0]['value'][1] if data['data']['result'] else '0')")

echo "Canary error rate: ${ERROR_RATE}"

# Fail if error rate is above 1%
if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
  echo "Error rate too high. Canary is unhealthy."
  exit 1
fi

echo "Canary looks healthy."
```

### Step 4: Progressive Traffic Increase

Add more traffic shift steps: 10% -> 30% -> 50% -> 100%, with verification between each step.

### Step 5: Promote and Cleanup

Update the stable deployment with the new image and clean up the canary:

```bash
# Update stable deployment
kubectl set image deployment/#{AppName}-stable \
  #{AppName}=#{DockerImage}:#{Version} \
  -n #{Namespace}

# Wait for rollout
kubectl rollout status deployment/#{AppName}-stable \
  -n #{Namespace} --timeout=300s

# Reset traffic to stable
kubectl patch virtualservice #{AppName}-vsvc \
  -n #{Namespace} \
  --type=json \
  -p='[
    {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 100},
    {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 0}
  ]'

# Scale down canary
kubectl scale deployment/#{AppName}-canary --replicas=0 -n #{Namespace}
```

## Adding Rollback Steps

Configure a rollback process in Octopus that resets traffic to the stable version:

```bash
# Reset VirtualService to 100% stable
kubectl patch virtualservice #{AppName}-vsvc \
  -n #{Namespace} \
  --type=json \
  -p='[
    {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 100},
    {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 0}
  ]'

# Delete canary deployment
kubectl delete deployment #{AppName}-canary -n #{Namespace} --ignore-not-found

echo "Rollback complete. All traffic routed to stable."
```

## Using Octopus Channels for Different Strategies

Octopus channels let you use different deployment processes for different release types. Create channels like:

- **Stable**: Full canary process with gradual traffic shift
- **Hotfix**: Skip canary, deploy directly with blue-green switch
- **Testing**: Deploy to a preview subset with no production traffic

Each channel can have different variable values for traffic weights and verification thresholds.

## Environment-Specific Variables

Set up Octopus variable scoping for different environments:

```
Variable: CanaryReplicas
  Development: 1
  Staging: 2
  Production: 3

Variable: VerificationDuration
  Development: 30
  Staging: 120
  Production: 300

Variable: ErrorRateThreshold
  Development: 0.05
  Staging: 0.02
  Production: 0.01
```

This way the same deployment process behaves differently per environment. Production gets more replicas, longer verification windows, and stricter thresholds.

## Monitoring Deployments

During a deployment, you can check the state of things from the command line:

```bash
# Check the current traffic split
kubectl get virtualservice #{AppName}-vsvc -n #{Namespace} -o jsonpath='{.spec.http[0].route[*].weight}'

# Watch canary pods
kubectl get pods -n #{Namespace} -l version=canary

# Check Istio proxy status
istioctl proxy-status
```

While Octopus doesn't have native Istio support, its flexible scripting steps and variable substitution make it perfectly capable of managing Istio-based deployments. The multi-environment promotion workflow and approval gates add a layer of governance that works well for organizations with strict deployment controls.
