# How to Fix Terraform Kubernetes Connection Refused Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Troubleshooting, Infrastructure as Code, DevOps

Description: Resolve connection refused errors when using the Terraform Kubernetes provider, including cluster endpoint issues, kubeconfig problems, and network connectivity fixes.

---

Connection refused errors with the Terraform Kubernetes provider mean Terraform cannot reach the Kubernetes API server. This happens when the cluster is down, the endpoint is wrong, or there is a network issue between wherever Terraform is running and the cluster. Since the Kubernetes provider needs to talk to the API server for every operation, a connection failure blocks everything.

## What the Error Looks Like

```
Error: Get "https://192.168.1.100:6443/api/v1/namespaces/default":
dial tcp 192.168.1.100:6443: connect: connection refused

Error: Post "https://kubernetes.docker.internal:6443/api/v1/namespaces":
dial tcp: lookup kubernetes.docker.internal: no such host

Error: Get "https://abcdef.gr7.us-east-1.eks.amazonaws.com/api":
dial tcp 1.2.3.4:443: i/o timeout

Error: the server was unable to return a response in the time allotted,
but may still be processing the request
```

## Common Causes and Fixes

### 1. Cluster Is Not Running

The most basic cause: the Kubernetes cluster is not running.

**For local clusters (minikube, kind, Docker Desktop):**

```bash
# Check minikube status
minikube status

# Start minikube if it is not running
minikube start

# Check kind clusters
kind get clusters

# Check Docker Desktop Kubernetes
docker info | grep -i kubernetes
```

**For cloud-managed clusters:**

```bash
# AWS EKS
aws eks describe-cluster --name my-cluster --query "cluster.status"

# GCP GKE
gcloud container clusters describe my-cluster --zone us-central1-a --format="value(status)"

# Azure AKS
az aks show --name my-cluster --resource-group my-rg --query "provisioningState"
```

If the cluster is not running, start it or wait for it to become available.

### 2. Wrong Cluster Endpoint

The Kubernetes provider might be configured to point to the wrong endpoint:

```hcl
# Check that host matches your actual cluster endpoint
provider "kubernetes" {
  host = "https://192.168.1.100:6443"  # Is this correct?
}
```

**Fix:** Get the correct endpoint:

```bash
# From kubeconfig
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'

# From EKS
aws eks describe-cluster --name my-cluster --query "cluster.endpoint" --output text

# From GKE
gcloud container clusters describe my-cluster \
  --zone us-central1-a \
  --format="value(endpoint)"

# From AKS
az aks show --name my-cluster --resource-group my-rg --query "fqdn"
```

### 3. Kubeconfig Not Found or Wrong Context

If you are using kubeconfig-based authentication, make sure the file exists and the right context is selected:

```bash
# Check current context
kubectl config current-context

# List all contexts
kubectl config get-contexts

# Switch to the right context
kubectl config use-context my-cluster-context

# Test connectivity
kubectl cluster-info
```

In Terraform:

```hcl
provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = "my-cluster-context"
}
```

### 4. Network Connectivity Issues

**Private clusters:** If the Kubernetes API server is private (no public endpoint), Terraform must run from within the same network:

```bash
# Test connectivity to the API server
curl -k https://your-cluster-endpoint:443

# Check if you can reach the endpoint
telnet your-cluster-endpoint 443
# or
nc -zv your-cluster-endpoint 443
```

**VPN or bastion required:** For private clusters, you might need to:
- Connect to a VPN
- Use a bastion host
- Run Terraform from a CI/CD runner inside the VPC

**Firewall rules:** Make sure the firewall allows traffic from your IP to the cluster endpoint:

```bash
# For EKS - check security group rules
aws ec2 describe-security-groups --group-ids sg-xxxxx

# For GKE - check authorized networks
gcloud container clusters describe my-cluster \
  --zone us-central1-a \
  --format="value(masterAuthorizedNetworksConfig)"

# For AKS - check authorized IP ranges
az aks show --name my-cluster --resource-group my-rg \
  --query "apiServerAccessProfile.authorizedIpRanges"
```

### 5. EKS Specific: Cluster Just Created

When you create an EKS cluster with Terraform and immediately try to use the Kubernetes provider on the same apply, the cluster might not be fully ready:

