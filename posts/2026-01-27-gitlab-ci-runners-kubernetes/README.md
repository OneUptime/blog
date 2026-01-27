# How to Configure GitLab CI Runners on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GitLab, CI/CD, DevOps, GitLab Runner, Helm, Autoscaling, Security

Description: A comprehensive guide to deploying, configuring, and scaling GitLab CI runners on Kubernetes using the GitLab Runner Operator and Helm charts.

---

> Running GitLab CI runners on Kubernetes transforms your CI/CD pipeline from a static resource into an elastic, auto-scaling powerhouse that spins up pods on demand and releases them when jobs complete.

## Why Run GitLab Runners on Kubernetes?

Traditional GitLab runners run on dedicated VMs or bare-metal servers, sitting idle between jobs or becoming bottlenecks during peak demand. Kubernetes changes this equation entirely:

- **Auto-scaling**: Spin up runner pods when jobs queue, scale down when idle
- **Resource isolation**: Each job runs in its own pod with defined CPU and memory limits
- **Cost efficiency**: Pay only for the compute you actually use
- **Consistency**: Every job starts with a fresh, identical environment
- **Multi-tenancy**: Run runners for multiple projects on the same cluster

## GitLab Runner Operator vs Helm Chart

You have two primary methods for deploying GitLab runners on Kubernetes:

| Feature | Operator | Helm Chart |
|---------|----------|------------|
| Installation complexity | Lower | Moderate |
| Customization | Limited | Extensive |
| GitLab version coupling | Tighter | Looser |
| CRD management | Automatic | Manual |
| Recommended for | Simple setups | Production environments |

For most production deployments, the Helm chart provides more flexibility. The operator works well for simpler setups or when you want GitLab to manage the runner lifecycle automatically.

## Installing the GitLab Runner Operator

The operator simplifies runner management by using Custom Resource Definitions (CRDs):

```bash
# Add the GitLab Helm repository
helm repo add gitlab https://charts.gitlab.io
helm repo update

# Install the operator
helm install gitlab-runner-operator gitlab/gitlab-runner-operator \
  --namespace gitlab-runner \
  --create-namespace
```

Once installed, create a Runner resource:

```yaml
# gitlab-runner-cr.yaml
# This Custom Resource tells the operator to create and manage a runner
apiVersion: apps.gitlab.com/v1beta2
kind: Runner
metadata:
  name: gitlab-runner
  namespace: gitlab-runner
spec:
  # Your GitLab instance URL
  gitlabUrl: https://gitlab.com

  # Secret containing the runner registration token
  token: gitlab-runner-secret

  # Runner configuration
  config: |
    [[runners]]
      [runners.kubernetes]
        namespace = "gitlab-runner"
        image = "alpine:latest"
```

Create the registration token secret:

```bash
# Create secret with your runner registration token
# Get this token from GitLab: Settings > CI/CD > Runners
kubectl create secret generic gitlab-runner-secret \
  --namespace gitlab-runner \
  --from-literal=runner-registration-token="YOUR_REGISTRATION_TOKEN"
```

Apply the runner configuration:

```bash
kubectl apply -f gitlab-runner-cr.yaml
```

## Deploying GitLab Runner with Helm

For production environments, the Helm chart offers more control:

```bash
# Add the GitLab Helm repository
helm repo add gitlab https://charts.gitlab.io
helm repo update

# Install with basic configuration
helm install gitlab-runner gitlab/gitlab-runner \
  --namespace gitlab-runner \
  --create-namespace \
  --set gitlabUrl=https://gitlab.com \
  --set runnerRegistrationToken="YOUR_REGISTRATION_TOKEN"
```

### Production-Ready Helm Values

Create a comprehensive values file for production deployments:

