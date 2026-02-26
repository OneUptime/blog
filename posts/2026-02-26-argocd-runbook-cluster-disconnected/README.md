# ArgoCD Runbook: Cluster Disconnected

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Runbook, Multi-Cluster

Description: A step-by-step operational runbook for diagnosing and fixing disconnected clusters in ArgoCD, covering credential expiry, network issues, API server unreachable, and certificate rotation.

---

When a managed cluster becomes disconnected from ArgoCD, all applications deployed to that cluster show "Unknown" status. ArgoCD cannot detect drift, trigger syncs, or report health. For multi-cluster setups, this is a critical issue because it creates a blind spot in your GitOps pipeline. This runbook covers how to diagnose and restore connectivity.

## Symptoms

- Applications targeting the disconnected cluster show "Unknown" health and sync status
- The ArgoCD UI shows the cluster with a warning or error indicator
- `argocd cluster list` shows the cluster with a connection error
- Controller logs contain "failed to load initial state of resource" or "connection refused" messages for the affected cluster

## Impact Assessment

**Severity:** P2

**Impact:** All applications on the disconnected cluster are unmanaged. No syncs, no drift detection, no self-healing. Applications continue to run but ArgoCD cannot verify or modify them.

## Diagnostic Steps

### Step 1: Identify the Disconnected Cluster

```bash
# List all clusters and their status
argocd cluster list

# Get detailed info about the problematic cluster
argocd cluster get <cluster-server-url>

# Check for cluster-related errors in controller logs
kubectl logs -n argocd deployment/argocd-application-controller --tail=500 | grep -i "cluster\|connection\|refused\|timeout\|unauthorized"
```

### Step 2: Test Network Connectivity

```bash
# From within the ArgoCD namespace, test connectivity to the remote API server
kubectl exec -n argocd deployment/argocd-application-controller -- \
  wget -qO- --timeout=10 <cluster-api-server-url>/healthz 2>&1

# If using a private network, check if the route exists
kubectl exec -n argocd deployment/argocd-application-controller -- \
  nc -zv <cluster-api-server-host> <port> 2>&1

# Check DNS resolution
kubectl exec -n argocd deployment/argocd-application-controller -- \
  nslookup <cluster-api-server-host> 2>&1
```

### Step 3: Check Cluster Credentials

ArgoCD stores cluster credentials as Kubernetes secrets.

```bash
# List cluster secrets
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=cluster

# Check the cluster secret for the affected cluster
# The server URL in the secret identifies which cluster it belongs to
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=cluster -o json | \
  jq '.items[] | select(.data.server) | {name: .metadata.name, server: (.data.server | @base64d)}'

# Decode the credentials to check for expiry
CLUSTER_SECRET=$(kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=cluster -o json | \
  jq -r '.items[] | select(.data.server | @base64d | contains("<cluster-server-url>")) | .metadata.name')
kubectl get secret $CLUSTER_SECRET -n argocd -o jsonpath='{.data.config}' | base64 -d | jq .
```

### Step 4: Check the Remote Cluster Health

```bash
# If you have direct access to the remote cluster
KUBECONFIG=/path/to/remote/kubeconfig kubectl cluster-info
KUBECONFIG=/path/to/remote/kubeconfig kubectl get nodes

# Check if the API server is responding
KUBECONFIG=/path/to/remote/kubeconfig kubectl get --raw /healthz
```

### Step 5: Check for Certificate Issues

```bash
# Check if the cluster certificate has expired
kubectl get secret $CLUSTER_SECRET -n argocd -o jsonpath='{.data.config}' | base64 -d | \
  jq -r '.tlsClientConfig.certData // empty' | base64 -d | \
  openssl x509 -text -noout 2>/dev/null | grep -A2 "Not After"

# Check if the CA cert matches the cluster's current CA
kubectl get secret $CLUSTER_SECRET -n argocd -o jsonpath='{.data.config}' | base64 -d | \
  jq -r '.tlsClientConfig.caData // empty' | base64 -d | \
  openssl x509 -text -noout 2>/dev/null | grep -A2 "Not After"
```

## Root Causes and Resolutions

### Cause 1: Service Account Token Expired

Many managed Kubernetes services rotate service account tokens. If the token stored in ArgoCD has expired, it cannot authenticate.

