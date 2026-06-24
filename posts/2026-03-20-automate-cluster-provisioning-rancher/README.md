# How to Automate Cluster Provisioning in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Cluster Provisioning, Automation, DevOps, Infrastructure

Description: Learn how to automate Kubernetes cluster provisioning in Rancher using the Rancher API, Terraform provider, and cluster templates.

---

Rancher supports automating cluster provisioning through the Rancher Kubernetes API and the official Rancher Terraform/OpenTofu provider. This enables repeatable, version-controlled cluster creation across cloud providers and bare metal.

---

## Install the Rancher Provider

```hcl
# versions.tf

terraform {
  required_providers {
    rancher2 = {
      source  = "rancher/rancher2"
      version = "~> 14.0"
    }
  }
}

provider "rancher2" {
  api_url    = "https://rancher.example.com"
  access_key = var.rancher_access_key
  secret_key = var.rancher_secret_key
  insecure   = false
}
```

---

## Provision an RKE2 Cluster on AWS

```hcl
resource "rancher2_machine_config_v2" "worker" {
  generate_name = "worker-"
  amazonec2_config {
    ami                = "<AMI_ID>"
    region             = "us-east-1"
    instance_type      = "t3.medium"
    security_group     = ["<AWS_SECURITY_GROUP>"]
    subnet_id          = "<SUBNET_ID>"
    vpc_id             = "<VPC_ID>"
    zone               = "a"
  }
}

resource "rancher2_cluster_v2" "prod" {
  name               = "prod-cluster"
  kubernetes_version = "<RKE2_VERSION>"

  rke_config {
    machine_pools {
      name                         = "control-plane"
      cloud_credential_secret_name = rancher2_cloud_credential.aws.id
      control_plane_role           = true
      etcd_role                    = true
      worker_role                  = false
      quantity                     = 3
      machine_config {
        kind = rancher2_machine_config_v2.worker.kind
        name = rancher2_machine_config_v2.worker.name
      }
    }

    machine_pools {
      name                         = "workers"
      cloud_credential_secret_name = rancher2_cloud_credential.aws.id
      control_plane_role           = false
      etcd_role                    = false
      worker_role                  = true
      quantity                     = 3
      machine_config {
        kind = rancher2_machine_config_v2.worker.kind
        name = rancher2_machine_config_v2.worker.name
      }
    }
  }
}
```

---

## Create Cloud Credentials

```hcl
resource "rancher2_cloud_credential" "aws" {
  name = "aws-credentials"
  amazonec2_credential_config {
    access_key = var.aws_access_key
    secret_key = var.aws_secret_key
  }
}
```

---

## Use the Rancher API Directly

```bash
# Create a cluster via the Rancher Kubernetes API
curl -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  https://rancher.example.com/apis/provisioning.cattle.io/v1/namespaces/fleet-default/clusters \
  -d '{
    "apiVersion": "provisioning.cattle.io/v1",
    "kind": "Cluster",
    "metadata": {
      "name": "dev-cluster",
      "namespace": "fleet-default"
    },
    "spec": {
      "cloudCredentialSecretName": "<CLOUD_CREDENTIAL_SECRET_NAME>",
      "kubernetesVersion": "<RKE2_VERSION>",
      "rkeConfig": {
        "machinePools": [
          {
            "name": "control-plane",
            "controlPlaneRole": true,
            "etcdRole": true,
            "workerRole": false,
            "quantity": 3,
            "machineConfigRef": {
              "kind": "Amazonec2Config",
              "name": "<CONTROL_PLANE_MACHINE_CONFIG_NAME>"
            }
          },
          {
            "name": "workers",
            "controlPlaneRole": false,
            "etcdRole": false,
            "workerRole": true,
            "quantity": 3,
            "machineConfigRef": {
              "kind": "Amazonec2Config",
              "name": "<WORKER_MACHINE_CONFIG_NAME>"
            }
          }
        ]
      }
    }
  }'
```

---

## Get Kubeconfig for the Cluster

```bash
# Using Rancher CLI
rancher login https://rancher.example.com --token ${RANCHER_TOKEN}
rancher clusters kubeconfig prod-cluster > ~/.kube/prod-config
```

---

## Summary

Use the `rancher/rancher2` Terraform/OpenTofu provider to declare clusters as code with `rancher2_cluster_v2`. Define separate machine pools for control plane and worker roles, attach cloud credentials via `rancher2_cloud_credential`, and apply with `tofu apply`. This approach makes cluster provisioning repeatable, reviewable through pull requests, and consistent across environments.
