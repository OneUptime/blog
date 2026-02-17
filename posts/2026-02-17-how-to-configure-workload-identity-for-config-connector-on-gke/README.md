# How to Configure Workload Identity for Config Connector on GKE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Config Connector, Workload Identity, Kubernetes, IAM

Description: A practical guide to configuring Workload Identity for Config Connector on GKE so your Kubernetes-managed GCP resources authenticate securely without service account keys.

---

Config Connector on GKE lets you manage Google Cloud resources using Kubernetes manifests, but it needs a way to authenticate with GCP APIs. The recommended approach is Workload Identity, which eliminates the need for exported service account keys and provides a much more secure authentication path.

In this guide, I will show you exactly how to set up Workload Identity for Config Connector, covering both cluster-mode and namespaced-mode configurations.

## Why Workload Identity Matters for Config Connector

Without Workload Identity, you would need to create a JSON key for a GCP service account and store it as a Kubernetes secret. That approach has several problems: key rotation is manual, keys can leak, and they never expire on their own.

Workload Identity solves this by creating a trust relationship between a Kubernetes service account and a GCP service account. When a pod runs with a specific Kubernetes service account, GKE automatically provides it with short-lived credentials for the corresponding GCP service account. No keys to manage, no secrets to rotate.

Config Connector relies heavily on this mechanism. The controller pods need to call GCP APIs to create and manage resources, and Workload Identity is how they get the credentials to do so.

## Prerequisites

You will need:

- A GKE cluster with Workload Identity enabled
- The gcloud CLI installed and authenticated
- kubectl configured for your cluster
- Project Owner or IAM Admin role on the GCP project

Make sure the required APIs are enabled.

```bash
# Enable the APIs needed for Workload Identity and Config Connector
gcloud services enable \
  container.googleapis.com \
  iam.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project=my-project-id
```

## Step 1: Enable Workload Identity on the Cluster

If your cluster does not already have Workload Identity enabled, update it now.

```bash
# Enable Workload Identity on the GKE cluster
gcloud container clusters update my-cluster \
  --region=us-central1 \
  --workload-pool=my-project-id.svc.id.goog \
  --project=my-project-id
```

For new clusters, include it during creation.

```bash
# Create a new cluster with Workload Identity and Config Connector
gcloud container clusters create my-cluster \
  --region=us-central1 \
  --workload-pool=my-project-id.svc.id.goog \
  --addons=ConfigConnector \
  --project=my-project-id
```

The workload pool format is always `PROJECT_ID.svc.id.goog`. This creates the identity namespace that maps Kubernetes service accounts to GCP service accounts.

## Step 2: Create the GCP Service Account

Config Connector needs a dedicated GCP service account. This account will hold the IAM permissions that Config Connector uses to manage resources.

```bash
# Create a dedicated service account for Config Connector
gcloud iam service-accounts create cnrm-system-sa \
  --display-name="Config Connector SA" \
  --project=my-project-id
```

## Step 3: Assign IAM Roles

The service account needs permissions to manage whatever GCP resources you plan to control through Config Connector. For a development environment, the Editor role covers most things.

```bash
# Grant Editor role for broad resource management permissions
gcloud projects add-iam-policy-binding my-project-id \
  --member="serviceAccount:cnrm-system-sa@my-project-id.iam.gserviceaccount.com" \
  --role="roles/editor"
```

For production, use the principle of least privilege. Grant only the roles needed for the specific resources you will manage.

```bash
# Example: Grant only the roles needed for Cloud SQL and Storage management
gcloud projects add-iam-policy-binding my-project-id \
  --member="serviceAccount:cnrm-system-sa@my-project-id.iam.gserviceaccount.com" \
  --role="roles/cloudsql.admin"

gcloud projects add-iam-policy-binding my-project-id \
  --member="serviceAccount:cnrm-system-sa@my-project-id.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

## Step 4: Create the Workload Identity Binding

This is the critical step. You need to tell GCP that the Config Connector Kubernetes service account is allowed to impersonate the GCP service account.

For cluster-mode Config Connector, the Kubernetes service account is `cnrm-controller-manager` in the `cnrm-system` namespace.

```bash
# Bind the GCP SA to the Config Connector K8s SA via Workload Identity
gcloud iam service-accounts add-iam-policy-binding \
  cnrm-system-sa@my-project-id.iam.gserviceaccount.com \
  --member="serviceAccount:my-project-id.svc.id.goog[cnrm-system/cnrm-controller-manager]" \
  --role="roles/iam.workloadIdentityUser" \
  --project=my-project-id
