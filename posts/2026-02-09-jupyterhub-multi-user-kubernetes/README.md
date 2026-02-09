# How to Build a Jupyter Hub Multi-User Notebook Platform on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, JupyterHub, Data Science, Machine Learning, Notebooks

Description: Deploy JupyterHub on Kubernetes to provide a multi-user notebook platform for data science teams with GPU support, persistent storage, and authentication.

---

JupyterHub provides a multi-user environment for Jupyter notebooks, perfect for data science teams who need isolated compute resources and persistent workspaces. Running JupyterHub on Kubernetes makes it easy to scale, adds automatic resource management, and provides each user with their own containerized environment.

This guide shows you how to deploy a production-ready JupyterHub on Kubernetes with authentication, GPU support, and custom user environments.

## Installing JupyterHub with Helm

Add the JupyterHub Helm repository:

```bash
helm repo add jupyterhub https://hub.jupyter.org/helm-chart/
helm repo update

# View available versions
helm search repo jupyterhub/jupyterhub --versions | head -5
```

Create a configuration file:

```yaml
# jupyterhub-config.yaml
proxy:
  secretToken: "$(openssl rand -hex 32)"
  service:
    type: LoadBalancer

hub:
  config:
    JupyterHub:
      admin_access: true
      authenticator_class: dummy  # Change to OAuth, LDAP, etc in production
    DummyAuthenticator:
      password: admin-password

  db:
    pvc:
      storageClassName: fast-ssd
      storage: 10Gi

  resources:
    requests:
      cpu: "500m"
      memory: "1Gi"
    limits:
      cpu: "1"
      memory: "2Gi"

singleuser:
  image:
    name: jupyter/datascience-notebook
    tag: "2024-01-01"

  defaultUrl: "/lab"

  storage:
    type: dynamic
    capacity: 10Gi
    dynamic:
      storageClass: fast-ssd

  cpu:
    limit: 2
    guarantee: 1

  memory:
    limit: 4G
    guarantee: 2G

  profileList:
  - display_name: "Data Science Environment"
    description: "Python, R, Julia with common libraries"
    default: true
    kubespawner_override:
      image: jupyter/datascience-notebook:2024-01-01

  - display_name: "TensorFlow with GPU"
    description: "TensorFlow environment with GPU support"
    kubespawner_override:
      image: jupyter/tensorflow-notebook:2024-01-01
      extra_resource_limits:
        nvidia.com/gpu: "1"
      extra_resource_guarantees:
        nvidia.com/gpu: "1"

  - display_name: "PyTorch with GPU"
    description: "PyTorch environment with GPU support"
    kubespawner_override:
      image: jupyter/pytorch-notebook:2024-01-01
      extra_resource_limits:
        nvidia.com/gpu: "1"

scheduling:
  userScheduler:
    enabled: true

  userPlaceholder:
    enabled: true
    replicas: 2

cull:
  enabled: true
  timeout: 3600
  every: 600
```

Generate a secure token and install:

```bash
# Generate secret token
export SECRET_TOKEN=$(openssl rand -hex 32)

# Install JupyterHub
helm install jupyterhub jupyterhub/jupyterhub \
  --namespace jupyterhub \
  --create-namespace \
  --version 3.2.1 \
  --values jupyterhub-config.yaml \
  --set proxy.secretToken=$SECRET_TOKEN \
  --wait

# Check installation
kubectl get pods -n jupyterhub
kubectl get svc -n jupyterhub
```

Access JupyterHub:

```bash
# Get the load balancer IP
export JUPYTERHUB_URL=$(kubectl get svc -n jupyterhub proxy-public -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "JupyterHub URL: http://$JUPYTERHUB_URL"

# Or port forward for testing
kubectl port-forward -n jupyterhub svc/proxy-public 8080:80
# Access at http://localhost:8080
```

## Configuring Authentication

Set up GitHub OAuth authentication:

```yaml
hub:
  config:
    JupyterHub:
      authenticator_class: github
    GitHubOAuthenticator:
      client_id: your-github-client-id
      client_secret: your-github-client-secret
      oauth_callback_url: https://jupyterhub.yourdomain.com/hub/oauth_callback
      allowed_organizations:
        - your-org-name
      scope:
        - read:org
```

Or use LDAP/AD authentication:

```yaml
hub:
  config:
    JupyterHub:
      authenticator_class: ldapauthenticator.LDAPAuthenticator
    LDAPAuthenticator:
      server_address: ldap.example.com
      bind_dn_template:
        - "uid={username},ou=people,dc=example,dc=com"
      user_search_base: "ou=people,dc=example,dc=com"
      user_attribute: uid
      lookup_dn: true
```

## Creating Custom User Images

Build a custom notebook image:

