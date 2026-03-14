# How to Troubleshoot Installation Issues with Calico on OpenShift Hosted Control Planes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Hosted Control Planes, HyperShift, Kubernetes, Networking, Troubleshooting

Description: A diagnostic guide for resolving Calico installation and networking failures specific to OpenShift Hosted Control Plane environments.

---

## Introduction

OpenShift Hosted Control Planes introduce a unique troubleshooting challenge: the Kubernetes control plane that Calico depends on runs in the management cluster, not on the worker nodes. If Calico on the worker nodes cannot reach the hosted cluster's API server, all Calico operations fail — including IPAM, policy enforcement, and workload endpoint management. This connectivity dependency across cluster boundaries is the most common source of Calico failures in HCP environments.

Beyond the API server connectivity issue, HCP-specific failures include CIDR overlap between hosted clusters, SCC misconfiguration inherited from the management cluster, and kubeconfig issues when the API server endpoint changes.

This guide covers the most common Calico installation failures on OpenShift Hosted Control Planes.

## Prerequisites

- Calico installation attempted on OpenShift Hosted Control Plane worker nodes
- `kubectl` configured with the hosted cluster kubeconfig
- `oc` access to both the management and hosted clusters

## Step 1: Verify API Server Connectivity from Worker Nodes

The most critical check in HCP environments.

```bash
# SSH into a worker node
curl -k https://<hosted-cluster-api-server>:6443/healthz
```

If this fails, Calico cannot function. Check:
- Network routing from worker nodes to the management cluster
- Firewall rules on port 6443
- The API server's DNS resolution from the worker nodes

## Step 2: Check Calico Pod Status on Hosted Cluster

```bash
export KUBECONFIG=hosted-kubeconfig.yaml
kubectl get pods -n calico-system
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50
```

## Step 3: Diagnose CIDR Overlap

```bash
# On the management cluster
oc get hostedcluster -A -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.networking.clusterNetwork[0].cidr}{"\n"}{end}'
```

If two hosted clusters share overlapping pod CIDRs, routing will be broken. Fix by reassigning one cluster's IP pool to a non-overlapping range.

## Step 4: Check SCCs on Hosted Cluster

```bash
export KUBECONFIG=hosted-kubeconfig.yaml
kubectl describe pod -n calico-system <calico-node-pod> | grep -i "scc\|security\|forbidden"
```

If SCC violations are present:

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/ocp/calico-scc.yaml
```

## Step 5: Verify Kubeconfig Accuracy

Worker nodes must have an accurate kubeconfig pointing to the hosted cluster's API server.

```bash
# On a worker node
cat /etc/kubernetes/kubelet.conf | grep server
```

If the API server endpoint has changed (due to a node pool replacement or load balancer change), update the kubeconfig.

## Step 6: Check Tigera Operator Logs

```bash
kubectl logs -n tigera-operator deploy/tigera-operator --tail=50
```

## Conclusion

Troubleshooting Calico on OpenShift Hosted Control Planes centers on API server connectivity from worker nodes, CIDR overlap between hosted clusters, SCC violations, and kubeconfig accuracy. The API server connectivity check is the most important and should always be the first step, as without it, all Calico operations will fail regardless of other configuration settings.
