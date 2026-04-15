# How to Deploy Dapr with Google Cloud Deployment Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Google Cloud, GKE, Deployment Manager, Infrastructure as Code

Description: Deploy Dapr on Google Kubernetes Engine using Google Cloud Deployment Manager with Python templates for automated, repeatable GCP-native deployments.

---

## Google Cloud Deployment Manager for Dapr

Google Cloud Deployment Manager is GCP's native infrastructure-as-code service, allowing you to describe resources in YAML configurations with Python or Jinja2 templates. When deploying Dapr on GKE, Deployment Manager can provision the cluster and post-deploy scripts can handle the Dapr installation.

## Prerequisites

```bash
# Enable required APIs
gcloud services enable container.googleapis.com
gcloud services enable deploymentmanager.googleapis.com

# Set project
gcloud config set project YOUR_PROJECT_ID
```

## GKE Cluster Template

Create `dapr-gke.py` (Python Deployment Manager template):

```python
def GenerateConfig(context):
    cluster_name = context.properties.get('clusterName', 'dapr-cluster')
    zone = context.properties.get('zone', 'us-central1-a')
    node_count = context.properties.get('nodeCount', 3)
    machine_type = context.properties.get('machineType', 'e2-standard-4')

    resources = [
        {
            'name': cluster_name,
            'type': 'container.v1.cluster',
            'properties': {
                'zone': zone,
                'cluster': {
                    'name': cluster_name,
                    'initialNodeCount': node_count,
                    'nodeConfig': {
                        'machineType': machine_type,
                        'oauthScopes': [
                            'https://www.googleapis.com/auth/cloud-platform'
                        ],
                    },
                    'addonsConfig': {
                        'httpLoadBalancing': {'disabled': False},
                        'horizontalPodAutoscaling': {'disabled': False},
                    },
                    'loggingService': 'logging.googleapis.com/kubernetes',
                    'monitoringService': 'monitoring.googleapis.com/kubernetes',
                }
            }
        }
    ]

    return {'resources': resources}
```

## Deployment Configuration File

Create `dapr-deployment.yaml`:

```yaml
imports:
  - path: dapr-gke.py

resources:
  - name: dapr-gke-cluster
    type: dapr-gke.py
    properties:
      clusterName: dapr-production-cluster
      zone: us-central1-a
      nodeCount: 3
      machineType: e2-standard-4
```

## Deploy the Cluster

```bash
# Create the deployment
gcloud deployment-manager deployments create dapr-deployment \
  --config dapr-deployment.yaml

# Monitor deployment status
gcloud deployment-manager deployments describe dapr-deployment

# Get cluster credentials
gcloud container clusters get-credentials dapr-production-cluster \
  --zone us-central1-a
```

## Install Dapr After Cluster Creation

```bash
# Add Dapr Helm repo
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update

# Install Dapr
helm install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --version 1.13.0 \
  --set global.mtls.enabled=true \
  --set dapr_operator.replicaCount=2 \
  --set dapr_sentry.replicaCount=2 \
  --wait

# Verify
kubectl get pods -n dapr-system
```

## Automating with a Startup Script

Add a post-cluster startup script to the Deployment Manager template:

```python
startup_script = """#!/bin/bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm install dapr dapr/dapr --namespace dapr-system --create-namespace --version 1.13.0
"""
```

## Updating the Deployment

```bash
# Update the deployment (e.g., add nodes)
gcloud deployment-manager deployments update dapr-deployment \
  --config dapr-deployment-updated.yaml

# Preview changes first
gcloud deployment-manager deployments update dapr-deployment \
  --config dapr-deployment-updated.yaml \
  --preview
```

## Summary

Google Cloud Deployment Manager provides a GCP-native way to provision GKE clusters for Dapr workloads, with Python templates offering dynamic configuration logic. While Deployment Manager handles cluster provisioning, Helm (invoked via startup scripts or CI/CD) handles the Dapr installation, giving you a complete automated pipeline for GCP-based Dapr deployments.
