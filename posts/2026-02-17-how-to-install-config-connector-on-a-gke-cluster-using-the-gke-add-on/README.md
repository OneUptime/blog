# How to Install Config Connector on a GKE Cluster Using the GKE Add-On

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Config Connector, Kubernetes, Infrastructure as Code

Description: Learn how to install and configure Config Connector on a GKE cluster using the built-in GKE add-on to manage Google Cloud resources declaratively from Kubernetes.

---

If you have spent any time managing Google Cloud resources alongside Kubernetes workloads, you know the pain of juggling two completely different tools and workflows. You have kubectl for your cluster resources and gcloud or Terraform for your infrastructure. Config Connector bridges that gap by letting you manage GCP resources directly through Kubernetes custom resources.

In this post, I will walk you through installing Config Connector on a GKE cluster using the GKE add-on approach, which is the simplest and most supported method.

## What Is Config Connector?

Config Connector is a Kubernetes add-on that maps GCP resources to Kubernetes objects. Once installed, you can create, update, and delete GCP resources like Cloud SQL instances, Pub/Sub topics, storage buckets, and more - all using standard kubectl commands and YAML manifests.

The GKE add-on method is preferred over the manual installation because Google manages the lifecycle of the controller, handles upgrades, and ensures compatibility with your GKE version.

## Prerequisites

Before you begin, make sure you have the following ready:

- A GCP project with billing enabled
- The gcloud CLI installed and authenticated
- kubectl configured to interact with your cluster
- A GKE cluster running version 1.15 or later
- The following APIs enabled in your project: container.googleapis.com and cloudresourcemanager.googleapis.com

Let me show you how to enable those APIs if you have not already done so.

```bash
# Enable the required APIs for Config Connector
gcloud services enable container.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project=my-project-id
```

## Step 1: Create a GKE Cluster with Config Connector Enabled

If you are creating a new cluster, you can enable Config Connector right from the start. This saves you from having to update the cluster later.

```bash
# Create a new GKE cluster with Config Connector add-on enabled
gcloud container clusters create my-cluster \
  --region=us-central1 \
  --workload-pool=my-project-id.svc.id.goog \
  --addons=ConfigConnector \
  --project=my-project-id
```

Notice that `--workload-pool` is required. Config Connector uses Workload Identity to authenticate with GCP APIs, so you need Workload Identity enabled on the cluster. Without it, Config Connector will not be able to create or manage any GCP resources.

## Step 2: Enable Config Connector on an Existing Cluster

If you already have a GKE cluster running, you can enable the add-on on it. First, make sure Workload Identity is enabled.

```bash
# Enable Workload Identity on an existing cluster
gcloud container clusters update my-cluster \
  --region=us-central1 \
  --workload-pool=my-project-id.svc.id.goog \
  --project=my-project-id
```

Then enable the Config Connector add-on.

```bash
# Enable the Config Connector add-on on the existing cluster
gcloud container clusters update my-cluster \
  --region=us-central1 \
  --update-addons=ConfigConnector=ENABLED \
  --project=my-project-id
```

This might take a few minutes. GKE will install the Config Connector operator and the necessary CRDs into your cluster.

## Step 3: Create a Service Account for Config Connector

Config Connector needs a GCP service account to interact with GCP APIs on your behalf. Create one and grant it the permissions it needs.

```bash
# Create a service account for Config Connector
gcloud iam service-accounts create config-connector-sa \
  --display-name="Config Connector Service Account" \
  --project=my-project-id
```

Now grant it the necessary roles. For a broad setup, you can use the Editor role, but in production you should use more granular roles based on what resources you plan to manage.

```bash
# Grant the Editor role to the service account
gcloud projects add-iam-policy-binding my-project-id \
  --member="serviceAccount:config-connector-sa@my-project-id.iam.gserviceaccount.com" \
  --role="roles/editor"
```

## Step 4: Bind the Service Account to Workload Identity