```

The member format breaks down like this: `PROJECT_ID.svc.id.goog[K8S_NAMESPACE/K8S_SERVICE_ACCOUNT]`. This tells GCP that any pod running as the `cnrm-controller-manager` service account in the `cnrm-system` namespace is allowed to act as `cnrm-system-sa`.

## Step 5: Configure Config Connector to Use the Service Account

Now apply a ConfigConnectorContext resource that references the GCP service account.

For cluster-mode (one service account for all namespaces):

```yaml
# cluster-mode-context.yaml
# Configures Config Connector in cluster mode with a single service account
apiVersion: core.cnrm.cloud.google.com/v1beta1
kind: ConfigConnectorContext
metadata:
  name: configconnectorcontext.core.cnrm.cloud.google.com
  namespace: default
spec:
  googleServiceAccount: "cnrm-system-sa@my-project-id.iam.gserviceaccount.com"
```

Apply it.

```bash
# Apply the Config Connector context configuration
kubectl apply -f cluster-mode-context.yaml
```

## Namespaced Mode Configuration

In namespaced mode, each namespace gets its own GCP service account. This is useful for multi-tenant clusters where different teams manage different GCP projects.

First, create separate GCP service accounts for each namespace.

```bash
# Create service accounts for each team namespace
gcloud iam service-accounts create team-a-cnrm-sa \
  --display-name="Config Connector SA for Team A" \
  --project=team-a-project-id

gcloud iam service-accounts create team-b-cnrm-sa \
  --display-name="Config Connector SA for Team B" \
  --project=team-b-project-id
```

Create the Workload Identity bindings for each. In namespaced mode, Config Connector creates per-namespace controller service accounts with the naming pattern `cnrm-controller-manager-NAMESPACE`.

```bash
# Bind Workload Identity for team-a namespace
gcloud iam service-accounts add-iam-policy-binding \
  team-a-cnrm-sa@team-a-project-id.iam.gserviceaccount.com \
  --member="serviceAccount:my-project-id.svc.id.goog[cnrm-system/cnrm-controller-manager-team-a]" \
  --role="roles/iam.workloadIdentityUser"

# Bind Workload Identity for team-b namespace
gcloud iam service-accounts add-iam-policy-binding \
  team-b-cnrm-sa@team-b-project-id.iam.gserviceaccount.com \
  --member="serviceAccount:my-project-id.svc.id.goog[cnrm-system/cnrm-controller-manager-team-b]" \
  --role="roles/iam.workloadIdentityUser"
```

Then create ConfigConnectorContext resources in each namespace.

```yaml
# team-a-context.yaml
apiVersion: core.cnrm.cloud.google.com/v1beta1
kind: ConfigConnectorContext
metadata:
  name: configconnectorcontext.core.cnrm.cloud.google.com
  namespace: team-a
spec:
  googleServiceAccount: "team-a-cnrm-sa@team-a-project-id.iam.gserviceaccount.com"
```

## Verifying the Setup

Check that the Config Connector pods are running and using Workload Identity correctly.

```bash
# Verify Config Connector pods are healthy
kubectl get pods -n cnrm-system

# Check the service account annotation on the controller pod
kubectl get serviceaccount cnrm-controller-manager -n cnrm-system -o yaml
```

The service account should have an annotation like `iam.gke.io/gcp-service-account: cnrm-system-sa@my-project-id.iam.gserviceaccount.com`.

Test with a simple resource creation.

```yaml
# test-bucket.yaml
apiVersion: storage.cnrm.cloud.google.com/v1beta1
kind: StorageBucket
metadata:
  name: wi-test-bucket-12345
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  location: US
```

```bash
# Apply and check the test resource
kubectl apply -f test-bucket.yaml
kubectl wait --for=condition=Ready storagebucket/wi-test-bucket-12345 --timeout=120s
```

## Troubleshooting

**Permission denied on resource creation**: Verify the GCP service account has the right IAM roles. Check with `gcloud projects get-iam-policy my-project-id`.

**Workload Identity not working**: Make sure the node pool has the GKE metadata server enabled. Older node pools might need updating.

```bash
# Update node pool to use GKE metadata server for Workload Identity
gcloud container node-pools update default-pool \
  --cluster=my-cluster \
  --region=us-central1 \
  --workload-metadata=GKE_METADATA
```

**Binding mismatch**: Double-check that the member string in the IAM binding matches exactly. The namespace and service account name must be correct.

## Summary

Workload Identity is the secure, key-free way to give Config Connector the permissions it needs to manage GCP resources. The setup involves creating a GCP service account, granting it the right IAM roles, binding it to the Config Connector Kubernetes service account, and configuring a ConfigConnectorContext resource. Whether you use cluster mode or namespaced mode depends on whether you need isolation between teams or projects.
