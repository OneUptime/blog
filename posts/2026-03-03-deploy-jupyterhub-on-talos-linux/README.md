# How to Deploy JupyterHub on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, JupyterHub, Jupyter, Kubernetes, Data Science, Machine Learning

Description: Deploy JupyterHub on Talos Linux to provide multi-user Jupyter notebook environments for your data science and machine learning teams.

---

JupyterHub is a multi-user server for Jupyter notebooks, giving each user their own isolated notebook environment. It is the standard tool for teams that need shared access to compute resources for data science, machine learning experimentation, and interactive data analysis. Deploying JupyterHub on Talos Linux brings the benefits of an immutable, secure OS to your data science infrastructure. Each user gets their own pod with dedicated resources, and Kubernetes handles the scheduling and scaling automatically.

This guide covers deploying JupyterHub on Talos Linux using the official Zero to JupyterHub Helm chart, configuring user environments, setting up GPU access, and managing storage for user workspaces.

## Prerequisites

You need:

- A Talos Linux Kubernetes cluster with sufficient resources (at least 4 CPUs and 16GB RAM for the hub plus user pods)
- kubectl and Helm configured
- A default StorageClass for user persistent volumes
- An ingress controller with TLS support
- Optionally, GPU nodes for ML workloads

## Installing JupyterHub with Helm

Add the JupyterHub Helm repository:

```bash
# Add the JupyterHub Helm chart repository
helm repo add jupyterhub https://hub.jupyter.org/helm-chart/
helm repo update
```

Create a namespace:

```bash
kubectl create namespace jupyterhub
```

Generate a secret token for the hub:

```bash
# Generate a random 32-byte hex token
openssl rand -hex 32
```

Create a values file for your deployment:

```yaml
# jupyterhub-values.yaml
proxy:
  secretToken: "your-generated-hex-token-here"
  service:
    type: ClusterIP

hub:
  config:
    Authenticator:
      admin_users:
        - admin
      allowed_users:
        - user1
        - user2
        - user3
    DummyAuthenticator:
      password: "shared-password-for-testing"
    JupyterHub:
      authenticator_class: dummy
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: "1"
      memory: 1Gi

singleuser:
  # Default user environment
  image:
    name: jupyter/scipy-notebook
    tag: "2024-01-15"
  defaultUrl: "/lab"
  # Storage for user workspaces
  storage:
    capacity: 10Gi
    dynamic:
      storageClass: local-path
  # Default resource limits
  cpu:
    limit: 2
    guarantee: 0.5
  memory:
    limit: 4G
    guarantee: 1G
  # Profile list for environment selection
  profileList:
    - display_name: "Data Science (CPU)"
      description: "Standard data science environment with common Python libraries"
      default: true
      kubespawner_override:
        image: jupyter/scipy-notebook:2024-01-15
        cpu_limit: 2
        mem_limit: "4G"
    - display_name: "Machine Learning (GPU)"
      description: "PyTorch and TensorFlow with GPU access"
      kubespawner_override:
        image: jupyter/tensorflow-notebook:2024-01-15
        cpu_limit: 4
        mem_limit: "8G"
        extra_resource_limits:
          nvidia.com/gpu: "1"
        node_selector:
          gpu: nvidia
    - display_name: "R Studio"
      description: "R environment for statistical computing"
      kubespawner_override:
        image: jupyter/r-notebook:2024-01-15
        cpu_limit: 2
        mem_limit: "4G"

# Culling idle notebooks to save resources
cull:
  enabled: true
  timeout: 3600
  every: 300
  maxAge: 28800

# Scheduling configuration
scheduling:
  userScheduler:
    enabled: true
  podPriority:
    enabled: true
  userPlaceholder:
    enabled: true
    replicas: 2

ingress:
  enabled: true
  ingressClassName: nginx
  hosts:
    - jupyter.example.com
  tls:
    - hosts:
        - jupyter.example.com
      secretName: jupyterhub-tls
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
```

Install JupyterHub:

```bash
# Install JupyterHub
helm install jupyterhub jupyterhub/jupyterhub \
  --namespace jupyterhub \
  -f jupyterhub-values.yaml
```

## Verifying the Deployment

Monitor the pods:

```bash
# Watch pod status
kubectl get pods -n jupyterhub -w
```

You should see the hub pod, the proxy pod, and the user scheduler pods start up. User pods are created on demand when users log in.