```yaml
# values.yaml
# Production configuration for GitLab Runner on Kubernetes

# GitLab instance URL - use your self-hosted URL or gitlab.com
gitlabUrl: https://gitlab.com

# Runner registration token from GitLab CI/CD settings
# Better practice: use existingSecret instead of plaintext
runnerRegistrationToken: ""

# Reference an existing secret for the registration token
# Secret should have key 'runner-registration-token'
# existingSecret: gitlab-runner-secret

# Number of runner pods to maintain
replicas: 1

# Runner tags for job matching
# Jobs request runners by tag in .gitlab-ci.yml
runnerTags: "kubernetes,docker"

# Allow runner to pick up untagged jobs
untagged: true

# Lock runner to specific project (optional)
# locked: false

# Runner configuration using TOML format
runners:
  # Runner name shown in GitLab UI
  name: "kubernetes-runner"

  # Executor type - kubernetes for K8s deployments
  executor: kubernetes

  # Kubernetes-specific configuration
  config: |
    [[runners]]
      # Clone URL for fetching repository
      clone_url = "https://gitlab.com"

      [runners.kubernetes]
        # Namespace where job pods will run
        namespace = "gitlab-runner"

        # Default image for jobs without specified image
        image = "alpine:latest"

        # Pull policy: always, if-not-present, never
        pull_policy = ["if-not-present"]

        # Privileged mode - required for Docker-in-Docker
        # WARNING: Security risk, enable only if needed
        privileged = false

        # CPU and memory limits for job pods
        cpu_limit = "2"
        cpu_request = "500m"
        memory_limit = "4Gi"
        memory_request = "1Gi"

        # Service CPU/memory for sidecar containers
        service_cpu_limit = "1"
        service_memory_limit = "1Gi"

        # Helper container resources
        helper_cpu_limit = "500m"
        helper_memory_limit = "256Mi"

# Pod resources for the runner manager itself
resources:
  limits:
    cpu: "500m"
    memory: "256Mi"
  requests:
    cpu: "100m"
    memory: "128Mi"

# Pod affinity and anti-affinity rules
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: gitlab-runner
          topologyKey: kubernetes.io/hostname

# Node selector for runner pods
nodeSelector:
  node-role.kubernetes.io/ci: "true"

# Tolerations for tainted nodes
tolerations:
  - key: "ci-workload"
    operator: "Equal"
    value: "true"
    effect: "NoSchedule"
```

Install with the values file:

```bash
helm install gitlab-runner gitlab/gitlab-runner \
  --namespace gitlab-runner \
  --create-namespace \
  --values values.yaml
```

## Configuring Executors

The Kubernetes executor creates a new pod for each CI job. Understanding executor configuration is crucial for performance and security.

### Basic Kubernetes Executor

```yaml
# Minimal executor configuration
runners:
  config: |
    [[runners]]
      [runners.kubernetes]
        namespace = "gitlab-runner"
        image = "alpine:latest"
```

### Docker-in-Docker (DinD) Executor

For jobs that need to build Docker images:

```yaml
# values-dind.yaml
# Configuration for Docker-in-Docker builds
# WARNING: Requires privileged mode which has security implications

runners:
  config: |
    [[runners]]
      [runners.kubernetes]
        namespace = "gitlab-runner"
        image = "docker:24.0"

        # Enable privileged mode for DinD
        # This is required but creates security risks
        privileged = true

        # Mount Docker socket alternative (more secure)
        # Uncomment if using Kubernetes Docker runtime
        # [[runners.kubernetes.volumes.host_path]]
        #   name = "docker-sock"
        #   mount_path = "/var/run/docker.sock"
        #   host_path = "/var/run/docker.sock"

        # DinD service container
        [[runners.kubernetes.services]]
          name = "docker"
          alias = "docker"
          entrypoint = ["dockerd-entrypoint.sh"]
          command = ["--tls=false"]
```

### Kaniko Executor (Rootless Docker Builds)

A more secure alternative for building Docker images without privileged mode:

```yaml
# values-kaniko.yaml
# Configuration for Kaniko-based Docker builds
# No privileged mode required - more secure than DinD

runners:
  config: |
    [[runners]]
      [runners.kubernetes]
        namespace = "gitlab-runner"
        image = "alpine:latest"

        # No privileged mode needed for Kaniko
        privileged = false

        # Mount Docker config for registry authentication
        [[runners.kubernetes.volumes.secret]]
          name = "docker-config"
          mount_path = "/kaniko/.docker"
          secret_name = "docker-registry-credentials"
```

