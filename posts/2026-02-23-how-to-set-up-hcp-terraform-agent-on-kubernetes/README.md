# How to Set Up HCP Terraform Agent on Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Kubernetes, Agents, Helm, DevOps

Description: Step-by-step guide to deploying HCP Terraform agents on Kubernetes for scalable, resilient Terraform execution in private environments.

---

Running HCP Terraform agents on Kubernetes is the natural choice if your organization already relies on Kubernetes for container orchestration. You get automatic scaling, self-healing, resource management, and all the operational benefits Kubernetes provides - applied to your Terraform execution layer.

This guide covers deploying agents using both raw Kubernetes manifests and Helm charts, along with production hardening tips.

## Why Kubernetes for Agents

There are several reasons Kubernetes is a good fit for running Terraform agents:

- **Auto-restart**: If an agent crashes, Kubernetes restarts it automatically
- **Scaling**: Adjust replica counts to match your run volume
- **Resource management**: Set CPU and memory limits to prevent runaway Terraform processes
- **Secrets management**: Use Kubernetes secrets for agent tokens
- **Monitoring**: Integrate with existing Kubernetes monitoring (Prometheus, Grafana)
- **Rolling updates**: Update agent versions without downtime

## Prerequisites

- A Kubernetes cluster (EKS, GKE, AKS, or self-managed)
- `kubectl` configured to access your cluster
- An HCP Terraform agent pool with a generated token
- Helm v3 (if using the Helm chart method)

## Method 1: Kubernetes Manifests

### Creating the Namespace and Secret

```yaml
# namespace.yaml - Dedicated namespace for agents
apiVersion: v1
kind: Namespace
metadata:
  name: tfc-agents
  labels:
    app: tfc-agent
```

```yaml
# secret.yaml - Store the agent token securely
apiVersion: v1
kind: Secret
metadata:
  name: tfc-agent-token
  namespace: tfc-agents
type: Opaque
stringData:
  token: "your-agent-pool-token-here"
```

Apply the prerequisites:

```bash
# Create namespace and secret
kubectl apply -f namespace.yaml
kubectl apply -f secret.yaml
```

### Deploying the Agent

```yaml
# deployment.yaml - Agent deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tfc-agent
  namespace: tfc-agents
  labels:
    app: tfc-agent
spec:
  replicas: 2  # Number of concurrent agents
  selector:
    matchLabels:
      app: tfc-agent
  template:
    metadata:
      labels:
        app: tfc-agent
    spec:
      containers:
        - name: tfc-agent
          image: hashicorp/tfc-agent:latest
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "2000m"
          env:
            - name: TFC_AGENT_TOKEN
              valueFrom:
                secretKeyRef:
                  name: tfc-agent-token
                  key: token
            - name: TFC_AGENT_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: TFC_AGENT_LOG_LEVEL
              value: "info"
          volumeMounts:
            - name: agent-data
              mountPath: /agent-data
      volumes:
        - name: agent-data
          emptyDir:
            sizeLimit: 5Gi
      # Run as non-root for security
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
```

```bash
# Deploy the agents
kubectl apply -f deployment.yaml

# Verify the pods are running
kubectl get pods -n tfc-agents
```

### Adding Cloud Provider Credentials

If your Terraform configurations need cloud credentials, you can provide them as secrets:

```yaml
# cloud-credentials.yaml - AWS credentials as a secret
apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
  namespace: tfc-agents
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "AKIA..."
  AWS_SECRET_ACCESS_KEY: "your-secret-key"
  AWS_DEFAULT_REGION: "us-east-1"
```

Update the deployment to include these:

```yaml
# Add to the container env section
env:
  - name: TFC_AGENT_TOKEN
    valueFrom:
      secretKeyRef:
        name: tfc-agent-token
        key: token
  - name: AWS_ACCESS_KEY_ID
    valueFrom:
      secretKeyRef:
        name: aws-credentials
        key: AWS_ACCESS_KEY_ID
  - name: AWS_SECRET_ACCESS_KEY
    valueFrom:
      secretKeyRef:
        name: aws-credentials
        key: AWS_SECRET_ACCESS_KEY
  - name: AWS_DEFAULT_REGION
    valueFrom:
      secretKeyRef:
        name: aws-credentials
        key: AWS_DEFAULT_REGION
```

A better approach on cloud-managed Kubernetes is to use workload identity:

```yaml
# For EKS - use IRSA (IAM Roles for Service Accounts)
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tfc-agent
  namespace: tfc-agents
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/tfc-agent-role
---
# Reference the service account in your deployment
spec:
  serviceAccountName: tfc-agent
  containers:
    - name: tfc-agent
      image: hashicorp/tfc-agent:latest
      # No explicit AWS credentials needed - IRSA handles it
```

## Method 2: Helm Chart

HashiCorp provides an official Helm chart for the agent:

```bash
# Add the HashiCorp Helm repository
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update
```

Create a values file:

```yaml
# values.yaml - Helm chart configuration
replicaCount: 2

agent:
  token: ""  # We will use an existing secret instead

# Reference an existing secret for the token
existingSecret:
  name: tfc-agent-token
  key: token

# Agent configuration
agentConfig:
  name: ""  # Auto-generated from pod name
  logLevel: info

# Resource limits
resources:
  requests:
    memory: 512Mi
    cpu: 500m
  limits:
    memory: 2Gi
    cpu: "2"

# Extra environment variables for cloud credentials
extraEnv:
  - name: AWS_DEFAULT_REGION
    value: "us-east-1"

# Extra environment variables from secrets
extraEnvFrom:
  - secretRef:
      name: aws-credentials

# Pod security context
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000

# Node selector for placing agents on specific nodes
nodeSelector:
  workload-type: terraform-agents

# Tolerations if using tainted nodes
tolerations:
  - key: "dedicated"
    operator: "Equal"
    value: "terraform-agents"
    effect: "NoSchedule"
```