Config Connector runs as a Kubernetes service account in the cnrm-system namespace. You need to bind your GCP service account to it using Workload Identity.

```bash
# Create the Workload Identity binding between the GCP SA and the K8s SA
gcloud iam service-accounts add-iam-policy-binding \
  config-connector-sa@my-project-id.iam.gserviceaccount.com \
  --member="serviceAccount:my-project-id.svc.id.goog[cnrm-system/cnrm-controller-manager]" \
  --role="roles/iam.workloadIdentityUser"
```

## Step 5: Create the ConfigConnector Resource

Now you need to tell Config Connector which GCP service account to use. You do this by creating a ConfigConnectorContext resource.

```yaml
# config-connector-context.yaml
# This tells Config Connector which service account and project to use
apiVersion: core.cnrm.cloud.google.com/v1beta1
kind: ConfigConnectorContext
metadata:
  name: configconnectorcontext.core.cnrm.cloud.google.com
  namespace: default
spec:
  googleServiceAccount: "config-connector-sa@my-project-id.iam.gserviceaccount.com"
```

Apply it to your cluster.

```bash
# Apply the ConfigConnectorContext to your cluster
kubectl apply -f config-connector-context.yaml
```

## Step 6: Verify the Installation

Give it a minute or two, then check that everything is running properly.

```bash
# Check that the Config Connector pods are running
kubectl get pods -n cnrm-system
```

You should see several pods in the Running state, including the controller manager and webhook pods. If any pods are in CrashLoopBackOff, check the logs for permission issues.

```bash
# Check the logs if something looks wrong
kubectl logs -n cnrm-system -l cnrm.cloud.google.com/component=cnrm-controller-manager
```

You can also verify that the CRDs were installed.

```bash
# List Config Connector CRDs to confirm installation
kubectl get crds | grep cnrm
```

This should return a long list of CRDs like storagebuckets.storage.cnrm.cloud.google.com, pubsubtopics.pubsub.cnrm.cloud.google.com, and many more.

## Step 7: Test with a Simple Resource

Let us create a simple Cloud Storage bucket to confirm everything works end to end.

```yaml
# test-bucket.yaml
# Create a simple GCS bucket to test Config Connector
apiVersion: storage.cnrm.cloud.google.com/v1beta1
kind: StorageBucket
metadata:
  name: my-test-bucket-config-connector
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  location: US
```

```bash
# Apply the test bucket manifest
kubectl apply -f test-bucket.yaml

# Check the status of the bucket resource
kubectl describe storagebucket my-test-bucket-config-connector
```

If the status shows "Ready" with condition "True", Config Connector is working. You can verify in the GCP Console that the bucket was actually created.

## Troubleshooting Common Issues

A few things can go wrong during setup. Here are the most common ones.

**Pods stuck in Pending state**: This usually means the cluster does not have enough resources. Config Connector needs some CPU and memory. Check your node pool sizing.

**Permission denied errors**: The GCP service account might not have the right roles. Check the IAM bindings and make sure the Workload Identity binding is correct.

**CRDs not appearing**: If you do not see any cnrm CRDs, the add-on might not be fully installed yet. Wait a few minutes and try again.

**ConfigConnectorContext not reconciling**: Make sure the namespace you specified in the ConfigConnectorContext exists and that the service account email is correct.

## Clean Up

If you are just testing and want to remove everything, delete the test bucket first, then disable the add-on.

```bash
# Delete the test bucket
kubectl delete storagebucket my-test-bucket-config-connector

# Disable Config Connector add-on
gcloud container clusters update my-cluster \
  --region=us-central1 \
  --update-addons=ConfigConnector=DISABLED \
  --project=my-project-id
```

## Wrapping Up

Installing Config Connector through the GKE add-on is the fastest way to start managing GCP resources from Kubernetes. The add-on approach offloads the upgrade and maintenance burden to Google, so you can focus on defining your infrastructure as Kubernetes manifests. Once you have it running, the next step is to explore Workload Identity configuration in more depth and start defining your actual infrastructure resources.
