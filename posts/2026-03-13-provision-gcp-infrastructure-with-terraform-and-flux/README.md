# How to Provision GCP Infrastructure with Terraform and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Tofu Controller, Terraform, GCP, Google Cloud, GitOps, Kubernetes

Description: Provision GCP infrastructure using Terraform via the Tofu Controller with Flux CD for fully GitOps-managed Google Cloud resource provisioning.

---

## Introduction

Google Cloud Platform's Terraform provider (`hashicorp/google`) is one of the most feature-complete cloud providers in the Terraform ecosystem. Combining it with the Tofu Controller and Flux CD brings continuous reconciliation to GCP infrastructure. VPCs, GKE clusters, Cloud SQL databases, and Cloud Storage buckets become GitOps-managed resources that are continuously reconciled against their desired state.

GCP's strong IAM capabilities and Workload Identity support make it an excellent fit for the Tofu Controller pattern. When running on GKE, runner pods can authenticate to GCP using Workload Identity rather than service account key files, eliminating the need to manage long-lived credentials.

This guide provisions a complete GCP environment: a VPC, a GKE cluster, and a Cloud SQL database.

## Prerequisites

- Tofu Controller installed via Flux
- A GCP service account with appropriate permissions
- A Git repository with Terraform modules
- `kubectl`, `flux`, and `gcloud` CLIs installed

## Step 1: Create GCP Credentials Secret

```bash
# Create a service account for Terraform
gcloud iam service-accounts create terraform-runner \
  --display-name="Terraform Runner" \
  --project="my-gcp-project"

# Grant necessary roles
gcloud projects add-iam-policy-binding my-gcp-project \
  --member="serviceAccount:terraform-runner@my-gcp-project.iam.gserviceaccount.com" \
  --role="roles/editor"

# Create and encode the key
gcloud iam service-accounts keys create /tmp/gcp-terraform-key.json \
  --iam-account="terraform-runner@my-gcp-project.iam.gserviceaccount.com"

# Create the Kubernetes Secret
kubectl create secret generic terraform-gcp-credentials \
  --namespace flux-system \
  --from-file=credentials.json=/tmp/gcp-terraform-key.json

rm /tmp/gcp-terraform-key.json
```

## Step 2: Provision the GCP Network

```yaml
# infrastructure/terraform/gcp/01-networking.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: gcp-production-networking
  namespace: flux-system
spec:
  interval: 15m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/gcp/networking
  workspace: gcp-production-networking
  approvePlan: "manual"

  backendConfig:
    customConfiguration: |
      backend "gcs" {
        bucket = "my-org-terraform-state"
        prefix = "production/gcp/networking"
      }

  runnerPodTemplate:
    spec:
      env:
        - name: GOOGLE_CREDENTIALS
          valueFrom:
            secretKeyRef:
              name: terraform-gcp-credentials
              key: credentials.json

  vars:
    - name: project_id
      value: my-gcp-project
    - name: region
      value: us-central1
    - name: vpc_name
      value: production-vpc
    - name: subnet_cidr
      value: "10.0.0.0/20"
    - name: pods_cidr
      value: "10.4.0.0/14"
    - name: services_cidr
      value: "10.8.0.0/20"
    - name: environment
      value: production

  writeOutputsToSecret:
    name: gcp-networking-outputs
    outputs:
      - vpc_name
      - subnet_name
      - subnet_self_link
      - pods_ip_range_name
      - services_ip_range_name
```

## Step 3: Provision the GKE Cluster

```yaml
# infrastructure/terraform/gcp/02-gke.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: gcp-production-gke
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/gcp/gke
  workspace: gcp-production-gke
  approvePlan: "manual"
  runnerTerminationGracePeriodSeconds: 2400

  backendConfig:
    customConfiguration: |
      backend "gcs" {
        bucket = "my-org-terraform-state"
        prefix = "production/gcp/gke"
      }

  runnerPodTemplate:
    spec:
      env:
        - name: GOOGLE_CREDENTIALS
          valueFrom:
            secretKeyRef:
              name: terraform-gcp-credentials
              key: credentials.json

  varsFrom:
    - kind: Secret
      name: gcp-networking-outputs
      varsKeys:
        - vpc_name
        - subnet_name
        - pods_ip_range_name
        - services_ip_range_name

  vars:
    - name: project_id
      value: my-gcp-project
    - name: region
      value: us-central1
    - name: cluster_name
      value: production-gke
    - name: kubernetes_version
      value: "1.29"
    - name: node_machine_type
      value: n2-standard-4
    - name: initial_node_count
      value: "3"
    - name: min_node_count
      value: "2"
    - name: max_node_count
      value: "10"
    - name: enable_workload_identity
      value: "true"
    - name: enable_private_nodes
      value: "true"
    - name: master_ipv4_cidr
      value: "172.16.0.0/28"
    - name: environment
      value: production

  writeOutputsToSecret:
    name: gcp-gke-outputs
    outputs:
      - cluster_name
      - cluster_endpoint
      - cluster_ca_certificate
      - workload_identity_pool
```

## Step 4: Provision Cloud SQL

```yaml
# infrastructure/terraform/gcp/03-cloudsql.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: gcp-production-cloudsql
  namespace: flux-system
spec:
  interval: 15m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/gcp/cloudsql
  workspace: gcp-production-cloudsql
  approvePlan: "manual"

  backendConfig:
    customConfiguration: |
      backend "gcs" {
        bucket = "my-org-terraform-state"
        prefix = "production/gcp/cloudsql"
      }

  runnerPodTemplate:
    spec:
      env:
        - name: GOOGLE_CREDENTIALS
          valueFrom:
            secretKeyRef:
              name: terraform-gcp-credentials
              key: credentials.json

  varsFrom:
    - kind: Secret
      name: gcp-networking-outputs
      varsKeys:
        - vpc_name
    - kind: Secret
      name: terraform-production-sensitive-vars
      varsKeys:
        - db_master_password

  vars:
    - name: project_id
      value: my-gcp-project
    - name: region
      value: us-central1
    - name: instance_name
      value: production-postgres
    - name: database_version
      value: POSTGRES_15
    - name: tier
      value: db-custom-4-15360
    - name: availability_type
      value: REGIONAL
    - name: disk_size
      value: "100"
    - name: enable_private_ip
      value: "true"
    - name: enable_public_ip
      value: "false"
    - name: environment
      value: production

  writeOutputsToSecret:
    name: gcp-cloudsql-outputs
    outputs:
      - instance_name
      - private_ip_address
      - connection_name
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/terraform/gcp-infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gcp-infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/terraform/gcp
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: tofu-controller
```

## Best Practices

- Use a GCS bucket for Terraform state when provisioning GCP resources. It provides native integration with GCP IAM and supports state locking.
- Enable Workload Identity on GKE (`enable_workload_identity: true`) and use it for both the Tofu Controller runner pods and application workloads. This eliminates service account key files entirely.
- Enable private nodes (`enable_private_nodes: true`) and configure a master authorized networks CIDR to restrict access to the GKE control plane.
- Use the `REGIONAL` availability type for Cloud SQL production instances to enable automatic failover across zones.
- Separate network, compute, and database into distinct Terraform resources and workspaces for independent lifecycle management.

## Conclusion

A complete GCP infrastructure stack is now provisioned through Terraform modules managed by the Tofu Controller and Flux CD. Network, GKE, and Cloud SQL are continuously reconciled against their desired state, and infrastructure outputs chain between components via Kubernetes Secrets. The entire environment can be reproduced from Git alone, making disaster recovery and new environment creation straightforward.
