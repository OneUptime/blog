# How to Troubleshoot AKS Cluster Certificate Expiration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Certificate, Kubernetes, Troubleshooting, Security, Azure, TLS

Description: A practical guide to identifying expired AKS cluster certificates, understanding the rotation lifecycle, and performing manual certificate rotation.

---

Nothing ruins your morning quite like discovering that your AKS cluster is unreachable because the internal certificates expired. AKS uses certificates extensively for securing communication between the API server, kubelets, etcd, and other control plane components. These certificates have a finite lifetime, and if they expire before rotation happens, your cluster can become unresponsive.

This guide covers how to check certificate expiration dates, understand the automatic rotation schedule, and perform manual rotation when things go wrong.

## How AKS Certificates Work

AKS manages several sets of certificates internally:

- **API server TLS certificate**: Secures HTTPS connections to the Kubernetes API server
- **Kubelet client certificates**: Authenticate kubelets to the API server
- **etcd peer and client certificates**: Secure communication between etcd members and from the API server to etcd
- **Front proxy certificates**: Used by the API server aggregation layer
- **Service account signing key**: Signs service account tokens

By default, AKS auto-rotates non-CA certificates before they expire on clusters created or upgraded after March 2022. The expiration period depends on when the cluster was created: clusters created before May 2019 have certificates that expire after two years, while clusters created after May 2019 have Cluster CA certificates that expire after 30 years.

## Symptoms of Expired Certificates

When certificates expire, you will typically see one or more of these symptoms:

- `kubectl` commands fail with TLS handshake errors or unauthorized errors
- Nodes show as NotReady in the cluster
- Pods cannot be scheduled or restarted
- The Azure portal shows the cluster in a failed or unreachable state
- API server logs show certificate verification failures

The error messages often look like this:

```text
Unable to connect to the server: x509: certificate has expired or is not yet valid
```

or

```text
error: You must be logged in to the server (Unauthorized)
```

## Step 1: Check Certificate Expiration Dates

The first step is figuring out which certificates are close to expiration or already expired. Start with the Cluster CA certificate stored in your kubeconfig.

```bash
# Check the Cluster CA certificate expiration from your kubeconfig
kubectl config view --raw \
  -o jsonpath="{.clusters[?(@.name == 'myAKSCluster')].cluster.certificate-authority-data}" | \
  base64 -d | \
  openssl x509 -noout -dates -subject
```

You can also check from within the cluster if you still have access:

```bash
# Check the API server certificate expiration from a pod
# This connects to the API server and displays the certificate details
kubectl run cert-check --rm -it --image=alpine/openssl -- \
  s_client -connect kubernetes.default.svc:443 -servername kubernetes.default.svc </dev/null 2>/dev/null | \
  openssl x509 -noout -dates
```

If you cannot connect to the cluster at all, expired certificates are one possible cause, but you should also rule out networking, DNS, authentication, and cluster provisioning issues.

## Step 2: Check Node Certificate Status

If you can still reach the API server but nodes are having issues, check the kubelet certificate status on individual nodes.

```bash
# SSH into a node (via a debug pod or SSH jump box)
# Then check the kubelet certificate expiration
kubectl debug node/<node-name> -it --image=mcr.microsoft.com/cbl-mariner/busybox:2.0

# Inside the debug container, check certificate files through the host mount
chroot /host
openssl x509 -in /var/lib/kubelet/pki/kubelet-client-current.pem -noout -dates
openssl x509 -in /etc/kubernetes/certs/apiserver.crt -noout -dates
```

## Step 3: Perform Manual Certificate Rotation

If certificates are expired or close to expiring, trigger a manual rotation. AKS provides a built-in command for this.

```bash
# Rotate all cluster certificates manually
# This recreates the cluster nodes
az aks rotate-certs \
  --resource-group myResourceGroup \
  --name myAKSCluster
```

This command does the following:

1. Generates new certificates for all components
2. Updates the API server with the new certificates
3. Recreates the agent nodes, Azure Virtual Machine Scale Sets, and disks so nodes pick up the new certificates
4. Invalidates the old certificates used by existing kubeconfig entries

**Warning**: This operation recreates all agent nodes and can cause up to 30 minutes of downtime for the cluster. Plan for temporary disruption. On a large cluster, the full rotation can take 30 minutes or more.

## Step 4: Update Your Kubeconfig

After certificate rotation, your local kubeconfig is no longer valid because the API server certificate has changed. Download the new credentials.

```bash
# Get updated credentials after certificate rotation
az aks get-credentials \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --overwrite-existing

# Verify connectivity with the new credentials
kubectl get nodes
```

## Step 5: Verify the Rotation

After rotation completes, verify that everything is healthy.

```bash
# Check that all nodes are Ready
kubectl get nodes -o wide

# Check that system pods are running
kubectl get pods -n kube-system

# Verify API server certificate has been renewed
kubectl run cert-verify --rm -it --image=alpine/openssl -- \
  s_client -connect kubernetes.default.svc:443 -servername kubernetes.default.svc </dev/null 2>/dev/null | \
  openssl x509 -noout -dates -subject
```

