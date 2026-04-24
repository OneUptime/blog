# How to Deploy Kubernetes Operators via Portainer - K8s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Operator, CRD, DevOps

Description: Deploy and manage Kubernetes Operators that extend cluster functionality using Portainer's Kubernetes YAML interface.

## Introduction

Kubernetes Operators are controllers that extend Kubernetes functionality for specific applications. They use Custom Resource Definitions (CRDs) to manage complex applications like databases, monitoring stacks, and message queues. Portainer's manifest deployment options support deploying Operators and their CRDs.

## Deploying the Cert-Manager Operator

```bash
# Deploy Cert-Manager via Portainer's Helm integration
# Applications > Create from code > Helm chart
# If the Jetstack repo is not already available, add it in Account settings > Helm repositories:
# URL: https://charts.jetstack.io

# Then select the Jetstack chart source and search for "cert-manager"
# Set namespace: cert-manager
# In Values, enable CRDs:
# crds:
#   enabled: true
#
# Or install via kubectl manifest:

kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.20.2/cert-manager.yaml

# Verify installation
kubectl get pods -n cert-manager
```

## Deploy Prometheus Operator via Portainer

```bash
# Add the Prometheus community Helm repo in Portainer
# Account settings > Helm repositories > Add Helm repository
# URL: https://prometheus-community.github.io/helm-charts

# Then deploy via Applications > Create from code > Helm chart
# Select the Prometheus Community chart source
# Search: kube-prometheus-stack
# Configure values and install
```

## Deploying an Operator via YAML

```bash
# Deploy CloudNativePG via Portainer's Manifest deployment
# Applications > Create from code > Manifest > URL
# Leave Namespace as default and enable "Use namespace(s) specified from manifest"
# URL: https://github.com/cloudnative-pg/cloudnative-pg/releases/download/v1.29.0/cnpg-1.29.0.yaml

# Or install via kubectl:
kubectl apply --server-side -f https://github.com/cloudnative-pg/cloudnative-pg/releases/download/v1.29.0/cnpg-1.29.0.yaml

# Verify installation
kubectl rollout status deployment -n cnpg-system cnpg-controller-manager
```

## Using Custom Resources After Operator Deployment

```yaml
# Create a managed PostgreSQL cluster via the CloudNativePG CRD
# Deploy this manifest to the namespace where you want the database cluster to run
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: production-db
spec:
  instances: 3
  primaryUpdateStrategy: unsupervised
  storage:
    size: 50Gi
```

## Popular Operators to Deploy via Portainer

| Operator | Purpose | Helm Chart |
|----------|---------|------------|
| cert-manager | TLS certificates | jetstack/cert-manager |
| Prometheus Operator | Monitoring | prometheus-community/kube-prometheus-stack |
| CloudNativePG | Managed PostgreSQL | cnpg/cloudnative-pg |
| MinIO Operator | Object storage | minio-operator/operator |
| Strimzi Kafka Operator | Apache Kafka | oci://quay.io/strimzi-helm/strimzi-kafka-operator |
| Vault Secrets Operator | Secrets management | hashicorp/vault-secrets-operator |

## Monitoring Operators in Portainer

Operators deployed from manifests or Helm charts appear as Applications in Portainer:
- **Applications** - inspect the deployed operator and its associated workloads
- **Namespaces** - review the namespace that hosts the operator
- **More resources > Custom Resources** - inspect CRDs and custom resources directly (admin users in Portainer Business Edition)

```bash
# Check Operator status
kubectl get deployment -n cnpg-system cnpg-controller-manager
kubectl get crd | grep postgresql.cnpg.io

# View Custom Resource instances
kubectl get clusters.postgresql.cnpg.io -A
```

## Conclusion

Kubernetes Operators deployed via Portainer extend cluster capabilities with managed services for databases, monitoring, and more. Portainer's manifest and Helm workflows make deploying Operators straightforward, while the workload views provide operational visibility into Operator deployments and their managed resources. Custom resources created through Operators can also be inspected in Portainer's Custom Resources view in Portainer Business Edition.
