# How to Migrate Existing Workloads to Calico on OpenShift Hosted Control Planes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Hosted Control Planes, HyperShift, Kubernetes, Networking, Migration

Description: A guide to migrating workloads from OVN-Kubernetes to Calico on OpenShift Hosted Control Plane clusters.

---

## Introduction

Migrating workloads on OpenShift Hosted Control Planes from OVN-Kubernetes to Calico is a cluster-to-cluster workload migration. The hosted cluster should be created with a non-default CNI configuration, and Calico should be installed before workloads are moved. Do not remove OVN-Kubernetes daemonsets from an existing hosted cluster as an in-place CNI replacement.

The migration affects only the source and destination hosted clusters' data planes. The management cluster continues to run normally throughout, and sibling hosted clusters are unaffected. However, all workloads moved to the new hosted cluster will receive new pod IPs.

This guide covers migrating workloads to Calico on an OpenShift Hosted Control Plane cluster.

## Prerequisites

- A source OpenShift Hosted Control Plane cluster with OVN-Kubernetes
- Access to the management cluster used to create hosted clusters
- `kubectl`, `oc`, `hypershift`, and `curl` installed
- Kubeconfigs for the source hosted cluster, destination hosted cluster, and management cluster
- A maintenance window for the hosted cluster

## Step 1: Backup Hosted Cluster Workload State

```bash
export KUBECONFIG=source-hosted-kubeconfig.yaml
kubectl get all -A -o yaml > pre-migration-workloads.yaml
kubectl get networkpolicies -A -o yaml > pre-migration-policies.yaml
```

Use your GitOps repository, application manifests, or backup tooling as the source of truth for the actual restore. The `kubectl get all` output is useful for inventory, but it includes generated fields and does not include every Kubernetes resource type.

## Step 2: Create a Destination Hosted Cluster Without the Default CNI

```bash
export KUBECONFIG=management-cluster-kubeconfig.yaml
HOSTED_CLUSTER_NAME=calico-hosted
REGION=us-west-2
BASE_DOMAIN=example.com
AWS_CREDS="$HOME/.aws/credentials"
PULL_SECRET="$HOME/.secrets/redhat-pull-secret.txt"

hypershift create cluster aws \
  --name "$HOSTED_CLUSTER_NAME" \
  --node-pool-replicas=3 \
  --base-domain "$BASE_DOMAIN" \
  --pull-secret "$PULL_SECRET" \
  --aws-creds "$AWS_CREDS" \
  --region "$REGION" \
  --generate-ssh \
  --network-type Other
```

Wait for the hosted control plane to become available. Worker nodes may remain `NotReady` until Calico is installed.

## Step 3: Install Calico on the Destination Hosted Cluster

```bash
export KUBECONFIG=destination-hosted-kubeconfig.yaml

mkdir calico
curl -L https://github.com/projectcalico/calico/releases/download/v3.32.0/ocp.tgz | \
  tar xvz --strip-components=1 -C calico

sed -i 's/^\(\s*linuxDataplane:\s*\)BPF/\1Iptables/' calico/03-cr-installation.yaml
rm -f calico/cluster-network-operator.yaml calico/01-configmap-kubernetes-services-endpoint.yaml

cd calico
ls 00* | xargs -n1 oc apply -f
ls 01* | xargs -n1 oc apply -f
ls 02* | xargs -n1 oc apply -f
timeout --foreground 600 bash -c "while ! kubectl get crd installations.operator.tigera.io; do sleep 5; done"
ls 03* | xargs -n1 oc apply -f
```

## Step 4: Verify Calico and Node Readiness

```bash
kubectl get tigerastatus
kubectl get nodes
```

Wait for Calico status to become available and for the destination hosted cluster's worker nodes to become `Ready`.

## Step 5: Restore Workloads and Network Policies

```bash
export KUBECONFIG=destination-hosted-kubeconfig.yaml
kubectl apply -f path/to/application-manifests/
kubectl apply -f pre-migration-policies.yaml
kubectl get pods -A -o wide
```

Wait for pods to start with Calico IPs.

## Step 6: Verify and Cut Over Traffic

Test connectivity between key workloads and confirm external Routes on the destination hosted cluster are working before moving DNS records, load balancer configuration, or other traffic entry points from the source cluster to the destination cluster.

## Conclusion

Migrating workloads to Calico on an OpenShift Hosted Control Plane cluster is scoped to the hosted clusters' data planes, making it an isolated operation that does not affect the management cluster or sibling hosted clusters. Use a destination hosted cluster created for Calico, install Calico there, restore workloads, validate networking, and then cut traffic over.
