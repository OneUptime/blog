# How to Set Up Istio with Tekton Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Tekton, CI/CD, Kubernetes, Pipelines

Description: How to integrate Istio traffic management into Tekton CI/CD pipelines for automated canary deployments and traffic shifting.

---

Tekton is a Kubernetes-native CI/CD framework that runs pipelines as pods in your cluster. When you combine Tekton with Istio, you can build deployment pipelines that automatically manage traffic shifting, run canary analysis, and roll back based on service mesh metrics. The two tools complement each other well since they both live natively in Kubernetes.

The basic idea is straightforward: your Tekton pipeline deploys a new version, updates Istio VirtualService weights to gradually shift traffic, checks metrics to verify the new version is healthy, and either completes the rollout or rolls back. All of this happens through standard Kubernetes API calls from Tekton tasks.

## Installing Tekton

If you don't already have Tekton installed:

```bash
kubectl apply --filename https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml
kubectl wait --for=condition=Available deployment --all -n tekton-pipelines --timeout=120s
```

Verify the installation:

```bash
kubectl get pods -n tekton-pipelines
```

## Setting Up RBAC for Tekton

Tekton tasks need permissions to modify Istio resources. Create a ServiceAccount with the right RBAC:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tekton-deployer
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: tekton-istio-deployer
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "patch", "update", "create"]
- apiGroups: ["networking.istio.io"]
  resources: ["virtualservices", "destinationrules"]
  verbs: ["get", "list", "patch", "update"]
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: tekton-istio-deployer-binding
subjects:
- kind: ServiceAccount
  name: tekton-deployer
  namespace: default
roleRef:
  kind: ClusterRole
  name: tekton-istio-deployer
  apiGroup: rbac.authorization.k8s.io
```

## Creating Tekton Tasks

Break the deployment into reusable tasks. First, a task to deploy the new version:

```yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: deploy-canary
  namespace: default
spec:
  params:
  - name: image
    type: string
    description: The container image for the new version
  - name: deployment-name
    type: string
    description: Name of the deployment
  - name: namespace
    type: string
    default: default
  steps:
  - name: deploy
    image: bitnami/kubectl:latest
    script: |
      #!/bin/bash
      set -e

      # Update the canary deployment
      kubectl set image deployment/$(params.deployment-name)-canary \
        app=$(params.image) \
        -n $(params.namespace)

      # Wait for rollout
      kubectl rollout status deployment/$(params.deployment-name)-canary \
        -n $(params.namespace) \
        --timeout=300s

      echo "Canary deployment updated successfully"
```

Next, a task to shift Istio traffic:

```yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: istio-traffic-shift
  namespace: default
