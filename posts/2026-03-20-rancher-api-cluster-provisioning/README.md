# How to Automate Cluster Provisioning with Rancher API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, API, Automation, Cluster-provisioning, Terraform

Description: A practical guide to automating Kubernetes cluster provisioning using the Rancher API and Terraform, covering authentication, cluster creation, and post-provisioning configuration.

## Overview

Manually creating clusters through the Rancher UI is fine for occasional setups, but production environments require repeatable, automated provisioning. Rancher provides a comprehensive REST API and supports Terraform through the Rancher2 provider. This guide covers automating cluster provisioning using the Rancher API directly and through Terraform.

## Authentication

### Create an API Key

First, create a Rancher API key:

```text
Rancher UI → User Avatar → Account & API Keys → Create API Key
- Description: automation-key
- Expires: (set appropriate expiry)
- Scope: No scope restriction
```

```bash
# Store credentials for Rancher API and Terraform

export RANCHER_URL="https://rancher.example.com"
export RANCHER_ACCESS_KEY="token-xxxxx"
export RANCHER_SECRET_KEY="xxxxxxxxxxxxxxxxxx"
export RANCHER_BEARER_TOKEN="${RANCHER_ACCESS_KEY}:${RANCHER_SECRET_KEY}"
```

## Using the Rancher API Directly

### List Existing Clusters

```bash
# List provisioning-managed clusters in the default fleet namespace
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_BEARER_TOKEN}" \
  "${RANCHER_URL}/apis/provisioning.cattle.io/v1/namespaces/fleet-default/clusters" \
  | jq '.items[] | {
      name: .metadata.name,
      kubernetesVersion: .spec.kubernetesVersion,
      ready: ([.status.conditions[]? | select(.type == "Ready") | .status][0] // "Unknown")
    }'
```

### Provision an RKE2 Cluster on AWS

```bash
# Assumes the Rancher cloud credential and machine config objects already exist.
# Create an RKE2 cluster via the Rancher Kubernetes API
curl -s -k \
  -X POST \
  -H "Authorization: Bearer ${RANCHER_BEARER_TOKEN}" \
  -H "Content-Type: application/json" \
  "${RANCHER_URL}/apis/provisioning.cattle.io/v1/namespaces/fleet-default/clusters" \
  -d '{
    "apiVersion": "provisioning.cattle.io/v1",
    "kind": "Cluster",
    "metadata": {
      "name": "prod-cluster-01",
      "namespace": "fleet-default",
      "labels": {
        "env": "production",
        "region": "us-east-1"
      }
    },
    "spec": {
      "cloudCredentialSecretName": "cattle-global-data:cc-aws-prod",
      "kubernetesVersion": "v1.35.1+rke2r1",
      "rkeConfig": {
        "machineGlobalConfig": {
          "cni": "calico",
          "profile": "cis",
          "secrets-encryption-provider": "aescbc"
        },
        "machinePools": [
          {
            "name": "control-plane",
            "quantity": 3,
            "controlPlaneRole": true,
            "etcdRole": true,
            "workerRole": false,
            "machineConfigRef": {
              "kind": "Amazonec2Config",
              "name": "nc-prod-control-plane-abcde"
            }
          },
          {
            "name": "workers",
            "quantity": 5,
            "controlPlaneRole": false,
            "etcdRole": false,
            "workerRole": true,
            "machineConfigRef": {
              "kind": "Amazonec2Config",
              "name": "nc-prod-workers-fghij"
            }
          }
        ]
      }
    }
  }'
```

### Wait for Cluster to Be Ready

```bash
#!/bin/bash
# wait-for-cluster.sh
CLUSTER_NAME="$1"
CLUSTER_NAMESPACE="${2:-fleet-default}"
MAX_ATTEMPTS=60
ATTEMPT=0

echo "Waiting for cluster ${CLUSTER_NAMESPACE}/${CLUSTER_NAME} to become ready..."
while [ "${ATTEMPT}" -lt "${MAX_ATTEMPTS}" ]; do
  RESPONSE=$(curl -s -k \
    -H "Authorization: Bearer ${RANCHER_BEARER_TOKEN}" \
    "${RANCHER_URL}/apis/provisioning.cattle.io/v1/namespaces/${CLUSTER_NAMESPACE}/clusters/${CLUSTER_NAME}")

  READY=$(echo "${RESPONSE}" | jq -r '.status.conditions[]? | select(.type == "Ready") | .status // empty')
  REASON=$(echo "${RESPONSE}" | jq -r '.status.conditions[]? | select(.type == "Ready") | .reason // "Unknown"')
  MESSAGE=$(echo "${RESPONSE}" | jq -r '.status.conditions[]? | select(.type == "Ready") | .message // empty')

  echo "Ready condition: ${READY:-Unknown} (${REASON})"
  if [ -n "${MESSAGE}" ]; then
    echo "${MESSAGE}"
  fi

  if [ "${READY}" = "True" ]; then
    echo "Cluster is ready!"
    break
  fi

  ATTEMPT=$((ATTEMPT + 1))
  sleep 30
done

if [ "${ATTEMPT}" -eq "${MAX_ATTEMPTS}" ]; then
  echo "Timed out waiting for cluster readiness."
  exit 1
fi
```

## Using Terraform with the Rancher2 Provider

### Provider Configuration

