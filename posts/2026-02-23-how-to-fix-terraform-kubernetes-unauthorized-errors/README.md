# How to Fix Terraform Kubernetes Unauthorized Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, RBAC, Authentication, Troubleshooting

Description: Resolve unauthorized and forbidden errors when using the Terraform Kubernetes provider, including token expiration, RBAC misconfigurations, and service account setup.

---

Unauthorized errors from the Terraform Kubernetes provider mean that Terraform can reach the Kubernetes API server but the credentials it is using are either invalid or do not have sufficient permissions. This is different from connection refused errors where the API server is unreachable. Here, the connection works but authentication or authorization fails.

## What the Error Looks Like

```
Error: Unauthorized

Error: the server has asked for the client to provide credentials
(get namespaces)

Error: Error creating namespace: namespaces is forbidden: User
"system:anonymous" cannot create resource "namespaces" in API
group "" at the cluster scope

Error: Error creating deployment: deployments.apps is forbidden:
User "system:serviceaccount:default:terraform" cannot create
resource "deployments" in API group "apps" in the namespace "production"
```

The first two errors indicate authentication failure (your identity is not recognized). The latter two indicate authorization failure (your identity is recognized but does not have permission).

## Common Causes and Fixes

### 1. Expired Authentication Token

Tokens have an expiration time. If the token used by Terraform has expired, you get an unauthorized error:

**For EKS:**

```hcl
# The token from aws_eks_cluster_auth is short-lived
data "aws_eks_cluster_auth" "cluster" {
  name = "my-cluster"
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}
```

The `aws_eks_cluster_auth` data source generates a token that expires in 15 minutes. If your Terraform apply takes longer than that, the token expires mid-apply.

**Fix:** Use the `exec` plugin to get a fresh token for each request:

```hcl
provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", "my-cluster"]
  }
}
```

**For GKE:**

```hcl
data "google_client_config" "default" {}

provider "kubernetes" {
  host                   = "https://${data.google_container_cluster.cluster.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(data.google_container_cluster.cluster.master_auth[0].cluster_ca_certificate)
}
```

If the GCP access token expires, refresh it:

```bash
gcloud auth application-default login
```

### 2. Wrong or Missing Credentials

The provider might be configured without credentials or with the wrong ones:

```hcl
# WRONG - no authentication configured
provider "kubernetes" {
  host = "https://my-cluster:6443"
  # No token, no client certificate, no exec plugin
}

# CORRECT - with token
provider "kubernetes" {
  host                   = "https://my-cluster:6443"
  token                  = var.k8s_token
  cluster_ca_certificate = var.k8s_ca_cert
}

# CORRECT - with client certificate
provider "kubernetes" {
  host                   = "https://my-cluster:6443"
  client_certificate     = file("/path/to/client.crt")
  client_key             = file("/path/to/client.key")
  cluster_ca_certificate = file("/path/to/ca.crt")
}
```

### 3. EKS aws-auth ConfigMap Not Updated

For EKS clusters, IAM principals must be mapped to Kubernetes RBAC roles through the `aws-auth` ConfigMap. If your IAM user or role is not in this ConfigMap, you get unauthorized:

```bash
# Check the current aws-auth ConfigMap
kubectl get configmap aws-auth -n kube-system -o yaml
```

**Fix:** Add the IAM role or user to the aws-auth ConfigMap:

```hcl
resource "kubernetes_config_map_v1_data" "aws_auth" {
  metadata {
    name      = "aws-auth"
    namespace = "kube-system"
  }

  data = {
    mapRoles = yamlencode([
      {
        rolearn  = aws_iam_role.node_group.arn
        username = "system:node:{{EC2PrivateDNSName}}"
        groups   = ["system:bootstrappers", "system:nodes"]
      },
      {
        rolearn  = aws_iam_role.terraform.arn
        username = "terraform"
        groups   = ["system:masters"]
      }
    ])
  }

  force = true
}
```

Or manually:

```bash
kubectl edit configmap aws-auth -n kube-system
```

Add your role:

```yaml
mapRoles: |
  - rolearn: arn:aws:iam::123456789012:role/terraform-role
    username: terraform
    groups:
      - system:masters
```

### 4. Kubernetes RBAC Insufficient Permissions

Even if authentication succeeds, RBAC might deny the specific operation. The error will say "forbidden" rather than "unauthorized":

```
Error: deployments.apps is forbidden: User "terraform" cannot create
resource "deployments" in API group "apps" in the namespace "production"
```

**Fix:** Create the necessary RBAC resources:

