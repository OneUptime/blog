# How to Debug ImagePullBackOff Errors in GKE When Using Artifact Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Artifact Registry, Kubernetes, Troubleshooting, Container Images

Description: A practical guide to diagnosing and fixing ImagePullBackOff errors in GKE when pulling container images from Google Artifact Registry.

---

You deploy a workload to GKE, check the pod status, and there it is - `ImagePullBackOff`. Your pod is stuck in a loop, unable to pull the container image from Artifact Registry. This is one of the most common issues GKE users run into, and it can be caused by a surprising number of different problems.

Let me walk you through a systematic approach to diagnosing and fixing this error.

## Understanding the Error

When a pod reports `ImagePullBackOff`, it means Kubernetes tried to pull the container image and failed. After the initial failure (`ErrImagePull`), Kubernetes backs off exponentially before retrying - hence "BackOff." The underlying cause could be anything from a typo in the image name to a permissions issue.

Start by getting the details of the failing pod:

```bash
# Get detailed information about the pod, including the error message
kubectl describe pod my-failing-pod -n my-namespace
```

Look at the Events section at the bottom. You will see messages like:

```
Failed to pull image "us-docker.pkg.dev/my-project/my-repo/my-image:v1.0":
rpc error: code = Unknown desc = failed to pull and unpack image...
```

The specific error message tells you a lot about what went wrong.

## Cause 1: Wrong Image Path

The most common cause is simply a typo or wrong path. Artifact Registry image paths follow this format:

```
REGION-docker.pkg.dev/PROJECT-ID/REPOSITORY-NAME/IMAGE-NAME:TAG
```

Every part of this path matters. Double check each piece:

```bash
# List repositories in your project to verify the repository name
gcloud artifacts repositories list --location=us

# List images in a specific repository to verify the image exists
gcloud artifacts docker images list us-docker.pkg.dev/my-project/my-repo

# List tags for a specific image to verify the tag exists
gcloud artifacts docker tags list us-docker.pkg.dev/my-project/my-repo/my-image
```

Common mistakes include using `gcr.io` format when the image is in Artifact Registry, mixing up the region prefix, or referencing a tag that does not exist.

## Cause 2: IAM Permissions

GKE nodes need the `roles/artifactregistry.reader` role to pull images from Artifact Registry. The way this works depends on whether you are using Workload Identity or the default node service account.

Check what service account your nodes are using:

```bash
# Check the service account configured on the node pool
gcloud container node-pools describe default-pool \
  --cluster my-cluster \
  --zone us-central1-a \
  --format="value(config.serviceAccount)"
```

If it shows `default`, the nodes are using the Compute Engine default service account. Grant it Artifact Registry reader access:

```bash
# Grant the default compute service account read access to Artifact Registry
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:123456789-compute@developer.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"
```

If you are using Workload Identity, you need to grant the role to the Google service account that your Kubernetes service account is bound to.

## Cause 3: Missing OAuth Scopes

Even if IAM permissions are correct, the GKE node pool needs the right OAuth scopes to access Artifact Registry. The default scope for new clusters usually includes `devstorage.read_only`, but older clusters or clusters created with minimal scopes might not have it.

Check the current scopes:

```bash
# Check the OAuth scopes on the node pool
gcloud container node-pools describe default-pool \
  --cluster my-cluster \
  --zone us-central1-a \
  --format="yaml(config.oauthScopes)"
```

You need at least `https://www.googleapis.com/auth/devstorage.read_only` or the broader `https://www.googleapis.com/auth/cloud-platform`. If the scopes are missing, you cannot change them on an existing node pool - you need to create a new one:

```bash
# Create a new node pool with proper scopes for Artifact Registry access
gcloud container node-pools create new-pool \
  --cluster my-cluster \
  --zone us-central1-a \
  --scopes="https://www.googleapis.com/auth/cloud-platform" \
  --num-nodes=3
```

Then migrate your workloads and delete the old pool.

## Cause 4: Cross-Project Image Access

If your Artifact Registry repository is in a different project than your GKE cluster, you need to explicitly grant the node service account access to the remote project's registry.

```bash
# Grant the node service account access to Artifact Registry in another project
gcloud projects add-iam-policy-binding image-project \
  --member="serviceAccount:123456789-compute@developer.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"
```

Replace `image-project` with the project that hosts the Artifact Registry repository.

## Cause 5: Private GKE Cluster Without Internet Access

If you are running a private GKE cluster, the nodes might not have internet access. If your Artifact Registry is set up with standard access, the nodes need to reach `REGION-docker.pkg.dev` over the network.

You have two options. First, you can set up Private Google Access on the subnet:

```bash
# Enable Private Google Access so private nodes can reach Google APIs
gcloud compute networks subnets update my-subnet \
  --region us-central1 \
  --enable-private-google-access
```

Second, you can set up a Cloud NAT if you need broader internet access from your nodes.

## Cause 6: Image Does Not Exist

Sometimes the image genuinely does not exist. Maybe the CI pipeline failed to push it, or it was pushed to a different repository.

Verify the image exists and is accessible:

```bash
# Try to describe the image to confirm it exists and you can access it
gcloud artifacts docker images describe \
  us-docker.pkg.dev/my-project/my-repo/my-image:v1.0
```

If this fails, the image was never pushed or was deleted.

## Cause 7: VPC Service Controls

If your organization uses VPC Service Controls, Artifact Registry might be inside a service perimeter that blocks access from your GKE cluster's project. You will see an error message that includes something about a "service perimeter."

Work with your organization admin to add your GKE project to the same service perimeter or create an ingress rule that allows access.

## A Debugging Checklist

Here is the order I follow when debugging ImagePullBackOff with Artifact Registry:

```bash
# Step 1: Get the exact error message
kubectl describe pod my-pod | grep -A 10 "Events"

# Step 2: Verify the image path is correct
gcloud artifacts docker images list us-docker.pkg.dev/my-project/my-repo

# Step 3: Check node service account permissions
gcloud projects get-iam-policy my-project \
  --flatten="bindings[].members" \
  --filter="bindings.members:compute@developer.gserviceaccount.com"

# Step 4: Test pulling the image from a node directly (if SSH is available)
gcloud compute ssh my-node -- "docker pull us-docker.pkg.dev/my-project/my-repo/my-image:v1.0"
```

## Preventing Future Issues

Once you have fixed the immediate problem, consider putting some guardrails in place. Use a CI/CD pipeline that validates the image exists before updating the Kubernetes manifest. Pin images to specific digests instead of mutable tags like `latest`. And set up monitoring to alert when pods enter the ImagePullBackOff state - catching these failures early saves a lot of debugging time later.

ImagePullBackOff errors are frustrating because they stop your deployments cold, but they are almost always caused by one of the issues listed above. Work through them systematically and you will have your pods running in no time.
