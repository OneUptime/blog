# How to Create Alibaba Cloud ACK Clusters with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Alibaba Cloud, ACK, Kubernetes, Infrastructure as Code

Description: Learn how to create Alibaba Cloud Container Service for Kubernetes (ACK) clusters with OpenTofu, including managed node pools and kubeconfig access.

Alibaba Cloud ACK (Container Service for Kubernetes) provides managed Kubernetes clusters with integration to Alibaba Cloud load balancers, persistent volumes, and container registries. OpenTofu lets you provision ACK clusters and node pools as code.

## Creating a Managed Kubernetes Cluster (ACK Standard)

```hcl
resource "alicloud_cs_managed_kubernetes" "main" {
  name                  = "production-cluster"
  cluster_spec          = "ack.standard"  # ack.standard or ack.pro.small
  version               = "1.30.1-aliyun.1"

  # Network configuration
  pod_cidr              = "172.20.0.0/16"
  service_cidr          = "172.21.0.0/20"
  new_nat_gateway       = true

  # VSwitches for control plane (spread across zones for HA)
  vswitch_ids           = [
    alicloud_vswitch.private_a.id,
    alicloud_vswitch.private_b.id,
  ]

  # Enable logging
  enable_rrsa = true  # RAM Role for Service Account

  tags = {
    Environment = "production"
    ManagedBy   = "opentofu"
  }
}
```

## Adding a Node Pool

```hcl
resource "alicloud_cs_kubernetes_node_pool" "workers" {
  cluster_id     = alicloud_cs_managed_kubernetes.main.id
  node_pool_name = "worker-pool"

  vswitch_ids   = [alicloud_vswitch.private_a.id]
  instance_types = ["ecs.c6.xlarge"]

  system_disk_category = "cloud_essd"
  system_disk_size     = 100

  image_type           = "AliyunLinux3"

  # Fixed node count
  desired_size = 3

  # Or use auto-scaling
  # scaling_config {
  #   min_size = 2
  #   max_size = 10
  # }

  node_name_mode = "customized,worker,ip,"
  key_name       = alicloud_ecs_key_pair.default.key_pair_name

  labels {
    key   = "role"
    value = "worker"
  }
}
```

## Auto-Scaling Node Pool

```hcl
resource "alicloud_cs_kubernetes_node_pool" "autoscale" {
  cluster_id     = alicloud_cs_managed_kubernetes.main.id
  node_pool_name = "autoscale-pool"
  vswitch_ids    = [alicloud_vswitch.private_a.id]
  instance_types = ["ecs.c6.large"]

  system_disk_category = "cloud_essd"
  system_disk_size     = 50
  image_type           = "AliyunLinux3"

  scaling_config {
    min_size = 2
    max_size = 20
    type     = "cpu"  # Auto-scale based on CPU
  }
}
```

## Retrieving the Kubeconfig

```hcl
output "cluster_id" {
  value = alicloud_cs_managed_kubernetes.main.id
}
```

```bash
# Retrieve kubeconfig using aliyun CLI

aliyun cs DescribeClusterUserKubeconfig \
  --ClusterId $(tofu output -raw cluster_id) \
  --output json | jq -r '.config' > kubeconfig.yaml

export KUBECONFIG=./kubeconfig.yaml
kubectl get nodes
```

## Pro Cluster for Production

```hcl
resource "alicloud_cs_managed_kubernetes" "pro" {
  name         = "production-pro"
  cluster_spec = "ack.pro.small"  # Includes etcd + control plane HA
  version      = "1.30.1-aliyun.1"

  pod_cidr     = "172.20.0.0/16"
  service_cidr = "172.21.0.0/20"
  new_nat_gateway = true

  vswitch_ids = [
    alicloud_vswitch.private_a.id,
    alicloud_vswitch.private_b.id,
    alicloud_vswitch.private_c.id,
  ]
}
```

## Conclusion

Alibaba Cloud ACK clusters in OpenTofu are provisioned with `alicloud_cs_managed_kubernetes` and node pools with `alicloud_cs_kubernetes_node_pool`. Use ACK Pro for production workloads to get SLA-backed control planes, enable RRSA for pod-level cloud resource access, and configure auto-scaling node pools to handle variable workloads. Retrieve kubeconfig via the Alibaba Cloud CLI after provisioning.