```hcl
# Create a ClusterRole with the needed permissions
resource "kubernetes_cluster_role" "terraform" {
  metadata {
    name = "terraform-admin"
  }

  rule {
    api_groups = ["", "apps", "batch", "extensions", "networking.k8s.io"]
    resources  = ["*"]
    verbs      = ["*"]
  }
}

# Bind the role to the terraform user
resource "kubernetes_cluster_role_binding" "terraform" {
  metadata {
    name = "terraform-admin-binding"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.terraform.metadata[0].name
  }

  subject {
    kind      = "User"
    name      = "terraform"
    api_group = "rbac.authorization.k8s.io"
  }
}
```

For namespace-scoped permissions:

```hcl
resource "kubernetes_role" "terraform" {
  metadata {
    name      = "terraform-role"
    namespace = "production"
  }

  rule {
    api_groups = ["", "apps"]
    resources  = ["deployments", "services", "configmaps", "secrets"]
    verbs      = ["get", "list", "create", "update", "patch", "delete"]
  }
}

resource "kubernetes_role_binding" "terraform" {
  metadata {
    name      = "terraform-role-binding"
    namespace = "production"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.terraform.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = "terraform"
    namespace = "kube-system"
  }
}
```

### 5. Using system:anonymous Identity

If Terraform shows up as `system:anonymous`, it means no valid credentials were presented at all:

```
User "system:anonymous" cannot create resource...
```

This typically means:
- The token is empty or invalid
- The client certificate is not being sent
- The kubeconfig is not being read

Check that your provider has valid credentials:

```bash
# Verify your kubeconfig works
kubectl auth can-i create namespaces
# Should return "yes"

# Check what identity kubectl is using
kubectl auth whoami
```

### 6. Service Account Token Issues

If using a Kubernetes service account for authentication:

```bash
# Create a service account for Terraform
kubectl create serviceaccount terraform -n kube-system

# Create a token (Kubernetes 1.24+)
kubectl create token terraform -n kube-system --duration=8760h
```

For older clusters that use long-lived tokens:

```bash
# Get the secret name
SECRET=$(kubectl get serviceaccount terraform -n kube-system -o jsonpath='{.secrets[0].name}')

# Get the token
TOKEN=$(kubectl get secret $SECRET -n kube-system -o jsonpath='{.data.token}' | base64 -d)

echo $TOKEN
```

Then use the token in Terraform:

```hcl
provider "kubernetes" {
  host                   = "https://my-cluster:6443"
  token                  = var.k8s_token  # The token from above
  cluster_ca_certificate = file("/path/to/ca.crt")
}
```

### 7. GKE RBAC and IAM Integration

For GKE, you need both GCP IAM permissions and Kubernetes RBAC:

```bash
# Grant GKE admin access at the GCP IAM level
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:terraform@my-project.iam.gserviceaccount.com" \
  --role="roles/container.admin"
```

In the cluster, the IAM identity is automatically mapped to a Kubernetes user. You can then use ClusterRoleBindings to grant Kubernetes-level permissions.

### 8. AKS Azure AD Integration

For AKS with Azure AD integration:

```bash
# Get cluster credentials with admin access
az aks get-credentials --name my-cluster --resource-group my-rg --admin

# Or for Azure AD auth
az aks get-credentials --name my-cluster --resource-group my-rg
```

The `--admin` flag bypasses Azure AD and uses the cluster admin credentials. Without it, you need to set up Azure AD group mappings.

## Debugging Authentication Issues

```bash
# Check what identity Terraform sees
kubectl auth whoami

# Test specific permissions
kubectl auth can-i create deployments --namespace production
kubectl auth can-i create namespaces

# Check all permissions in a namespace
kubectl auth can-i --list --namespace production

# Check RBAC bindings
kubectl get clusterrolebindings -o wide | grep terraform
kubectl get rolebindings -n production -o wide | grep terraform
```

## Best Practices

1. **Use exec-based authentication** for cloud-managed clusters to avoid token expiration issues.

2. **Follow the principle of least privilege.** Grant only the RBAC permissions Terraform actually needs.

3. **Separate cluster creation from cluster management.** Use one Terraform configuration to create the cluster and another to manage workloads inside it.

4. **Monitor authentication failures** with [OneUptime](https://oneuptime.com) to detect expired credentials and permission issues before they block deployments.

5. **Rotate credentials regularly.** Service account tokens and certificates should be rotated on a schedule.

## Conclusion

Unauthorized errors with the Terraform Kubernetes provider fall into two categories: authentication failures (wrong or expired credentials) and authorization failures (insufficient RBAC permissions). For authentication, make sure your token is valid and not expired, use exec plugins for automatic token refresh, and verify the correct kubeconfig context is selected. For authorization, check RBAC roles and bindings, and for EKS specifically, ensure the aws-auth ConfigMap maps your IAM identity to the correct Kubernetes groups.
