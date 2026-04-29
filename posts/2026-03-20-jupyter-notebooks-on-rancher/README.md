# How to Set Up Jupyter Notebooks on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Jupyter, Data Science, Machine Learning, Kubernetes, GPU

Description: Deploy JupyterHub on Rancher to provide collaborative notebook environments for data scientists with GPU access, persistent storage, and SSO integration.

## Introduction

JupyterHub provides managed Jupyter Notebook environments for teams. Deploying it on Rancher enables on-demand notebook servers with GPU access, persistent storage for notebooks, and SSO integration for authentication-replacing expensive cloud notebook services.

## Step 1: Install JupyterHub via Helm

```bash
helm repo add jupyterhub https://hub.jupyter.org/helm-chart/
helm repo update

# Create values file

cat > jupyterhub-values.yaml << 'EOF'
hub:
  config:
    JupyterHub:
      authenticator_class: "github"
    GitHubOAuthenticator:
      oauth_callback_url: "https://jupyter.example.com/hub/oauth_callback"
      client_id: "YOUR_GITHUB_CLIENT_ID"
      client_secret: "YOUR_GITHUB_CLIENT_SECRET"
      allowed_organizations:
        - your-github-org
      scope:
        - read:org

singleuser:
  cmd: null           # Use the Docker Stacks startup command
  defaultUrl: "/lab"    # Use JupyterLab instead of classic Jupyter
  storage:
    capacity: 10Gi
    dynamic:
      storageClass: longhorn   # Persistent storage per user
  profileList:
    - display_name: "Standard Environment"
      description: "Python 3 with common data science libraries"
      kubespawner_override:
        image: quay.io/jupyter/datascience-notebook:latest
        cpu_limit: 2
        mem_limit: "4G"
    - display_name: "GPU Environment (TensorFlow)"
      description: "TensorFlow with GPU support"
      kubespawner_override:
        image: quay.io/jupyter/tensorflow-notebook:cuda-latest
        cpu_limit: 4
        mem_limit: "16G"
        extra_resource_limits:
          nvidia.com/gpu: "1"    # Requires GPU nodes and the NVIDIA device plugin

cull:
  enabled: true
  timeout: 3600    # Cull notebooks idle for 1 hour
  maxAge: 86400    # Max notebook age 24 hours
EOF

helm install jupyterhub jupyterhub/jupyterhub \
  --namespace jupyterhub \
  --create-namespace \
  --values jupyterhub-values.yaml
```

## Step 2: Configure Ingress

```yaml
# jupyterhub-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: jupyterhub
  namespace: jupyterhub
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - jupyter.example.com
      secretName: jupyter-tls
  rules:
    - host: jupyter.example.com
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

## Step 3: Pre-Install Python Packages in Custom Image

```dockerfile
# custom-notebook/Dockerfile
FROM quay.io/jupyter/datascience-notebook:latest

RUN pip install --no-cache-dir \
    mlflow \
    pandas \
    scikit-learn && \
    fix-permissions "${CONDA_DIR}" && \
    fix-permissions "/home/${NB_USER}"

# Pre-configure MLflow tracking URI
ENV MLFLOW_TRACKING_URI=https://mlflow.example.com
```

## Step 4: Configure Resource Quotas

```bash
# Limit JupyterHub to a resource budget
kubectl apply -f - << 'EOF'
apiVersion: v1
kind: ResourceQuota
metadata:
  name: jupyter-quota
  namespace: jupyterhub
spec:
  hard:
    requests.cpu: "40"        # Max 40 CPUs total
    requests.memory: "80Gi"   # Max 80GB total
    requests.nvidia.com/gpu: "4"   # Max 4 GPUs total
EOF
```

## Conclusion

JupyterHub on Rancher provides a cost-effective alternative to cloud notebook services, with the flexibility to offer GPU-enabled environments alongside standard CPU environments. The culling configuration prevents idle notebook servers from consuming resources, and per-user persistent storage ensures notebooks survive server restarts.
