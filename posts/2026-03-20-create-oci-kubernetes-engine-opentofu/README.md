# How to Create OCI Container Engine for Kubernetes with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Oracle Cloud, OKE, Kubernetes, Infrastructure as Code

Description: Learn how to create OCI Container Engine for Kubernetes (OKE) clusters with OpenTofu, including node pools and kubeconfig generation.

OCI Container Engine for Kubernetes (OKE) is a managed Kubernetes service that handles control plane management, upgrades, and node health. OpenTofu lets you define OKE clusters, node pools, and kubeconfig generation as code.

## Creating an OKE Cluster

```hcl
resource "oci_containerengine_cluster" "main" {
  compartment_id     = var.compartment_id
  kubernetes_version = "v1.32.1"
  name               = "production-cluster"
  vcn_id             = oci_core_vcn.main.id

  endpoint_config {
    subnet_id             = oci_core_subnet.public.id
    is_public_ip_enabled  = true   # Public endpoint for kubectl access
  }

  options {
    service_lb_subnet_ids = [oci_core_subnet.public.id]

    kubernetes_network_config {
      pods_cidr     = "10.244.0.0/16"
      services_cidr = "10.96.0.0/16"
    }
  }

  freeform_tags = {
    Environment = "production"
    ManagedBy   = "opentofu"
  }
}
```

## Adding a Node Pool

```hcl
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartment_id
}

resource "oci_containerengine_node_pool" "workers" {
  cluster_id         = oci_containerengine_cluster.main.id
  compartment_id     = var.compartment_id
  kubernetes_version = "v1.32.1"
  name               = "worker-pool"
  node_shape         = "VM.Standard.E4.Flex"

  node_shape_config {
    ocpus         = 2
    memory_in_gbs = 16
  }

  node_source_details {
    image_id    = data.oci_core_images.oracle_linux.images[0].id
    source_type = "IMAGE"

    boot_volume_size_in_gbs = 50
  }

  node_config_details {
    size = 3  # Number of nodes

    placement_configs {
      availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
      subnet_id           = oci_core_subnet.private.id
    }

    placement_configs {
      availability_domain = data.oci_identity_availability_domains.ads.availability_domains[1].name
      subnet_id           = oci_core_subnet.private.id
    }
  }

  initial_node_labels {
    key   = "role"
    value = "worker"
  }
}
```

## Generating the Kubeconfig

```hcl
data "oci_containerengine_cluster_kube_config" "main" {
  cluster_id = oci_containerengine_cluster.main.id
}

output "kubeconfig" {
  value     = data.oci_containerengine_cluster_kube_config.main.content
  sensitive = true
}
```

```bash
# Save kubeconfig

tofu output -raw kubeconfig > kubeconfig.yaml
export KUBECONFIG=./kubeconfig.yaml
kubectl get nodes
```

## Using Managed Node Pools with Auto-Scaling

Cluster autoscaling on OKE is enabled by deploying the Cluster Autoscaler as a managed cluster add-on. Pass the node pool OCID and the desired min/max range via the `nodes` configuration key.

```hcl
resource "oci_containerengine_addon" "cluster_autoscaler" {
  cluster_id                       = oci_containerengine_cluster.main.id
  addon_name                       = "ClusterAutoscaler"
  remove_addon_resources_on_delete = true

  configurations {
    key   = "nodes"
    value = "1:5:${oci_containerengine_node_pool.workers.id}"
  }
}
```

## Conclusion

OCI OKE provides managed Kubernetes with flexible node pool configuration. Define the cluster with public or private endpoints, add node pools across multiple availability domains for HA, and retrieve the kubeconfig as a sensitive data source output. OKE handles control plane management and Kubernetes version upgrades automatically.
