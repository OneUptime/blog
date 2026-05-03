# How to Deploy JupyterHub via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: JupyterHub, Portainer, Data Science, Python, Docker, Machine Learning, Jupyter

Description: Deploy JupyterHub using Portainer to provide a multi-user Jupyter notebook environment for data science teams, with persistent storage and configurable user profiles.

---

JupyterHub is the multi-user version of Jupyter Notebook, ideal for data science teams, academic courses, and ML model development. Deploying it via Portainer gives you a managed, scalable notebook platform with minimal operational overhead.

## Prerequisites

- Portainer with a Docker environment
- At least 4GB RAM on the host (more for multiple concurrent users)
- Persistent storage for user notebooks

## Step 1: Deploy JupyterHub via Portainer Stack

```yaml
# jupyterhub-stack.yml

version: "3.8"

services:
  jupyterhub:
    image: jupyterhub/jupyterhub:5.0
    # The base image does not include DockerSpawner or OAuthenticator,
    # so install them before launching the hub.
    command: sh -c "pip install --no-cache-dir dockerspawner oauthenticator && jupyterhub -f /srv/jupyterhub/jupyterhub_config.py"
    volumes:
      # Configuration file
      - /opt/jupyterhub/jupyterhub_config.py:/srv/jupyterhub/jupyterhub_config.py:ro
      # Docker socket for spawning user containers
      - /var/run/docker.sock:/var/run/docker.sock
      # Persistent user data
      - jupyterhub-data:/srv/jupyterhub
    ports:
      - "8000:8000"
    environment:
      - DOCKER_NETWORK_NAME=jupyterhub-net
    restart: unless-stopped
    networks:
      - jupyterhub-net

networks:
  jupyterhub-net:
    name: jupyterhub-net
    driver: bridge

volumes:
  jupyterhub-data:
```

## Step 2: Configure JupyterHub

Create the configuration file at `/opt/jupyterhub/jupyterhub_config.py`:

```python
# jupyterhub_config.py
from dockerspawner import DockerSpawner

# Use DockerSpawner to start each user in their own container
c.JupyterHub.spawner_class = DockerSpawner

# User notebook image - customize with your required libraries
# The Jupyter Docker Stacks images are now published to quay.io
c.DockerSpawner.image = "quay.io/jupyter/datascience-notebook:latest"

# Persist user home directories
c.DockerSpawner.notebook_dir = "/home/jovyan/work"
c.DockerSpawner.volumes = {
    "jupyterhub-user-{username}": "/home/jovyan/work"
}

# Network configuration
c.DockerSpawner.network_name = "jupyterhub-net"
c.DockerSpawner.use_internal_ip = True

# Resource limits per user
c.DockerSpawner.mem_limit = "4G"
c.DockerSpawner.cpu_limit = 2.0

# Authentication - use PAM (system users) or OAuth
c.JupyterHub.authenticator_class = "jupyterhub.auth.PAMAuthenticator"

# Admin users
c.Authenticator.admin_users = {"admin"}

# Allow any system user to log in
c.Authenticator.allow_all = True
```

## Step 3: Create a Custom Notebook Image

Build a custom image with your team's required libraries:

```dockerfile
# datascience-custom.Dockerfile
FROM quay.io/jupyter/datascience-notebook:latest

# Install additional Python packages for your team
RUN pip install --no-cache-dir \
    xgboost==2.0.3 \
    lightgbm==4.3.0 \
    catboost==1.2.3 \
    shap==0.44.1 \
    mlflow==2.10.0

# Install R packages
RUN R -e "install.packages(c('tidymodels', 'xgboost'), repos='https://cran.rstudio.com/')"

USER root
# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*
USER jovyan
```

Build and push this image to your registry, then update `c.DockerSpawner.image` in the config.

## Step 4: Set Up OAuth Authentication

For team environments, integrate with GitHub OAuth:

```python
# Add to jupyterhub_config.py
from oauthenticator.github import GitHubOAuthenticator

c.JupyterHub.authenticator_class = GitHubOAuthenticator
c.GitHubOAuthenticator.oauth_callback_url = "https://jupyter.example.com/hub/oauth_callback"
c.GitHubOAuthenticator.client_id = "your-github-client-id"
c.GitHubOAuthenticator.client_secret = "your-github-client-secret"

# Only allow members of specific GitHub org
c.GitHubOAuthenticator.allowed_organizations = {"your-org-name"}
```

## Step 5: Monitor Resource Usage

Use Portainer to view:
- The JupyterHub main container logs for login and spawn events
- Per-user spawned containers (they appear as individual containers in Portainer)
- Memory and CPU usage per user container

## Summary

JupyterHub on Portainer gives data science teams a self-managed notebook environment. Portainer handles the container lifecycle, and JupyterHub handles user isolation and authentication - a clean separation of concerns for platform teams.
