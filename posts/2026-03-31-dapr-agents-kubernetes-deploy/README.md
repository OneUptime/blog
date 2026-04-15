# How to Deploy Dapr Agents on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, Kubernetes, Deployment, Production

Description: A complete guide to deploying Dapr Agents on Kubernetes, including Deployment manifests, Dapr annotations, secret management, and health checks.

---

## Prerequisites

Ensure Dapr is installed on your Kubernetes cluster:

```bash
dapr init --kubernetes --wait
dapr status -k
```

## Containerizing Your Agent

Create a Dockerfile for your agent:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

Build and push:

```bash
docker build -t myrepo/research-agent:v1.0.0 .
docker push myrepo/research-agent:v1.0.0
```

## Kubernetes Deployment Manifest

Deploy the agent with Dapr sidecar injection:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: research-agent
  namespace: ai-agents
spec:
  replicas: 2
  selector:
    matchLabels:
      app: research-agent
  template:
    metadata:
      labels:
        app: research-agent
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "research-agent"
        dapr.io/app-port: "8080"
        dapr.io/log-level: "info"
        dapr.io/config: "agent-config"
        dapr.io/enable-api-logging: "true"
    spec:
      serviceAccountName: research-agent
      containers:
        - name: research-agent
          image: myrepo/research-agent:v1.0.0
          ports:
            - containerPort: 8080
          env:
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: llm-secrets
                  key: openai-api-key
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "2Gi"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
```

## Required Kubernetes Resources

Create the namespace, secret, and service account:

```bash
kubectl create namespace ai-agents

kubectl create secret generic llm-secrets \
  --from-literal=openai-api-key="sk-your-key" \
  -n ai-agents
```

Service account for RBAC:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: research-agent
  namespace: ai-agents
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: research-agent-role
  namespace: ai-agents
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: research-agent-rolebinding
  namespace: ai-agents
subjects:
  - kind: ServiceAccount
    name: research-agent
roleRef:
  kind: Role
  name: research-agent-role
  apiGroup: rbac.authorization.k8s.io
```

## Dapr Configuration Resource

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: agent-config
  namespace: ai-agents
spec:
  tracing:
    samplingRate: "0.1"
  metrics:
    enabled: true
```

## Service for Internal Communication

```yaml
apiVersion: v1
kind: Service
metadata:
  name: research-agent
  namespace: ai-agents
spec:
  selector:
    app: research-agent
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

## Deploying All Resources

```bash
kubectl apply -f namespace.yaml
kubectl apply -f secrets.yaml
kubectl apply -f serviceaccount.yaml
kubectl apply -f components/
kubectl apply -f config/agent-config.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# Verify deployment
kubectl rollout status deployment/research-agent -n ai-agents
kubectl get pods -n ai-agents
```

## Checking Agent Health

```bash
# Check Dapr sidecar status
kubectl get pods -n ai-agents -o wide
kubectl logs -n ai-agents research-agent-pod -c daprd

# Test agent via Dapr service invocation
kubectl port-forward svc/research-agent 8080:80 -n ai-agents
curl http://localhost:8080/health
```

## Summary

Deploying Dapr Agents on Kubernetes requires a containerized agent image, a Deployment manifest with Dapr sidecar annotations, Kubernetes secrets for LLM API keys, and Dapr component and configuration resources. Use liveness and readiness probes for production reliability, and set resource limits to prevent runaway agent processes.