## Handling Completely Unreachable Clusters

If your cluster is completely unreachable due to expired certificates, you cannot use `kubectl` to diagnose the issue. In this case, work entirely through the Azure CLI and Azure portal.

```bash
# Check cluster provisioning state
az aks show \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --query provisioningState -o tsv

# If the cluster is in a Failed state, try rotating certs
# This works even when kubectl cannot connect
az aks rotate-certs \
  --resource-group myResourceGroup \
  --name myAKSCluster

# Monitor the operation progress
az aks show \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --query provisioningState -o tsv
```

If the rotation fails on a completely broken cluster, you may need to open a support ticket with Microsoft. In some cases, the cluster may need to be reconciled before rotation can proceed.

## Preventing Certificate Expiration

The best approach is to never let certificates expire in the first place. Here are practical strategies:

### Enable Automatic Upgrades

AKS certificate autorotation is enabled for clusters created or upgraded after March 2022. Automatic upgrades help keep the cluster on supported versions where certificate autorotation is available.

```bash
# Enable automatic cluster upgrades
az aks update \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --auto-upgrade-channel patch
```

### Set Up Monitoring Alerts

Create a scheduled check that warns when the Cluster CA certificate in kubeconfig is within 30 days of expiration. Run this from Azure Cloud Shell, Azure Automation, or your CI/CD system with access to the cluster credentials.

```bash
# Exit non-zero if the Cluster CA certificate expires within 30 days
EXPIRY_DATE=$(kubectl config view --raw \
  -o jsonpath="{.clusters[?(@.name == 'myAKSCluster')].cluster.certificate-authority-data}" | \
  base64 -d | \
  openssl x509 -noout -enddate | cut -d= -f2)

EXPIRY_SECONDS=$(date -d "$EXPIRY_DATE" +%s)
WARNING_SECONDS=$(date -d "+30 days" +%s)

if [ "$EXPIRY_SECONDS" -le "$WARNING_SECONDS" ]; then
  echo "AKS Cluster CA certificate expires within 30 days: $EXPIRY_DATE"
  exit 1
fi
```

### Schedule Regular Rotations

Even with automatic upgrades, it is good practice to schedule certificate checks and rotate certificates when required by your security policy or when expiration is approaching. You can automate this with an Azure Automation runbook or a simple cron job in your CI/CD pipeline.

```bash
# Simple script to rotate when required by your policy
# Run this monthly from your CI/CD pipeline

CLUSTER_NAME="myAKSCluster"
RESOURCE_GROUP="myResourceGroup"

# Check if cluster is healthy
STATE=$(az aks show -g $RESOURCE_GROUP -n $CLUSTER_NAME --query provisioningState -o tsv)

if [ "$STATE" = "Succeeded" ]; then
  echo "Cluster is healthy, performing certificate rotation"
  az aks rotate-certs -g $RESOURCE_GROUP -n $CLUSTER_NAME --yes
else
  echo "Cluster is in state: $STATE - skipping rotation"
fi
```

## Certificate Rotation Timeline

Here is what happens during the certificate rotation process:

```mermaid
sequenceDiagram
    participant Admin
    participant AzureCLI
    participant ControlPlane
    participant Nodes

    Admin->>AzureCLI: az aks rotate-certs
    AzureCLI->>ControlPlane: Trigger certificate generation
    ControlPlane->>ControlPlane: Generate new CA and certs
    ControlPlane->>ControlPlane: Update API server certs
    Note over ControlPlane: API server briefly unavailable
    ControlPlane->>Nodes: Recreate agent nodes
    Nodes->>Nodes: Download new kubelet certs
    Nodes->>ControlPlane: Re-register with new certs
    ControlPlane->>AzureCLI: Rotation complete
    AzureCLI->>Admin: Success
```

## Common Issues During Rotation

**Rotation takes too long**: On clusters with many nodes (50+), rotation can take over an hour. AKS recreates the agent nodes, Azure Virtual Machine Scale Sets, and disks during rotation. Be patient and monitor with `az aks show`.

**Pods with PodDisruptionBudgets block rotation**: If you have strict PDBs that prevent draining nodes, the rotation may stall. Temporarily relax PDBs if needed.

**Azure AD integration complications**: If your cluster uses Azure AD for authentication, the rotation only affects the internal cluster certificates. Azure AD tokens are managed separately and are not impacted.

**Stuck in Rotating state**: If the rotation gets stuck, check the activity log in the Azure portal for specific error messages. Common causes include compute quota, capacity, or node recreation problems.

Certificate management in AKS is mostly automatic, but knowing how to diagnose and manually intervene when things go wrong is an essential skill for any AKS operator. Set up your monitoring, enable automatic upgrades, and you will rarely need to deal with certificate emergencies.
