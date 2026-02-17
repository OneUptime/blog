# How to Set Up GKE Fleet Management to Manage Multiple Clusters from a Central Hub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Fleet Management, Multi-Cluster, Kubernetes, Cluster Management

Description: Learn how to use GKE Fleet Management to register, organize, and manage multiple Kubernetes clusters from a single central hub with consistent policies.

---

When you have one GKE cluster, managing it is straightforward. When you have five, ten, or fifty clusters spread across regions and environments, things get complicated fast. Each cluster has its own configuration, its own policies, and its own drift over time. Keeping them consistent becomes a full-time job.

GKE Fleet Management addresses this by letting you group clusters into a fleet and manage them as a logical unit. You can apply consistent policies, view all clusters from a single pane of glass, and use fleet-level features like Config Sync, Policy Controller, and multi-cluster services.

## What Is a Fleet?

A fleet is a logical grouping of Kubernetes clusters that you manage together. Every GCP project has one fleet by default. Clusters in the same fleet can share configurations, enforce common policies, and use fleet-level features.

Fleets are not limited to GKE clusters. You can register EKS clusters, AKS clusters, and even on-premises clusters. But GKE clusters get the deepest integration.

## Registering Clusters to a Fleet

GKE clusters are registered to their project fleet automatically when you use the fleet API. For existing clusters, you need to register them explicitly.

Register a GKE cluster to the fleet:

```bash
# Register an existing GKE cluster with the project's fleet
gcloud container clusters update production-us \
  --zone us-central1-a \
  --fleet-project=my-project
```

Register another cluster in a different region:

```bash
# Register a second cluster in a different region
gcloud container clusters update production-eu \
  --zone europe-west1-b \
  --fleet-project=my-project
```

Verify the registrations:

```bash
# List all clusters registered in the fleet
gcloud container fleet memberships list --project=my-project
```

You should see both clusters listed with their full resource names.

## Fleet-Level Features

Once clusters are in a fleet, you can enable fleet-level features that apply across all of them.

### Config Sync

Config Sync keeps cluster configuration in sync with a Git repository. Enable it for the fleet:

```bash
# Enable Config Sync across the fleet
gcloud beta container fleet config-management enable --project=my-project
```

Then apply a configuration that tells all fleet clusters to sync from a Git repo:

```yaml
# config-sync.yaml - Fleet-wide Config Sync configuration
apiVersion: configmanagement.gke.io/v1
kind: ConfigManagement
metadata:
  name: config-management
spec:
  configSync:
    enabled: true
    sourceFormat: unstructured
    git:
      syncRepo: https://github.com/my-org/cluster-config
      syncBranch: main
      secretType: none
      policyDir: /config
```

Apply this to all clusters in the fleet:

```bash
# Apply Config Sync settings to a specific fleet member
gcloud beta container fleet config-management apply \
  --membership=production-us \
  --config=config-sync.yaml \
  --project=my-project
```

### Policy Controller

Policy Controller lets you enforce policies across all fleet clusters. It is based on Open Policy Agent (OPA) and uses constraint templates.

Enable Policy Controller:

```bash
# Enable Policy Controller for the fleet
gcloud beta container fleet config-management apply \
  --membership=production-us \
  --config=/dev/stdin \
  --project=my-project <<EOF
apiVersion: configmanagement.gke.io/v1
kind: ConfigManagement
metadata:
  name: config-management
spec:
  policyController:
    enabled: true
    templateLibraryInstalled: true
EOF
```

Now you can create constraints that apply across clusters. For example, requiring all containers to have resource limits:

```yaml
# require-resource-limits.yaml - Enforce resource limits on all pods
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sContainerLimits
metadata:
  name: require-container-limits
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
      - gke-system
  parameters:
    cpu: "2"
    memory: "4Gi"
```

## Viewing Fleet Status

The fleet dashboard in the Cloud Console gives you an overview of all your clusters. You can also check status from the command line:

```bash
# Get the status of all fleet memberships
gcloud container fleet memberships list --project=my-project

# Get detailed information about a specific membership
gcloud container fleet memberships describe production-us \
  --project=my-project \
  --location=us-central1-a
```

Check the overall fleet feature status:

```bash
# List all features enabled on the fleet
gcloud container fleet features list --project=my-project
```

## Fleet Scopes and Namespaces

Fleet scopes let you organize clusters into sub-groups. For example, you might have a "production" scope and a "staging" scope, each containing different clusters.

Create a fleet scope:

```bash
# Create a fleet scope for production clusters
gcloud container fleet scopes create production --project=my-project
```

Add clusters to the scope:

```bash
# Add a cluster to the production scope
gcloud container fleet memberships bindings create prod-us-binding \
  --membership=production-us \
  --scope=production \
  --project=my-project \
  --location=global
```

Fleet scopes also support fleet namespaces, which let you define namespaces that are automatically created across all clusters in a scope:

```bash
# Create a fleet namespace that will exist in all production scope clusters
gcloud container fleet scopes namespaces create app-team \
  --scope=production \
  --project=my-project
```

## Multi-Cluster Services

With fleet management, you can set up multi-cluster services that route traffic across clusters:

```bash
# Enable multi-cluster services for the fleet
gcloud container fleet multi-cluster-services enable --project=my-project
```

Grant the required IAM roles:

```bash
# Grant the MCS service account the required permissions
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:my-project.svc.id.goog[gke-mcs/gke-mcs-importer]" \
  --role="roles/compute.networkViewer"
```

Then export a service from one cluster so other clusters can discover it:

```yaml
# service-export.yaml - Export a service for multi-cluster discovery
apiVersion: net.gke.io/v1
kind: ServiceExport
metadata:
  name: my-service
  namespace: default
```

## Using Terraform for Fleet Management

Here is how to set up fleet membership and features with Terraform:

```hcl
# Fleet membership for a GKE cluster
resource "google_gke_hub_membership" "production_us" {
  membership_id = "production-us"
  project       = "my-project"

  endpoint {
    gke_cluster {
      resource_link = google_container_cluster.production_us.id
    }
  }
}

# Enable Config Management feature
resource "google_gke_hub_feature" "configmanagement" {
  name     = "configmanagement"
  project  = "my-project"
  location = "global"
}
```

## Best Practices for Fleet Management

Keep your fleet organized by using a clear naming convention for memberships. Include the environment and region in the name, like `prod-us-central1` or `staging-europe-west1`.

Start with Config Sync before adding Policy Controller. Get your clusters consistently configured first, then add policy enforcement. Trying to do both at once can lead to a frustrating cycle of policy violations blocking legitimate changes.

Use fleet scopes to separate environments. Do not mix production and development clusters in the same scope, as the policies and configurations they need are likely quite different.

Monitor fleet health regularly. The fleet dashboard shows you which clusters are out of sync, which have policy violations, and which features are having issues. Make it part of your daily operational routine.

Fleet management is about bringing order to multi-cluster chaos. It takes some upfront effort to set up, but once your clusters are managed through a fleet, you spend less time on repetitive configuration work and more time on building features.