```bash
# Re-add the cluster with fresh credentials
# First, make sure your kubeconfig for the target cluster is current
argocd cluster rm <cluster-server-url>
argocd cluster add <context-name> --name <cluster-name>

# This creates a new service account on the target cluster
# and stores fresh credentials in ArgoCD
```

For EKS clusters, the token may need to be refreshed differently.

```bash
# For EKS: update the cluster with the current IAM credentials
argocd cluster add arn:aws:eks:<region>:<account>:cluster/<cluster-name> \
  --name <cluster-name>
```

### Cause 2: Network Connectivity Lost

The network path between ArgoCD and the remote cluster is broken.

```bash
# Check if a VPN or peering connection is down
# This depends on your infrastructure setup

# If using a VPN:
# - Check VPN tunnel status in your cloud provider
# - Verify security groups allow traffic from ArgoCD to the remote API server

# If using VPC peering:
# - Check peering connection status
# - Verify route tables include the remote cluster's subnet
```

As a temporary workaround, if the cluster is accessible from another network.

```bash
# Set up a port-forward or SSH tunnel to reach the remote API server
# This is a temporary workaround only
ssh -L 6443:<remote-api-server>:6443 bastion-host
```

### Cause 3: API Server Certificate Rotated

The remote cluster rotated its API server TLS certificate, and the CA certificate stored in ArgoCD no longer matches.

```bash
# Get the new CA certificate from the remote cluster
KUBECONFIG=/path/to/remote/kubeconfig kubectl config view --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}'

# Remove and re-add the cluster to pick up the new CA
argocd cluster rm <cluster-server-url>
argocd cluster add <context-name> --name <cluster-name>
```

### Cause 4: RBAC Changed on Remote Cluster

Someone modified the RBAC on the remote cluster, removing permissions from ArgoCD's service account.

```bash
# Check the service account on the remote cluster
KUBECONFIG=/path/to/remote/kubeconfig kubectl get serviceaccount argocd-manager -n kube-system

# Check ClusterRoleBinding
KUBECONFIG=/path/to/remote/kubeconfig kubectl get clusterrolebinding argocd-manager-role

# If missing, recreate the RBAC
KUBECONFIG=/path/to/remote/kubeconfig kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: argocd-manager-role
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: argocd-manager
  namespace: kube-system
EOF
```

### Cause 5: Remote Cluster API Server Down

The remote cluster's API server itself is unavailable.

```bash
# Check the remote cluster's control plane status
# This depends on your hosting provider

# For EKS:
aws eks describe-cluster --name <cluster-name> --query 'cluster.status'

# For GKE:
gcloud container clusters describe <cluster-name> --zone <zone> --format='value(status)'

# For AKS:
az aks show --resource-group <rg> --name <cluster-name> --query 'provisioningState'
```

If the remote API server is down, wait for it to recover or escalate to the team managing that cluster.

### Cause 6: Firewall Rules Changed

Security group or firewall rules were modified, blocking traffic from ArgoCD to the remote cluster.

```bash
# Check security groups (AWS example)
aws ec2 describe-security-groups --group-ids <sg-id> \
  --query 'SecurityGroups[0].IpPermissions'

# Ensure port 443 (or 6443) is open from ArgoCD's subnet
# to the remote cluster's API server
```

## Verification

```bash
# After applying a fix, verify cluster connectivity
argocd cluster list
# The affected cluster should show a successful connection

# Check that applications are no longer "Unknown"
argocd app list | grep <cluster-name>

# Trigger a manual refresh of one application
argocd app get <app-name> --refresh

# Monitor controller logs for the cluster
kubectl logs -n argocd deployment/argocd-application-controller --tail=50 | grep "<cluster-server-url>"
# Should see successful reconciliation messages, not errors
```

## Prevention

1. Set up monitoring for `argocd cluster list` output - alert when any cluster shows an error
2. For managed Kubernetes services, automate credential rotation
3. Set up network monitoring between ArgoCD and all managed clusters
4. Document the network path to each cluster (VPN, peering, direct) for troubleshooting
5. Use ArgoCD cluster management automation to detect and fix credential expiry before it causes outages

## Escalation

If the cluster cannot be reconnected:

- Contact the team that manages the remote cluster's infrastructure
- Check if a maintenance window or upgrade caused the disconnection
- If credentials cannot be refreshed, create a new service account on the remote cluster and re-register it with ArgoCD
- As a last resort, applications on the disconnected cluster continue running with their last synced state
