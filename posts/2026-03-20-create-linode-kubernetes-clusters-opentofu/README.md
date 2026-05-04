# How to Create Linode Kubernetes Engine Clusters with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Linode, Kubernetes, LKE, Infrastructure as Code

Description: Learn how to create Linode Kubernetes Engine (LKE) clusters with OpenTofu, including node pools and kubeconfig retrieval.

Linode Kubernetes Engine (LKE) provides managed Kubernetes with automatic upgrades, node auto-healing, and integrated load balancers. OpenTofu lets you define clusters and node pools as code and retrieve kubeconfig credentials programmatically.

## Creating an LKE Cluster

```hcl
resource "linode_lke_cluster" "main" {
  label       = "production-cluster"
  region      = "us-east"
  k8s_version = "1.32"

  pool {
    type  = "g6-standard-2"  # Node plan
    count = 3

    autoscaler {
      min = 2
      max = 6
    }
  }

  tags = ["production", "kubernetes"]
}
```

## Adding Multiple Node Pools

```hcl
resource "linode_lke_cluster" "ha" {
  label       = "ha-cluster"
  region      = "us-east"
  k8s_version = "1.32"

  # General workload pool
  pool {
    type  = "g6-standard-2"
    count = 3
  }

  # High-memory pool for memory-intensive workloads
  pool {
    type  = "g7-highmem-1"
    count = 2
  }
}
```

## Enabling High Availability Control Plane

```hcl
resource "linode_lke_cluster" "production" {
  label             = "production"
  region            = "us-east"
  k8s_version       = "1.32"
  control_plane {
    high_availability = true  # Deploys 3 etcd nodes
  }

  pool {
    type  = "g6-standard-4"
    count = 4
    autoscaler {
      min = 3
      max = 10
    }
  }
}
```

## Retrieving the Kubeconfig

```hcl
output "kubeconfig" {
  value     = base64decode(linode_lke_cluster.main.kubeconfig)
  sensitive = true
}
```

Save it to a file for local use:

```bash
tofu output -raw kubeconfig > kubeconfig.yaml
export KUBECONFIG=./kubeconfig.yaml
kubectl get nodes
```

## Upgrading the Kubernetes Version

Update the `k8s_version` attribute and apply. LKE performs a rolling upgrade:

```hcl
resource "linode_lke_cluster" "main" {
  k8s_version = "1.33"  # Upgraded
  # ...
}
```

## Getting the API Endpoint

```hcl
output "api_endpoint" {
  value = linode_lke_cluster.main.api_endpoints[0]
}
```

## Using the Cluster in CI/CD

```bash
# Save kubeconfig from OpenTofu output (already base64-decoded by the output)

tofu output -raw kubeconfig > /tmp/kubeconfig.yaml

# Deploy to the cluster
kubectl --kubeconfig=/tmp/kubeconfig.yaml apply -f k8s/
```

## Conclusion

Linode Kubernetes Engine clusters are quick to provision with OpenTofu. Define node pools with autoscaling for production workloads, enable high-availability control planes for critical clusters, and retrieve the kubeconfig as a sensitive output. LKE handles control plane management and automatic node healing, reducing operational overhead.
