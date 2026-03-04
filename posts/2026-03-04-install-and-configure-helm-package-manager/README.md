# How to Install and Configure Helm Package Manager on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Helm, Kubernetes, Containers, Linux

Description: Learn how to install and Configure Helm Package Manager on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Helm is the package manager for Kubernetes, simplifying the deployment and management of applications through reusable chart templates. It handles complex multi-resource deployments with a single command.

## Prerequisites

- RHEL 9 with kubectl configured
- Access to a Kubernetes cluster

## Step 1: Install Helm

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
```

## Step 2: Add Chart Repositories

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

## Step 3: Search for Charts

```bash
helm search repo nginx
helm search repo postgresql
```

## Step 4: Install a Chart

```bash
helm install my-nginx ingress-nginx/ingress-nginx   --namespace ingress   --create-namespace   --set controller.replicaCount=2
```

## Step 5: Customize with Values File

```bash
vi my-values.yaml
```

```yaml
controller:
  replicaCount: 2
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 256Mi
  service:
    type: LoadBalancer
```

```bash
helm install my-nginx ingress-nginx/ingress-nginx -f my-values.yaml --namespace ingress
```

## Step 6: Manage Releases

```bash
helm list -A                           # List all releases
helm status my-nginx -n ingress        # Check release status
helm history my-nginx -n ingress       # View release history
helm upgrade my-nginx ingress-nginx/ingress-nginx -f my-values.yaml -n ingress
helm rollback my-nginx 1 -n ingress    # Rollback to revision 1
helm uninstall my-nginx -n ingress     # Remove release
```

## Step 7: Inspect Charts

```bash
helm show values ingress-nginx/ingress-nginx   # Show default values
helm show chart ingress-nginx/ingress-nginx    # Show chart metadata
helm template my-nginx ingress-nginx/ingress-nginx -f my-values.yaml  # Render locally
```

## Conclusion

Helm on RHEL 9 streamlines Kubernetes application deployment with templated charts, release management, and easy rollbacks. It is the standard tool for managing complex Kubernetes applications in both development and production environments.