```hcl
# This can fail because the cluster is not ready when the provider initializes
resource "aws_eks_cluster" "cluster" {
  name     = "my-cluster"
  role_arn = aws_iam_role.cluster.arn

  vpc_config {
    subnet_ids = var.subnet_ids
  }
}

provider "kubernetes" {
  host                   = aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}
```

**Fix:** Use a two-step approach. Create the cluster in one apply, then configure the Kubernetes provider in a second apply. Or use `depends_on` on the Kubernetes resources:

```hcl
data "aws_eks_cluster" "cluster" {
  name = aws_eks_cluster.cluster.name
}

data "aws_eks_cluster_auth" "cluster" {
  name = aws_eks_cluster.cluster.name
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}
```

### 6. GKE Specific: Missing gcloud Credentials

For GKE clusters, you might need to fetch credentials:

```bash
# Get credentials for a GKE cluster
gcloud container clusters get-credentials my-cluster \
  --zone us-central1-a \
  --project my-project
```

In Terraform:

```hcl
data "google_container_cluster" "cluster" {
  name     = "my-cluster"
  location = "us-central1-a"
  project  = var.project_id
}

data "google_client_config" "default" {}

provider "kubernetes" {
  host                   = "https://${data.google_container_cluster.cluster.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(data.google_container_cluster.cluster.master_auth[0].cluster_ca_certificate)
}
```

### 7. AKS Specific: Kubeconfig Retrieval

For AKS:

```bash
# Get AKS credentials
az aks get-credentials --name my-cluster --resource-group my-rg
```

In Terraform:

```hcl
data "azurerm_kubernetes_cluster" "cluster" {
  name                = "my-cluster"
  resource_group_name = "my-rg"
}

provider "kubernetes" {
  host                   = data.azurerm_kubernetes_cluster.cluster.kube_config[0].host
  client_certificate     = base64decode(data.azurerm_kubernetes_cluster.cluster.kube_config[0].client_certificate)
  client_key             = base64decode(data.azurerm_kubernetes_cluster.cluster.kube_config[0].client_key)
  cluster_ca_certificate = base64decode(data.azurerm_kubernetes_cluster.cluster.kube_config[0].cluster_ca_certificate)
}
```

### 8. TLS Certificate Issues

If the cluster uses a self-signed certificate and you have not configured the CA certificate:

```hcl
provider "kubernetes" {
  host                   = "https://my-cluster:6443"
  cluster_ca_certificate = file("/path/to/ca.crt")
  # ...
}

# Or to skip TLS verification (not recommended for production)
provider "kubernetes" {
  host                   = "https://my-cluster:6443"
  insecure               = true
  # ...
}
```

## Debugging Steps

1. **Test connectivity from the command line:**

```bash
# Basic connectivity test
kubectl cluster-info
kubectl get nodes

# If kubectl works but Terraform does not, the issue is in the provider config
```

2. **Enable Terraform debug logging:**

```bash
export TF_LOG=DEBUG
terraform plan 2>&1 | grep -i "connection\|refused\|timeout\|error"
```

3. **Check if the cluster is accessible from your network:**

```bash
# Try a raw HTTP request
curl -k -v https://cluster-endpoint:443/version
```

4. **Verify provider configuration matches kubectl config:**

```bash
# See what kubectl is using
kubectl config view --minify --raw
```

## Best Practices

1. **Use data sources** to dynamically retrieve cluster endpoints rather than hardcoding them.

2. **Separate cluster creation from cluster configuration** into different Terraform applies or use `-target` when needed.

3. **For private clusters**, run Terraform from within the network (e.g., a CI/CD runner inside the VPC).

4. **Monitor your cluster** with [OneUptime](https://oneuptime.com) to get alerted when the Kubernetes API server becomes unreachable, so you can fix the issue before it blocks your Terraform pipeline.

5. **Set timeouts** in your provider configuration to avoid long waits on connection failures.

## Conclusion

Connection refused errors with the Terraform Kubernetes provider mean the API server is unreachable. Start by verifying the cluster is running and that you can reach it from the command line with kubectl. Then check that the provider configuration matches the correct endpoint, credentials, and CA certificate. For cloud-managed clusters, use data sources to dynamically retrieve connection information rather than hardcoding endpoints.
