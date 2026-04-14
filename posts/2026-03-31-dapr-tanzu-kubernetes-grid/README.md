# How to Use Dapr with Tanzu Kubernetes Grid

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Tanzu, VMware, Kubernetes, Enterprise

Description: Deploy Dapr on VMware Tanzu Kubernetes Grid (TKG) clusters using Tanzu CLI and Helm, with Tanzu Observability integration for metrics and distributed tracing.

---

VMware Tanzu Kubernetes Grid (TKG) provides enterprise Kubernetes clusters with built-in lifecycle management and observability integrations. Dapr deploys on TKG clusters using standard Helm charts with additional considerations for Tanzu's networking and security features.

## Prerequisites

Install the Tanzu CLI and connect to your management cluster:

```bash
# Install Tanzu CLI
brew install vmware-tanzu/tanzu/tanzu-cli

# Log in to Tanzu Mission Control
tanzu login

# List available clusters
tanzu cluster list

# Get kubeconfig for a workload cluster
tanzu cluster kubeconfig get my-workload-cluster \
  --admin \
  --export-file ~/.kube/tkg-workload.yaml

export KUBECONFIG=~/.kube/tkg-workload.yaml
kubectl get nodes
```

## Installing Dapr on TKG

TKG clusters support standard Kubernetes tooling. Install Dapr with Helm:

```bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update

# TKG uses strict pod security policies - install with HA and proper security context
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --set global.ha.enabled=true \
  --set global.logLevel=info \
  --wait

# Verify
kubectl get pods -n dapr-system
dapr status -k
```

## TKG Pod Security Admission

TKG 2.x uses Kubernetes Pod Security Admission instead of PSPs. Label namespaces appropriately:

```bash
# Allow Dapr system namespace to run privileged components
kubectl label namespace dapr-system \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/audit=privileged \
  pod-security.kubernetes.io/warn=privileged

# For application namespaces, use baseline or restricted
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=baseline
```

## Tanzu Observability Integration

Configure Dapr to send traces to Tanzu Observability (Wavefront) through a Wavefront proxy:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-config
  namespace: production
spec:
  tracing:
    samplingRate: "0.1"
    otel:
      endpointAddress: "wavefront-proxy.observability:4318"
      isSecure: false
      protocol: http
  metrics:
    enabled: true
```

## TKG ClusterClass-Based Cluster with Dapr

When provisioning new TKG clusters, automate Dapr installation as a post-create step:

```yaml
# tanzu-cluster-post-install.yaml
apiVersion: addons.cluster.x-k8s.io/v1beta1
kind: ClusterResourceSet
metadata:
  name: dapr-install
  namespace: tkg-system
spec:
  clusterSelector:
    matchLabels:
      dapr-enabled: "true"
  resources:
  - name: dapr-namespace
    kind: ConfigMap
```

Or use a Tanzu ClusterBootstrap package to deploy Dapr as part of cluster provisioning.

## Networking with NSX-T

TKG on vSphere with NSX-T uses NSX Load Balancer. Expose Dapr applications:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service
  namespace: production
spec:
  type: LoadBalancer
  selector:
    app: order-service
  ports:
  - port: 80
    targetPort: 8080
```

NSX-T allocates an external IP automatically from the configured IP pool.

## Deploying a Dapr Application

```bash
# Apply component definitions
kubectl apply -f components/ -n production

# Deploy the application
kubectl apply -f deployment.yaml -n production

# Verify sidecar injection
kubectl get pods -n production -o wide

# Check Dapr component status
dapr components -k -n production
```

## Summary

Dapr on Tanzu Kubernetes Grid uses standard Helm installation with additional Pod Security Admission labels for TKG namespaces. Tanzu Observability integration uses the OpenTelemetry exporter configured in the Dapr Configuration resource. TKG's enterprise lifecycle management and NSX-T networking complement Dapr's microservices runtime for production enterprise workloads.