```hcl
# provider.tf
terraform {
  required_providers {
    rancher2 = {
      # Pin a provider version compatible with your Rancher minor release.
      source = "rancher/rancher2"
    }
  }
}

provider "rancher2" {
  api_url    = var.rancher_url
  access_key = var.rancher_access_key
  secret_key = var.rancher_secret_key
}
```

### Cluster Resource

```hcl
# cluster.tf
resource "rancher2_cluster_v2" "prod_cluster" {
  name                  = "prod-cluster-${var.environment}"
  kubernetes_version    = "v1.35.1+rke2r1"
  cloud_credential_secret_name = rancher2_cloud_credential.aws.id

  rke_config {
    machine_pools {
      name                         = "control-plane"
      cloud_credential_secret_name = rancher2_cloud_credential.aws.id
      control_plane_role           = true
      etcd_role                    = true
      worker_role                  = false
      quantity                     = 3

      machine_config {
        kind = rancher2_machine_config_v2.control_plane.kind
        name = rancher2_machine_config_v2.control_plane.name
      }
    }

    machine_pools {
      name                         = "workers"
      cloud_credential_secret_name = rancher2_cloud_credential.aws.id
      control_plane_role           = false
      etcd_role                    = false
      worker_role                  = true
      quantity                     = var.worker_count

      machine_config {
        kind = rancher2_machine_config_v2.worker.kind
        name = rancher2_machine_config_v2.worker.name
      }
    }

    machine_global_config = yamlencode({
      cni                         = "calico"
      secrets-encryption-provider = "aescbc"
      profile                     = "cis"
    })
  }

  labels = {
    environment = var.environment
    region      = var.aws_region
    managed-by  = "terraform"
  }
}

# Output the kubeconfig
output "kubeconfig" {
  value     = rancher2_cluster_v2.prod_cluster.kube_config
  sensitive = true
}
```

### Machine Configuration

```hcl
# machine-config.tf
resource "rancher2_cloud_credential" "aws" {
  name = "aws-${var.environment}"

  amazonec2_credential_config {
    access_key = var.aws_access_key
    secret_key = var.aws_secret_key
  }
}

resource "rancher2_machine_config_v2" "control_plane" {
  generate_name = "control-plane-${var.environment}"

  amazonec2_config {
    ami                  = var.control_plane_ami_id
    region               = var.aws_region
    zone                 = var.aws_availability_zone
    instance_type        = "m5.xlarge"
    root_size            = "50"
    vpc_id               = var.vpc_id
    subnet_id            = var.private_subnet_id
    security_group       = [var.control_plane_sg_id]
    iam_instance_profile = var.control_plane_iam_profile
    tags                 = "env,${var.environment},managed-by,terraform"
  }
}

resource "rancher2_machine_config_v2" "worker" {
  generate_name = "worker-${var.environment}"

  amazonec2_config {
    ami                  = var.worker_ami_id
    region               = var.aws_region
    zone                 = var.aws_availability_zone
    instance_type        = "m5.2xlarge"
    root_size            = "100"
    vpc_id               = var.vpc_id
    subnet_id            = var.private_subnet_id
    security_group       = [var.worker_sg_id]
    iam_instance_profile = var.worker_iam_profile
    tags                 = "env,${var.environment},managed-by,terraform"
  }
}
```

### Post-Provisioning Configuration

```hcl
# After cluster is active, install monitoring
resource "rancher2_app_v2" "monitoring" {
  cluster_id    = rancher2_cluster_v2.prod_cluster.cluster_v1_id
  name          = "rancher-monitoring"
  namespace     = "cattle-monitoring-system"
  repo_name     = "rancher-charts"
  chart_name    = "rancher-monitoring"

  values = yamlencode({
    prometheus = {
      prometheusSpec = {
        retention     = "30d"
        storageSpec = {
          volumeClaimTemplate = {
            spec = {
              storageClassName = "longhorn"
              resources = {
                requests = { storage = "50Gi" }
              }
            }
          }
        }
      }
    }
  })

  depends_on = [rancher2_cluster_v2.prod_cluster]
}
```

## Automating with GitHub Actions

```yaml
# .github/workflows/provision-cluster.yml
name: Provision Kubernetes Cluster
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options: [dev, staging, production]
      worker_count:
        description: 'Number of worker nodes'
        required: true
        default: '3'

jobs:
  provision:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init
        working-directory: ./infrastructure/clusters

      - name: Terraform Apply
        env:
          TF_VAR_rancher_url: ${{ secrets.RANCHER_URL }}
          TF_VAR_rancher_access_key: ${{ secrets.RANCHER_ACCESS_KEY }}
          TF_VAR_rancher_secret_key: ${{ secrets.RANCHER_SECRET_KEY }}
          TF_VAR_aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
          TF_VAR_aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          TF_VAR_environment: ${{ inputs.environment }}
          TF_VAR_worker_count: ${{ inputs.worker_count }}
        run: terraform apply -auto-approve
        working-directory: ./infrastructure/clusters
```

## Conclusion

Automating cluster provisioning with the Rancher API and Terraform enables repeatable, auditable infrastructure creation. The Rancher2 Terraform provider handles the full lifecycle of clusters, machine configurations, cloud credentials, and post-provisioning app installations. Combining Terraform with GitHub Actions provides a repeatable, version-controlled provisioning pipeline where all changes are code-reviewed and tracked in Git.