Example `.gitlab-ci.yml` for Kaniko:

```yaml
# .gitlab-ci.yml using Kaniko for Docker builds
build:
  stage: build
  image:
    name: gcr.io/kaniko-project/executor:latest
    entrypoint: [""]
  script:
    - /kaniko/executor
      --context "${CI_PROJECT_DIR}"
      --dockerfile "${CI_PROJECT_DIR}/Dockerfile"
      --destination "${CI_REGISTRY_IMAGE}:${CI_COMMIT_TAG}"
  only:
    - tags
```

## Runner Registration Methods

GitLab offers multiple ways to register runners. Choose based on your security requirements and GitLab version.

### Registration Token (Legacy)

```bash
# Create secret with registration token
kubectl create secret generic gitlab-runner-secret \
  --namespace gitlab-runner \
  --from-literal=runner-registration-token="GR1348941_YOUR_TOKEN"
```

### Authentication Token (Recommended for GitLab 15.10+)

```bash
# Create secret with authentication token
# Get this from GitLab: Settings > CI/CD > Runners > New project runner
kubectl create secret generic gitlab-runner-secret \
  --namespace gitlab-runner \
  --from-literal=runner-token="glrt-YOUR_AUTH_TOKEN"
```

Update Helm values for authentication token:

```yaml
# values.yaml for authentication token
runners:
  secret: gitlab-runner-secret
  config: |
    [[runners]]
      token = "__REPLACED_BY_SECRET__"
      [runners.kubernetes]
        namespace = "gitlab-runner"
```

## Autoscaling Configuration

Kubernetes provides native autoscaling for GitLab runners through the Horizontal Pod Autoscaler (HPA).

### Basic HPA Configuration

```yaml
# hpa.yaml
# Horizontal Pod Autoscaler for GitLab Runner
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: gitlab-runner-hpa
  namespace: gitlab-runner
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: gitlab-runner

  # Minimum and maximum replicas
  minReplicas: 1
  maxReplicas: 10

  metrics:
    # Scale based on CPU utilization
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70

    # Scale based on memory utilization
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80

  # Scaling behavior configuration
  behavior:
    scaleDown:
      # Wait 5 minutes before scaling down
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleUp:
      # Scale up quickly when needed
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
```

### KEDA-Based Autoscaling

For more sophisticated scaling based on GitLab job queue:

```yaml
# keda-scaledobject.yaml
# KEDA ScaledObject for queue-based autoscaling
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: gitlab-runner-scaledobject
  namespace: gitlab-runner
spec:
  scaleTargetRef:
    name: gitlab-runner

  # Minimum and maximum replicas
  minReplicaCount: 1
  maxReplicaCount: 20

  # Cooldown period before scaling down
  cooldownPeriod: 300

  triggers:
    # Scale based on Prometheus metrics
    - type: prometheus
      metadata:
        # Prometheus server URL
        serverAddress: http://prometheus.monitoring:9090
        # Query for pending jobs
        query: |
          sum(gitlab_runner_jobs{state="pending"})
        threshold: "5"
```

### Cluster Autoscaler Integration

Ensure your cluster can scale nodes to accommodate runner pods:

```yaml
# values.yaml with cluster autoscaler annotations
podAnnotations:
  # Safe to evict for cluster autoscaler
  cluster-autoscaler.kubernetes.io/safe-to-evict: "true"

# Spread runners across availability zones
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: gitlab-runner
          topologyKey: topology.kubernetes.io/zone
```

## Resource Limits and Requests

Proper resource configuration prevents job failures and cluster resource exhaustion.

### Per-Job Resource Limits

```yaml
# values.yaml with comprehensive resource limits
runners:
  config: |
    [[runners]]
      [runners.kubernetes]
        namespace = "gitlab-runner"

        # Default resources for build containers
        cpu_limit = "2"
        cpu_request = "500m"
        memory_limit = "4Gi"
        memory_request = "1Gi"

        # Resources for service containers (databases, etc.)
        service_cpu_limit = "1"
        service_cpu_request = "200m"
        service_memory_limit = "2Gi"
        service_memory_request = "512Mi"

        # Resources for helper container (git clone, artifacts)
        helper_cpu_limit = "500m"
        helper_cpu_request = "100m"
        helper_memory_limit = "512Mi"
        helper_memory_request = "128Mi"

        # Ephemeral storage limits
        ephemeral_storage_limit = "10Gi"
        ephemeral_storage_request = "1Gi"
```