```dockerfile
# Dockerfile.custom-notebook
FROM jupyter/datascience-notebook:2024-01-01

USER root

# Install system packages
RUN apt-get update && apt-get install -y \
    vim \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

USER $NB_UID

# Install additional Python packages
RUN pip install --no-cache-dir \
    tensorflow==2.14.0 \
    torch==2.0.1 \
    transformers==4.35.0 \
    mlflow==2.9.0 \
    wandb==0.16.0 \
    pandas==2.1.0 \
    scikit-learn==1.3.0 \
    xgboost==2.0.0 \
    lightgbm==4.1.0 \
    plotly==5.18.0 \
    seaborn==0.13.0

# Install JupyterLab extensions
RUN jupyter labextension install @jupyter-widgets/jupyterlab-manager

# Copy custom configuration
COPY jupyter_notebook_config.py /etc/jupyter/

# Set working directory
WORKDIR /home/jovyan/work

CMD ["start-notebook.sh"]
```

Build and push:

```bash
docker build -t your-registry/custom-notebook:v1 -f Dockerfile.custom-notebook .
docker push your-registry/custom-notebook:v1
```

Add to profile list:

```yaml
singleuser:
  profileList:
  - display_name: "Custom Data Science Environment"
    description: "Custom image with additional libraries"
    kubespawner_override:
      image: your-registry/custom-notebook:v1
```

## Setting Up Shared Storage

Create a shared PVC for team collaboration:

```yaml
# shared-storage.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: jupyterhub-shared
  namespace: jupyterhub
spec:
  accessModes:
  - ReadWriteMany
  storageClassName: nfs-client
  resources:
    requests:
      storage: 100Gi
```

Mount shared storage in user pods:

```yaml
singleuser:
  storage:
    extraVolumes:
    - name: jupyterhub-shared
      persistentVolumeClaim:
        claimName: jupyterhub-shared
    extraVolumeMounts:
    - name: jupyterhub-shared
      mountPath: /home/jovyan/shared
```

## Configuring Resource Limits and Quotas

Set resource guarantees and limits:

```yaml
singleuser:
  cpu:
    limit: 4
    guarantee: 1
  memory:
    limit: 16G
    guarantee: 4G

  # Profile-specific resources
  profileList:
  - display_name: "Small (2 CPU, 4GB RAM)"
    kubespawner_override:
      cpu_limit: 2
      cpu_guarantee: 1
      mem_limit: "4G"
      mem_guarantee: "2G"

  - display_name: "Large (8 CPU, 32GB RAM)"
    kubespawner_override:
      cpu_limit: 8
      cpu_guarantee: 4
      mem_limit: "32G"
      mem_guarantee: "16G"

  - display_name: "GPU (4 CPU, 16GB RAM, 1 GPU)"
    kubespawner_override:
      cpu_limit: 4
      cpu_guarantee: 2
      mem_limit: "16G"
      mem_guarantee: "8G"
      extra_resource_limits:
        nvidia.com/gpu: "1"
      extra_resource_guarantees:
        nvidia.com/gpu: "1"
```

Create namespace resource quota:

```yaml
# resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: jupyterhub-quota
  namespace: jupyterhub
spec:
  hard:
    requests.cpu: "100"
    requests.memory: "200Gi"
    requests.nvidia.com/gpu: "10"
    limits.cpu: "200"
    limits.memory: "400Gi"
    limits.nvidia.com/gpu: "10"
    persistentvolumeclaims: "50"
```

## Enabling Idle Notebook Culling

Configure automatic cleanup of idle notebooks:

```yaml
cull:
  enabled: true
  timeout: 3600  # Cull after 1 hour of inactivity
  every: 600     # Check every 10 minutes
  maxAge: 0      # Don't cull based on age
  users: false   # Don't cull admin users
```

## Setting Up Ingress with TLS

Create an Ingress with HTTPS:

```yaml
# jupyterhub-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: jupyterhub
  namespace: jupyterhub
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
spec:
  tls:
  - hosts:
    - jupyterhub.yourdomain.com
    secretName: jupyterhub-tls
  rules:
  - host: jupyterhub.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: proxy-public
            port:
              number: 80
```

Update JupyterHub config:

```yaml
proxy:
  service:
    type: ClusterIP
  https:
    enabled: false  # TLS terminated at ingress
```

## Monitoring JupyterHub

Add Prometheus metrics:

```yaml
hub:
  extraConfig:
    prometheus: |
      from prometheus_client import start_http_server
      start_http_server(9100)
```

Query key metrics:

```promql
# Active users
jupyterhub_total_users

# Running servers
jupyterhub_running_servers

# Hub requests
rate(jupyterhub_request_duration_seconds_count[5m])
```

## Managing Users and Admin Access

Set admin users:

```yaml
hub:
  config:
    Authenticator:
      admin_users:
        - admin-user
        - data-science-lead
    JupyterHub:
      admin_access: true
```

Grant access to specific users or groups:

```yaml
hub:
  config:
    Authenticator:
      allowed_users:
        - user1
        - user2
      allowed_groups:
        - data-science-team
```

## Conclusion

JupyterHub on Kubernetes provides a scalable, multi-user notebook platform that's perfect for data science teams. With support for custom images, GPU access, and flexible authentication, it can accommodate diverse workflows. The combination of resource limits, idle culling, and persistent storage makes it suitable for production use while keeping costs under control. By leveraging Kubernetes' orchestration capabilities, JupyterHub can automatically scale to meet demand and provide isolated environments for each user.
