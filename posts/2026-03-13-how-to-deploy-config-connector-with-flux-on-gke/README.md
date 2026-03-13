# How to Deploy Config Connector with Flux on GKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, GCP, GKE, Config Connector, Infrastructure as Code, Workload Identity

Description: Learn how to install and configure Google Config Connector on GKE using Flux to manage GCP resources declaratively through Kubernetes manifests.

---

Google Config Connector is a Kubernetes add-on that lets you manage GCP resources through Kubernetes custom resources. Instead of using Terraform or `gcloud` commands, you define GCP resources like Cloud SQL instances, Pub/Sub topics, and IAM policies as Kubernetes manifests. When combined with Flux, you get a fully GitOps-driven workflow for managing both your applications and the underlying GCP infrastructure. This guide covers installing and configuring Config Connector on GKE using Flux.

## Prerequisites

Before you begin, ensure you have the following:

- A GKE cluster with Workload Identity enabled
- Flux installed on the cluster (v2.0 or later)
- Google Cloud CLI (`gcloud`) with project owner or editor permissions
- `kubectl` configured to access your GKE cluster
- A Git repository connected to Flux

## Step 1: Enable the Config Connector Add-on

If you are using a GKE Standard cluster, enable the Config Connector add-on:

```bash
gcloud container clusters update my-cluster \
  --region=us-central1 \
  --update-addons=ConfigConnector=ENABLED
```

For GKE Autopilot clusters, Config Connector is enabled differently. Check the GCP documentation for Autopilot-specific instructions.

Verify the Config Connector operator is running:

```bash
kubectl get pods -n configconnector-operator-system
```

## Step 2: Create a GCP Service Account for Config Connector

Create a service account that Config Connector will use to manage GCP resources:

```bash
gcloud iam service-accounts create config-connector \
  --display-name="Config Connector Service Account"
```

Grant the service account the permissions it needs. For broad resource management, you can assign the Editor role, but in production you should use more restrictive roles:

```bash
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:config-connector@my-project.iam.gserviceaccount.com" \
  --role="roles/editor"
```

## Step 3: Set Up Workload Identity for Config Connector

Bind the Config Connector Kubernetes service account to the GCP service account:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  config-connector@my-project.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-project.svc.id.goog[cnrm-system/cnrm-controller-manager]"
```

## Step 4: Configure Config Connector

Create a `ConfigConnectorContext` resource that tells Config Connector which GCP project to manage and how to authenticate. This is the resource you will manage through Flux:

```yaml
apiVersion: core.cnrm.cloud.google.com/v1beta1
kind: ConfigConnectorContext
metadata:
  name: configconnectorcontext.core.cnrm.cloud.google.com
  namespace: default
spec:
  googleServiceAccount: config-connector@my-project.iam.gserviceaccount.com
```

Save this as `config-connector-context.yaml` in your Git repository.

## Step 5: Create the Flux Kustomization for Config Connector Setup

Organize the Config Connector configuration in your Git repository:

```
clusters/production/config-connector/
  kustomization.yaml
  config-connector-context.yaml
```

Create the `kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - config-connector-context.yaml
```

Define the Flux Kustomization:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: config-connector-setup
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./clusters/production/config-connector
  prune: true
```

## Step 6: Manage GCP Resources with Config Connector

Once Config Connector is configured, you can define GCP resources as Kubernetes manifests. Here are several examples.

### Create a Cloud Storage Bucket

```yaml
apiVersion: storage.cnrm.cloud.google.com/v1beta1
kind: StorageBucket
metadata:
  name: my-app-data-bucket
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: my-project
spec:
  location: US-CENTRAL1
  uniformBucketLevelAccess: true
  versioning:
    enabled: true
```

### Create a Pub/Sub Topic and Subscription

```yaml
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubTopic
metadata:
  name: my-events-topic
  namespace: default
spec:
  messageRetentionDuration: "86400s"
---
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubSubscription
metadata:
  name: my-events-subscription
  namespace: default
spec:
  topicRef:
    name: my-events-topic
  ackDeadlineSeconds: 30
  messageRetentionDuration: "604800s"
```

