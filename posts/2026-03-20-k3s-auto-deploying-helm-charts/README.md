# How to Use K3s Auto-Deploying Helm Charts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Helm, GitOps, DevOps

Description: Learn how to use K3s's built-in HelmChart CRD to automatically deploy and manage Helm charts through the auto-deploy manifests directory.

## Introduction

K3s includes a built-in Helm controller that enables deploying Helm charts declaratively using a custom resource called `HelmChart`. By placing `HelmChart` resources in K3s's auto-deploy manifests directory, you can have Helm charts automatically installed and upgraded without running `helm install` manually. This is K3s's native, GitOps-friendly approach to Helm-based automation.

## Understanding the HelmChart CRD

K3s installs the `HelmChart` and `HelmChartConfig` custom resource definitions automatically. The Helm controller watches for these resources and manages Helm releases accordingly.

```bash
# Verify the HelmChart CRD is available

kubectl get crd | grep helm

# View existing HelmChart resources (K3s uses these internally)
kubectl get helmcharts -n kube-system
```

## Step 1: Basic HelmChart Resource

Create a `HelmChart` resource in the auto-deploy manifests directory:

```yaml
# /var/lib/rancher/k3s/server/manifests/cert-manager.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: cert-manager
  namespace: kube-system
spec:
  # Helm chart repository and chart name
  repo: https://charts.jetstack.io
  chart: cert-manager
  # Chart version (use exact version for reproducibility)
  version: v1.14.4
  # Target namespace for the release
  targetNamespace: cert-manager
  # Create the namespace if it doesn't exist
  createNamespace: true
  # Values to pass to the chart
  set:
    installCRDs: "true"
    replicaCount: "1"
```

K3s will automatically install cert-manager when it reads this file.

## Step 2: Using valuesContent for Complex Values

For complex Helm values, use `valuesContent`:

```yaml
# /var/lib/rancher/k3s/server/manifests/prometheus.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: kube-prometheus-stack
  namespace: kube-system
spec:
  repo: https://prometheus-community.github.io/helm-charts
  chart: kube-prometheus-stack
  version: "56.6.2"
  targetNamespace: monitoring
  createNamespace: true
  # Complex values using YAML block
  valuesContent: |-
    grafana:
      enabled: true
      adminPassword: "your-secure-password"
      persistence:
        enabled: true
        size: 10Gi
    prometheus:
      prometheusSpec:
        retention: 7d
        resources:
          requests:
            cpu: 200m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 2Gi
    alertmanager:
      enabled: true
    kubeStateMetrics:
      enabled: true
    nodeExporter:
      enabled: true
```

## Step 3: Combining set and valuesContent

You can use both `set` and `valuesContent`:

```yaml
# /var/lib/rancher/k3s/server/manifests/ingress-nginx.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: ingress-nginx
  namespace: kube-system
spec:
  repo: https://kubernetes.github.io/ingress-nginx
  chart: ingress-nginx
  version: "4.9.1"
  targetNamespace: ingress-nginx
  createNamespace: true
  # Simple key=value overrides
  set:
    controller.replicaCount: "2"
    controller.metrics.enabled: "true"
  # Complex nested values
  valuesContent: |-
    controller:
      service:
        type: LoadBalancer
      config:
        use-forwarded-headers: "true"
        compute-full-forwarded-for: "true"
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 512Mi
```

## Step 4: Using HelmChartConfig for Value Overrides

`HelmChartConfig` lets you override values for existing HelmChart resources (including K3s defaults):

```yaml
# /var/lib/rancher/k3s/server/manifests/traefik-config.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: traefik
  namespace: kube-system
spec:
  valuesContent: |-
    # Override default Traefik values
    ingressRoute:
      dashboard:
        enabled: true
    logs:
      general:
        level: ERROR
    ports:
      websecure:
        http:
          tls:
            enabled: true
    service:
      annotations:
        metallb.io/address-pool: default
```

## Step 5: Using Private Helm Repositories

For charts in private repositories:

```yaml
# /var/lib/rancher/k3s/server/manifests/private-chart.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: my-app
  namespace: kube-system
spec:
  repo: https://charts.example.com
  chart: my-app
  version: "1.2.3"
  targetNamespace: production
  createNamespace: true
  # Reference a secret for auth credentials
  authSecret:
    name: helm-repo-credentials
```

Create the credentials secret:

```bash
kubectl create secret generic helm-repo-credentials \
  -n kube-system \
  --type=kubernetes.io/basic-auth \
  --from-literal=username=myuser \
  --from-literal=password=mysecretpassword
```

## Step 6: Installing from OCI Registries

```yaml
# /var/lib/rancher/k3s/server/manifests/oci-chart.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: my-oci-app
  namespace: kube-system
spec:
  # OCI registry URL
  chart: oci://registry-1.docker.io/bitnamicharts/nginx
  version: "15.14.0"
  targetNamespace: web
  createNamespace: true
```

## Step 7: Monitor HelmChart Deployment

```bash
# Watch HelmChart resources
kubectl get helmcharts -n kube-system -w

# Check status of a specific chart
kubectl describe helmchart cert-manager -n kube-system

# View Helm controller logs
kubectl logs -n kube-system \
  -l app=helm-controller -f

# Check the Helm install/upgrade Jobs and pods
# K3s creates Helm Jobs and pods to run installations and upgrades
kubectl get jobs,pods -n kube-system | grep helm

# Check Helm release status directly
helm --kubeconfig /etc/rancher/k3s/k3s.yaml ls -n cert-manager
```

## Step 8: Updating Chart Versions

To upgrade a Helm chart, simply update the version in the HelmChart resource:

```bash
# Edit the HelmChart manifest
vi /var/lib/rancher/k3s/server/manifests/cert-manager.yaml

# Change version from v1.14.4 to a newer chart release
# If the new chart version changes its values schema, update the HelmChart values too
# K3s will automatically trigger a Helm upgrade
```

## Conclusion

K3s's HelmChart CRD provides a declarative, Kubernetes-native way to manage Helm chart deployments. By placing HelmChart resources in the auto-deploy manifests directory, you get automated chart installation and upgrades that persist across cluster restarts. This approach is ideal for bootstrapping cluster infrastructure (ingress controllers, monitoring stacks, cert-manager) in a GitOps-friendly way without additional tooling.