spec:
  params:
  - name: virtualservice-name
    type: string
  - name: namespace
    type: string
    default: default
  - name: stable-weight
    type: string
  - name: canary-weight
    type: string
  steps:
  - name: shift-traffic
    image: bitnami/kubectl:latest
    script: |
      #!/bin/bash
      set -e

      # Patch the VirtualService with new weights
      kubectl patch virtualservice $(params.virtualservice-name) \
        -n $(params.namespace) \
        --type=json \
        -p='[
          {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": $(params.stable-weight)},
          {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": $(params.canary-weight)}
        ]'

      echo "Traffic shifted: stable=$(params.stable-weight)%, canary=$(params.canary-weight)%"
```

A task to check metrics from Prometheus:

```yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: check-canary-metrics
  namespace: default
spec:
  params:
  - name: service-name
    type: string
  - name: namespace
    type: string
    default: default
  - name: threshold
    type: string
    default: "0.99"
  steps:
  - name: check-metrics
    image: curlimages/curl:latest
    script: |
      #!/bin/sh
      set -e

      PROM_URL="http://prometheus.monitoring.svc.cluster.local:9090"

      # Wait for metrics to accumulate
      sleep 60

      # Query success rate
      QUERY="sum(rate(istio_requests_total{destination_service_name=\"$(params.service-name)\",response_code!~\"5.*\",namespace=\"$(params.namespace)\"}[2m]))/sum(rate(istio_requests_total{destination_service_name=\"$(params.service-name)\",namespace=\"$(params.namespace)\"}[2m]))"

      RESULT=$(curl -s "${PROM_URL}/api/v1/query?query=${QUERY}" | grep -o '"value":\[.*\]' | grep -o '[0-9.]*"' | head -1 | tr -d '"')

      echo "Success rate: ${RESULT}"
      echo "Threshold: $(params.threshold)"

      if [ "$(echo "${RESULT} >= $(params.threshold)" | bc -l)" -eq 1 ]; then
        echo "Canary is healthy"
        exit 0
      else
        echo "Canary is unhealthy - success rate below threshold"
        exit 1
      fi
```

## Building the Pipeline

Now compose the tasks into a pipeline that does a gradual canary rollout:

```yaml
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: istio-canary-deploy
  namespace: default
spec:
  params:
  - name: image
    type: string
  - name: deployment-name
    type: string
  - name: virtualservice-name
    type: string
  - name: namespace
    type: string
    default: default
  tasks:
  - name: deploy-canary-version
    taskRef:
      name: deploy-canary
    params:
    - name: image
      value: $(params.image)
    - name: deployment-name
      value: $(params.deployment-name)
    - name: namespace
      value: $(params.namespace)

  - name: shift-10-percent
    runAfter: ["deploy-canary-version"]
    taskRef:
      name: istio-traffic-shift
    params:
    - name: virtualservice-name
      value: $(params.virtualservice-name)
    - name: stable-weight
      value: "90"
    - name: canary-weight
      value: "10"
    - name: namespace
      value: $(params.namespace)

  - name: verify-10-percent
    runAfter: ["shift-10-percent"]
    taskRef:
      name: check-canary-metrics
    params:
    - name: service-name
      value: $(params.deployment-name)-canary
    - name: namespace
      value: $(params.namespace)

  - name: shift-50-percent
    runAfter: ["verify-10-percent"]
    taskRef:
      name: istio-traffic-shift
    params:
    - name: virtualservice-name
      value: $(params.virtualservice-name)
    - name: stable-weight
      value: "50"
    - name: canary-weight
      value: "50"
    - name: namespace
      value: $(params.namespace)

  - name: verify-50-percent
    runAfter: ["shift-50-percent"]
    taskRef:
      name: check-canary-metrics
    params:
    - name: service-name
      value: $(params.deployment-name)-canary
    - name: namespace
      value: $(params.namespace)

  - name: shift-100-percent
    runAfter: ["verify-50-percent"]
    taskRef:
      name: istio-traffic-shift
    params:
    - name: virtualservice-name
      value: $(params.virtualservice-name)
    - name: stable-weight
      value: "0"
    - name: canary-weight
      value: "100"
    - name: namespace
      value: $(params.namespace)

  finally:
  - name: rollback-on-failure
    when:
    - input: $(tasks.status)
      operator: in
      values: ["Failed"]
    taskRef:
      name: istio-traffic-shift
    params:
    - name: virtualservice-name
      value: $(params.virtualservice-name)
    - name: stable-weight
      value: "100"
    - name: canary-weight
      value: "0"
    - name: namespace
      value: $(params.namespace)
```

The `finally` block is important. If any task fails (like the metrics check), the pipeline automatically rolls back traffic to the stable version.

## Running the Pipeline

Trigger the pipeline with a PipelineRun:

```yaml
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  generateName: istio-canary-deploy-
  namespace: default
spec:
  pipelineRef:
    name: istio-canary-deploy
  serviceAccountName: tekton-deployer
  params:
  - name: image
    value: my-registry/my-app:v2
  - name: deployment-name
    value: my-app
  - name: virtualservice-name
    value: my-app-vsvc
  - name: namespace
    value: default
```

Apply it:

```bash
kubectl create -f pipeline-run.yaml
```

Monitor progress:

```bash
tkn pipelinerun logs -f -n default
```

## Handling Tekton Pods in the Mesh

One thing to watch out for: Tekton task pods run in your cluster and might get Istio sidecars injected if the namespace has injection enabled. This can cause issues because Tekton pods are short-lived and the sidecar might not terminate properly.

To avoid this, either exclude Tekton task pods from injection:

```yaml
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
```

Or if using ambient mode, Tekton pods will work fine since there's no sidecar to manage.

The Tekton plus Istio combination gives you a fully Kubernetes-native deployment pipeline with traffic management. Everything is declarative, version-controlled, and runs entirely within your cluster without needing external CI/CD infrastructure.