Install the chart:

```bash
# Create the namespace first
kubectl create namespace tfc-agents

# Create the secret
kubectl create secret generic tfc-agent-token \
  --namespace tfc-agents \
  --from-literal=token="your-agent-pool-token"

# Install the Helm chart
helm install tfc-agent hashicorp/terraform-cloud-agent \
  --namespace tfc-agents \
  --values values.yaml

# Verify the installation
helm list -n tfc-agents
kubectl get pods -n tfc-agents
```

## Scaling Agents

### Manual Scaling

```bash
# Scale up to handle more concurrent runs
kubectl scale deployment tfc-agent -n tfc-agents --replicas=5

# Scale down during off-hours
kubectl scale deployment tfc-agent -n tfc-agents --replicas=1
```

### Horizontal Pod Autoscaler

You can use HPA, but be aware that Terraform agents do not expose metrics by default. You might need a custom metrics approach:

```yaml
# hpa.yaml - Basic HPA based on CPU
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: tfc-agent-hpa
  namespace: tfc-agents
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: tfc-agent
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### Scheduled Scaling with CronJobs

For predictable workload patterns:

```yaml
# scale-up.yaml - Scale up during business hours
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-up-agents
  namespace: tfc-agents
spec:
  schedule: "0 8 * * 1-5"  # 8 AM weekdays
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: agent-scaler
          containers:
            - name: kubectl
              image: bitnami/kubectl:latest
              command:
                - kubectl
                - scale
                - deployment/tfc-agent
                - --replicas=5
                - -n
                - tfc-agents
          restartPolicy: OnFailure
```

## Using a Custom Agent Image

Build and deploy a custom image with additional tools:

```dockerfile
# Dockerfile
FROM hashicorp/tfc-agent:latest

USER root

# Install tools your Terraform configs need
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install specific Terraform providers ahead of time for faster init
RUN mkdir -p /home/tfc-agent/.terraform.d/plugin-cache

USER tfc-agent

ENV TF_PLUGIN_CACHE_DIR="/home/tfc-agent/.terraform.d/plugin-cache"
```

```bash
# Build and push to your registry
docker build -t your-registry.com/tfc-agent:custom .
docker push your-registry.com/tfc-agent:custom
```

Update your deployment to use the custom image:

```yaml
containers:
  - name: tfc-agent
    image: your-registry.com/tfc-agent:custom
    imagePullPolicy: Always
```

## Network Policies

Restrict agent network access using Kubernetes network policies:

```yaml
# network-policy.yaml - Restrict agent network access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: tfc-agent-network-policy
  namespace: tfc-agents
spec:
  podSelector:
    matchLabels:
      app: tfc-agent
  policyTypes:
    - Egress
  egress:
    # Allow DNS resolution
    - to: []
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    # Allow HTTPS to HCP Terraform
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - protocol: TCP
          port: 443
    # Allow access to internal infrastructure
    - to:
        - ipBlock:
            cidr: 10.0.0.0/8
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 5432  # PostgreSQL
        - protocol: TCP
          port: 6443  # Kubernetes API
```

## Monitoring and Observability

Set up monitoring for your agent pods:

```yaml
# servicemonitor.yaml - Prometheus ServiceMonitor
# Note: tfc-agent doesn't expose metrics natively,
# but you can monitor pod-level metrics
apiVersion: v1
kind: Service
metadata:
  name: tfc-agent-metrics
  namespace: tfc-agents
  labels:
    app: tfc-agent
spec:
  selector:
    app: tfc-agent
  ports: []
  clusterIP: None
```

Monitor agent health with kubectl:

```bash
# Check agent pod status
kubectl get pods -n tfc-agents -o wide

# View agent logs
kubectl logs -n tfc-agents -l app=tfc-agent --tail=100 -f

# Check resource usage
kubectl top pods -n tfc-agents
```

## Troubleshooting

**Pods in CrashLoopBackOff**: Check the agent token is correct. View logs with `kubectl logs -n tfc-agents <pod-name>`.

**Runs timing out**: Increase resource limits. Terraform plans for large infrastructures can be CPU and memory intensive.

**Cannot reach private resources**: Verify network policies allow traffic to your infrastructure. Check that the Kubernetes cluster has network connectivity to the target resources.

**Image pull errors**: If using a private registry, create an `imagePullSecret` and reference it in your deployment.

## Summary

Deploying HCP Terraform agents on Kubernetes gives you a resilient, scalable execution platform for Terraform operations in private environments. Use Helm for a quick start or raw manifests for full control. Make sure to set appropriate resource limits, use workload identity for cloud credentials, and implement network policies to restrict agent access.

For more on agent pools, see our guide on [configuring agent pools in HCP Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-agent-pools-in-hcp-terraform/view). For broader agent architecture, check out [using HCP Terraform agents for private infrastructure](https://oneuptime.com/blog/post/2026-02-23-how-to-use-hcp-terraform-agents-for-private-infrastructure/view).