### Create a Cloud SQL Instance

```yaml
apiVersion: sql.cnrm.cloud.google.com/v1beta1
kind: SQLInstance
metadata:
  name: my-app-db
  namespace: default
spec:
  databaseVersion: POSTGRES_15
  region: us-central1
  settings:
    tier: db-f1-micro
    ipConfiguration:
      privateNetworkRef:
        name: my-vpc
    backupConfiguration:
      enabled: true
      startTime: "03:00"
```

### Create an IAM Service Account

```yaml
apiVersion: iam.cnrm.cloud.google.com/v1beta1
kind: IAMServiceAccount
metadata:
  name: my-app-sa
  namespace: default
spec:
  displayName: My Application Service Account
```

## Step 7: Organize GCP Resources in Git

Structure your GCP resources alongside your application manifests:

```
clusters/production/
  config-connector/
    kustomization.yaml
    config-connector-context.yaml
  gcp-resources/
    kustomization.yaml
    storage-bucket.yaml
    pubsub.yaml
    sql-instance.yaml
    iam.yaml
  apps/
    kustomization.yaml
    my-app/
      deployment.yaml
      service.yaml
```

Create the Flux Kustomization for GCP resources with dependencies:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gcp-resources
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: config-connector-setup
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./clusters/production/gcp-resources
  prune: true
```

The `dependsOn` field ensures Config Connector is fully set up before Flux tries to create GCP resources.

## Step 8: Monitor Resource Status

Config Connector resources have a `status` field that reflects the state of the underlying GCP resource. Check the status of your resources:

```bash
kubectl get storagebuckets -n default
kubectl get sqlinstances -n default
kubectl get pubsubtopics -n default
```

For detailed status including any errors:

```bash
kubectl describe storagebucket my-app-data-bucket -n default
```

Look for the `Ready` condition:

```bash
kubectl get storagebucket my-app-data-bucket -n default -o jsonpath='{.status.conditions[?(@.type=="Ready")]}'
```

## Step 9: Handle Resource Dependencies

Some GCP resources depend on others. Use Config Connector resource references to express these dependencies:

```yaml
apiVersion: sql.cnrm.cloud.google.com/v1beta1
kind: SQLDatabase
metadata:
  name: my-database
  namespace: default
spec:
  instanceRef:
    name: my-app-db
  charset: UTF8
```

The `instanceRef` creates an implicit dependency on the `SQLInstance` resource. Config Connector will wait for the instance to be ready before creating the database.

## Troubleshooting

### Common Issues

**Error: Config Connector not ready**: Check the Config Connector operator pods are running and the `ConfigConnectorContext` is applied:

```bash
kubectl get configconnectorcontext -n default
kubectl get pods -n cnrm-system
```

**Error: permission denied creating resources**: The GCP service account may lack the required IAM roles. Check which role is needed for the specific resource type and add it:

```bash
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:config-connector@my-project.iam.gserviceaccount.com" \
  --role="roles/cloudsql.admin"
```

**Resource stuck in Updating state**: Some GCP resources (like Cloud SQL instances) take several minutes to provision. Check the GCP Console to see if the operation is still in progress.

**Prune deletes GCP resources**: When `prune: true` is set on the Flux Kustomization, removing a manifest from Git will delete the corresponding GCP resource. Use the `cnrm.cloud.google.com/deletion-policy: abandon` annotation on resources you want to keep even if the manifest is removed:

```yaml
metadata:
  annotations:
    cnrm.cloud.google.com/deletion-policy: abandon
```

## Summary

Config Connector bridges the gap between Kubernetes and GCP resource management, and Flux provides the GitOps automation layer on top. By defining GCP resources as Kubernetes manifests in a Git repository, you get version control, pull request reviews, and automated reconciliation for your cloud infrastructure. This approach unifies application and infrastructure management under a single GitOps workflow, reducing tool sprawl and improving consistency.