### Resource Overrides in .gitlab-ci.yml

Jobs can override default resources using variables:

```yaml
# .gitlab-ci.yml with resource overrides
build-heavy:
  stage: build
  image: node:18
  variables:
    # Override Kubernetes resources for this job
    KUBERNETES_CPU_REQUEST: "2"
    KUBERNETES_CPU_LIMIT: "4"
    KUBERNETES_MEMORY_REQUEST: "4Gi"
    KUBERNETES_MEMORY_LIMIT: "8Gi"
  script:
    - npm ci
    - npm run build
  tags:
    - kubernetes
```

### Limit Ranges and Resource Quotas

Protect your cluster with namespace-level limits:

```yaml
# limit-range.yaml
# Enforce resource limits on job pods
apiVersion: v1
kind: LimitRange
metadata:
  name: gitlab-runner-limits
  namespace: gitlab-runner
spec:
  limits:
    # Default limits for containers
    - type: Container
      default:
        cpu: "2"
        memory: "4Gi"
      defaultRequest:
        cpu: "500m"
        memory: "1Gi"
      max:
        cpu: "8"
        memory: "16Gi"
      min:
        cpu: "100m"
        memory: "128Mi"

    # Pod-level limits
    - type: Pod
      max:
        cpu: "16"
        memory: "32Gi"

---
# resource-quota.yaml
# Limit total resources in the namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gitlab-runner-quota
  namespace: gitlab-runner
spec:
  hard:
    requests.cpu: "50"
    requests.memory: "100Gi"
    limits.cpu: "100"
    limits.memory: "200Gi"
    pods: "50"
```

## Security Best Practices

Running CI workloads requires careful security consideration.

### Pod Security Standards

Apply Pod Security Standards to the runner namespace:

```yaml
# namespace.yaml with Pod Security Standards
apiVersion: v1
kind: Namespace
metadata:
  name: gitlab-runner
  labels:
    # Enforce restricted pod security standard
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

For runners that need elevated permissions:

```yaml
# namespace-baseline.yaml
# Use baseline for runners needing some privileges
apiVersion: v1
kind: Namespace
metadata:
  name: gitlab-runner-privileged
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### RBAC Configuration

Minimal RBAC for runner service account:

```yaml
# rbac.yaml
# Service account for GitLab Runner
apiVersion: v1
kind: ServiceAccount
metadata:
  name: gitlab-runner
  namespace: gitlab-runner

---
# Role with minimal permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: gitlab-runner
  namespace: gitlab-runner
rules:
  # Manage pods for CI jobs
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["create", "delete", "get", "list", "watch"]

  # Attach to pods for logs
  - apiGroups: [""]
    resources: ["pods/attach", "pods/exec"]
    verbs: ["create", "get"]

  # Read pod logs
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]

  # Manage secrets for job variables
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["create", "delete", "get", "update"]

  # Manage configmaps for job configuration
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["create", "delete", "get", "update"]

  # Manage services for job networking
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["create", "delete", "get"]

---
# Bind role to service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: gitlab-runner
  namespace: gitlab-runner
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: gitlab-runner
subjects:
  - kind: ServiceAccount
    name: gitlab-runner
    namespace: gitlab-runner
```

### Network Policies

Restrict network access for runner pods:

```yaml
# network-policy.yaml
# Restrict network access for CI job pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: gitlab-runner-jobs
  namespace: gitlab-runner
spec:
  # Apply to job pods
  podSelector:
    matchLabels:
      app: gitlab-runner-job

  policyTypes:
    - Ingress
    - Egress

  ingress: []  # No inbound traffic allowed

  egress:
    # Allow DNS resolution
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53

    # Allow GitLab API access
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - protocol: TCP
          port: 443

    # Allow container registry access
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - protocol: TCP
          port: 5000
```

### Secrets Management

