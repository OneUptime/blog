# How to Install Rancher on a Kubernetes Cluster with Helm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Helm, Installation

Description: A complete guide to deploying Rancher Server on a Kubernetes cluster using Helm for a production-ready, highly available setup.

Deploying Rancher on a Kubernetes cluster using Helm is the recommended approach for production environments. This method provides high availability, easier upgrades, and better scalability compared to single-node Docker installations. In this guide, you will walk through every step required to get Rancher running on a Kubernetes cluster using Helm.

## Prerequisites

Before you begin, ensure you have:

- A running Kubernetes cluster on a Rancher-supported Kubernetes version; for production high availability, use at least 3 nodes
- `kubectl` installed and configured to access your cluster
- Helm 3 installed on your workstation, using a version compatible with your Kubernetes version
- An ingress controller available in the cluster. RKE2 and K3s include one by default, but managed Kubernetes services typically require you to install one first
- A fully qualified domain name (FQDN) pointing to your cluster's load balancer
- For a small production HA setup, at least 4 vCPUs and 16 GB of RAM per node for the nodes running Rancher

## Step 1: Install Helm

If Helm is not already installed, install it with:

```bash
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

Verify the installation:

```bash
helm version
```

## Step 2: Install cert-manager

Rancher uses cert-manager to issue and manage TLS certificates. Install it before deploying Rancher:

Add the Jetstack Helm repository:

```bash
helm repo add jetstack https://charts.jetstack.io --force-update
helm repo update
```

Install cert-manager:

```bash
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

Verify cert-manager is running:

```bash
kubectl get pods -n cert-manager
```

All three pods (cert-manager, cert-manager-cainjector, and cert-manager-webhook) should be in the Running state.

## Step 3: Add the Rancher Helm Repository

Add the Rancher Helm chart repository. Choose the appropriate channel:

```bash
# For the latest release channel (useful for testing newer builds)

helm repo add rancher-latest https://releases.rancher.com/server-charts/latest

# For the stable release channel (recommended for production)
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable

helm repo update
```

## Step 4: Create the cattle-system Namespace

Rancher must be installed in the `cattle-system` namespace:

```bash
kubectl create namespace cattle-system
```

## Step 5: Install Rancher with Helm

Deploy Rancher using Helm. Replace `rancher.yourdomain.com` with your actual domain name:

```bash
helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set hostname=rancher.yourdomain.com \
  --set bootstrapPassword=yourSecureBootstrapPassword \
  --set replicas=3
```

The `replicas=3` setting ensures high availability by running three Rancher server pods.
If your ingress controller requires an explicit ingress class, add `--set ingress.ingressClassName=<your-ingress-class>` to the install command.

## Step 6: Wait for the Deployment to Complete

Monitor the rollout status:

```bash
kubectl rollout status deployment rancher -n cattle-system
```

Check the pods:

```bash
kubectl get pods -n cattle-system
```

You should see three Rancher pods in the Running state.

## Step 7: Verify the Installation

Check that the Rancher deployment is healthy:

```bash
kubectl get deployments -n cattle-system
kubectl get ingress -n cattle-system
```

The ingress should show your configured hostname.

## Step 8: Access the Rancher UI

Open your browser and navigate to:

```plaintext
https://rancher.yourdomain.com
```

On the first login screen:

1. Enter the bootstrap password you set during installation
2. Set a new admin password
3. Configure the Rancher server URL
4. Accept the terms and conditions

## Step 9: Configure DNS

Make sure your DNS record for `rancher.yourdomain.com` points to the address exposed by your ingress controller. You can verify the Rancher ingress address with:

```bash
kubectl get ingress -n cattle-system
```

If your ingress controller is exposed through a `LoadBalancer` service, its external IP or hostname is usually on that service, often in a namespace such as `ingress-nginx`, `traefik`, or `kube-system`.
If you are using an ingress controller like NGINX, ensure it is properly configured to route traffic to the Rancher service.

## Customizing the Installation

You can customize the Rancher installation with additional Helm values. Create a `values.yaml` file:

```yaml
hostname: rancher.yourdomain.com
replicas: 3
bootstrapPassword: yourSecureBootstrapPassword
ingress:
  tls:
    source: rancher
  extraAnnotations:
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "30"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "1800"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "1800"
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 1Gi
auditLog:
  level: 1
```

Install with custom values:

```bash
helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  -f values.yaml
```

## Upgrading Rancher

To upgrade Rancher to a newer version:

```bash
helm repo update
helm upgrade rancher rancher-stable/rancher \
  --namespace cattle-system \
  --reuse-values \
  --set hostname=rancher.yourdomain.com \
  --set replicas=3
```

## Troubleshooting

If Rancher does not start properly:

```bash
# Check pod status
kubectl get pods -n cattle-system

# View pod logs
kubectl logs -l app=rancher -n cattle-system --tail=100

# Check events
kubectl get events -n cattle-system --sort-by='.lastTimestamp'

# Verify cert-manager
kubectl get certificates -n cattle-system
```

Common issues include:

- **cert-manager not ready**: Wait for cert-manager pods to be fully running before installing Rancher
- **DNS not configured**: Ensure your domain points to the cluster's ingress
- **Insufficient resources**: For production HA, size the upstream cluster according to Rancher installation requirements; current small-cluster guidance is 4 vCPUs and 16 GB RAM per node

## Conclusion

You have successfully installed Rancher on a Kubernetes cluster using Helm. This setup provides high availability with three replicas and is suitable for production environments. From the Rancher dashboard, you can now create and manage multiple Kubernetes clusters across different infrastructure providers.