Test access:

```bash
# Port-forward for testing
kubectl port-forward -n jupyterhub svc/proxy-public 8080:80
```

Navigate to http://localhost:8080, log in with one of the configured usernames and the dummy password.

## Configuring Real Authentication

For production, replace the dummy authenticator with a proper authentication backend. Here are common options:

### GitHub OAuth

```yaml
# jupyterhub-values.yaml - GitHub OAuth section
hub:
  config:
    GitHubOAuthenticator:
      client_id: "your-github-oauth-app-id"
      client_secret: "your-github-oauth-app-secret"
      oauth_callback_url: "https://jupyter.example.com/hub/oauth_callback"
      allowed_organizations:
        - your-github-org
      scope:
        - read:org
    JupyterHub:
      authenticator_class: github
```

### LDAP Authentication

```yaml
hub:
  config:
    LDAPAuthenticator:
      server_address: "ldap.example.com"
      server_port: 636
      use_ssl: true
      bind_dn_template:
        - "uid={username},ou=users,dc=example,dc=com"
      allowed_groups:
        - "cn=datascience,ou=groups,dc=example,dc=com"
    JupyterHub:
      authenticator_class: ldap
```

## Custom User Images

Build custom images with your organization's specific packages:

```dockerfile
# Dockerfile.datascience
FROM jupyter/scipy-notebook:2024-01-15

# Install additional Python packages
RUN pip install --no-cache-dir \
    pandas==2.1.4 \
    scikit-learn==1.3.2 \
    xgboost==2.0.3 \
    lightgbm==4.2.0 \
    plotly==5.18.0 \
    great-expectations==0.18.8 \
    mlflow==2.9.2

# Install system packages
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    graphviz \
    && rm -rf /var/lib/apt/lists/*
USER jovyan

# Copy custom Jupyter configuration
COPY jupyter_notebook_config.py /home/jovyan/.jupyter/
```

Build and push, then reference in the Helm values:

```bash
docker build -t your-registry/custom-datascience:v1.0 -f Dockerfile.datascience .
docker push your-registry/custom-datascience:v1.0
```

## Shared Storage for Collaboration

Set up shared volumes that all users can access:

```yaml
# shared-storage.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-datasets
  namespace: jupyterhub
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: longhorn
  resources:
    requests:
      storage: 100Gi
```

Add the shared volume to the Helm values:

```yaml
singleuser:
  storage:
    extraVolumes:
      - name: shared-datasets
        persistentVolumeClaim:
          claimName: shared-datasets
    extraVolumeMounts:
      - name: shared-datasets
        mountPath: /home/jovyan/shared
        readOnly: false
```

## Resource Management

To prevent any single user from consuming all cluster resources, configure resource quotas:

```yaml
# jupyterhub-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: jupyterhub-quota
  namespace: jupyterhub
spec:
  hard:
    requests.cpu: "32"
    requests.memory: 128Gi
    limits.cpu: "64"
    limits.memory: 256Gi
    requests.nvidia.com/gpu: "4"
    persistentvolumeclaims: "50"
```

## Monitoring JupyterHub

JupyterHub exposes Prometheus metrics. Enable them in the values:

```yaml
hub:
  config:
    JupyterHub:
      authenticate_prometheus: false
  extraConfig:
    prometheus: |
      c.JupyterHub.authenticate_prometheus = False
```

Create a ServiceMonitor:

```yaml
# jupyterhub-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: jupyterhub
  namespace: jupyterhub
spec:
  selector:
    matchLabels:
      app: jupyterhub
      component: hub
  endpoints:
    - port: http
      path: /hub/metrics
      interval: 30s
```

Key metrics to track include active user count, server spawn times, and resource utilization across user pods.

## Backup Strategy

User data lives in PersistentVolumeClaims. Set up regular backups:

```bash
# Use Velero to back up the JupyterHub namespace
velero schedule create jupyterhub-daily \
  --schedule="0 2 * * *" \
  --include-namespaces jupyterhub \
  --ttl 720h
```

## Conclusion

JupyterHub on Talos Linux provides a secure, scalable platform for data science teams. Users get isolated notebook environments with their choice of language and libraries, while administrators benefit from Kubernetes-native resource management and Talos's immutable security. With proper authentication, shared storage, and monitoring in place, you have a production-ready data science platform that serves teams of any size.
