# How to Install Dapr on Google Kubernetes Engine (GKE)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GKE, Google Cloud, Kubernetes, Installation

Description: Install Dapr on Google Kubernetes Engine with Helm, configure Workload Identity for secure component authentication, and enable high-availability mode.

---

## Prerequisites

```bash
# Install Google Cloud SDK
gcloud auth login
gcloud config set project my-project-id

# Install Dapr CLI
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash

# Install Helm 3
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## Create a GKE Cluster

```bash
gcloud container clusters create dapr-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n2-standard-4 \
  --workload-pool=my-project-id.svc.id.goog \
  --enable-ip-alias

gcloud container clusters get-credentials dapr-cluster --zone us-central1-a
```

## Install Dapr on GKE with Helm

```bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update

kubectl create namespace dapr-system

helm install dapr dapr/dapr \
  --namespace dapr-system \
  --set global.ha.enabled=true \
  --wait

# Verify
dapr status -k
```

## Configure GCP Pub/Sub Component

Use GKE Workload Identity to authenticate the Dapr Pub/Sub component to GCP:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.gcp.pubsub
  version: v1
  metadata:
  - name: projectId
    value: "my-project-id"
```

## Set Up Workload Identity for Dapr

```bash
# Create a GCP service account for Dapr components
gcloud iam service-accounts create dapr-sa \
  --display-name "Dapr Service Account"

# Grant GCP Pub/Sub permissions
gcloud projects add-iam-policy-binding my-project-id \
  --member "serviceAccount:dapr-sa@my-project-id.iam.gserviceaccount.com" \
  --role "roles/pubsub.editor"

# Bind the GCP SA to the Kubernetes SA
gcloud iam service-accounts add-iam-policy-binding \
  dapr-sa@my-project-id.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-project-id.svc.id.goog[default/my-app-sa]"
```

## Annotate Kubernetes Service Account

```bash
kubectl annotate serviceaccount my-app-sa \
  --namespace default \
  iam.gke.io/gcp-service-account=dapr-sa@my-project-id.iam.gserviceaccount.com
```

## Enable Dapr Dashboard

```bash
dapr dashboard -k -p 9999
```

## Summary

Installing Dapr on GKE with Helm and HA mode provides a production-ready distributed runtime for microservices. Workload Identity eliminates the need for service account key files, providing secure and auditable access to GCP services like Pub/Sub and Firestore through Dapr components.