Secure handling of CI/CD secrets:

```yaml
# values.yaml with secrets configuration
runners:
  config: |
    [[runners]]
      [runners.kubernetes]
        namespace = "gitlab-runner"

        # Mount secrets as volumes instead of environment variables
        [[runners.kubernetes.volumes.secret]]
          name = "ci-secrets"
          mount_path = "/secrets"
          read_only = true
          secret_name = "gitlab-ci-secrets"

        # Use projected volumes for multiple secrets
        [[runners.kubernetes.volumes.projected]]
          name = "credentials"
          mount_path = "/credentials"
          [[runners.kubernetes.volumes.projected.sources.secret]]
            name = "docker-config"
            items = [
              { key = "config.json", path = "docker/config.json" }
            ]
          [[runners.kubernetes.volumes.projected.sources.secret]]
            name = "npm-config"
            items = [
              { key = ".npmrc", path = "npm/.npmrc" }
            ]
```

## Monitoring Runners

Integrate runner metrics with your observability stack.

### Prometheus Metrics

```yaml
# values.yaml with metrics enabled
metrics:
  enabled: true
  portName: metrics
  port: 9252
  serviceMonitor:
    enabled: true
    interval: 30s
    labels:
      release: prometheus
```

### Grafana Dashboard

Key metrics to monitor:

```promql
# Running jobs
gitlab_runner_jobs{state="running"}

# Pending jobs (indicates need to scale)
gitlab_runner_jobs{state="pending"}

# Job duration
histogram_quantile(0.95, gitlab_runner_job_duration_seconds_bucket)

# Failed jobs
increase(gitlab_runner_failed_jobs_total[1h])

# API request errors
increase(gitlab_runner_api_request_statuses_total{status!="200"}[5m])
```

## Troubleshooting Common Issues

### Runner Not Picking Up Jobs

```bash
# Check runner registration
kubectl logs -n gitlab-runner deployment/gitlab-runner

# Verify runner appears in GitLab
# Settings > CI/CD > Runners

# Check runner tags match job requirements
kubectl get pods -n gitlab-runner -o yaml | grep -A5 "tags"
```

### Job Pods Stuck in Pending

```bash
# Check for resource constraints
kubectl describe pod -n gitlab-runner <pod-name>

# Check node resources
kubectl top nodes

# Check resource quotas
kubectl describe resourcequota -n gitlab-runner
```

### Permission Denied Errors

```bash
# Check RBAC permissions
kubectl auth can-i create pods --as=system:serviceaccount:gitlab-runner:gitlab-runner -n gitlab-runner

# Verify service account exists
kubectl get serviceaccount -n gitlab-runner
```

## Best Practices Summary

1. **Use Helm for production** - The Helm chart provides more configuration options than the operator

2. **Set resource limits** - Always define CPU and memory limits for job pods to prevent resource exhaustion

3. **Enable autoscaling** - Use HPA or KEDA to scale runners based on job queue depth

4. **Avoid privileged mode** - Use Kaniko or buildah for Docker builds instead of Docker-in-Docker

5. **Implement RBAC** - Create dedicated service accounts with minimal required permissions

6. **Apply network policies** - Restrict job pod network access to only required endpoints

7. **Use authentication tokens** - Prefer the newer authentication token method over registration tokens

8. **Monitor runner metrics** - Set up Prometheus and Grafana dashboards for visibility into runner performance

9. **Separate namespaces** - Run privileged and unprivileged workloads in different namespaces with appropriate Pod Security Standards

10. **Cache dependencies** - Configure persistent volume claims for caching npm, pip, and other package manager caches

---

GitLab CI runners on Kubernetes provide the scalability and isolation that modern CI/CD pipelines demand. Start with a basic Helm deployment, add autoscaling as your workload grows, and continuously refine your security posture. The investment in proper runner configuration pays dividends in faster builds, lower costs, and more reliable deployments.

For comprehensive monitoring of your GitLab runners and Kubernetes infrastructure, check out [OneUptime](https://oneuptime.com) - an open-source observability platform that helps you track metrics, set up alerts, and ensure your CI/CD pipeline stays healthy.
