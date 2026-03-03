# How to Set Up Federation Across Talos Linux Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Cluster Federation, Multi-Cluster, KubeFed

Description: Learn how to set up Kubernetes federation across multiple Talos Linux clusters for unified workload management and cross-cluster resource distribution.

---

Cluster federation lets you treat multiple Kubernetes clusters as a single logical unit. Instead of deploying applications to each cluster individually, you define your workloads once and let the federation layer distribute them. For organizations running Talos Linux clusters across regions or environments, federation simplifies operations significantly.

This guide covers setting up Kubernetes federation across Talos Linux clusters using both the KubeFed project and newer approaches like Admiralty or Liqo.

## What Federation Gives You

Federation is not just about convenience. It provides real operational benefits. You can deploy workloads across clusters for high availability. If one cluster goes down, traffic shifts to another. You can distribute workloads based on capacity, latency, or cost. Compliance requirements that demand data locality become easier to handle when you can control where workloads land.

The tradeoff is complexity. Federation adds another layer to manage. But for teams already running multiple Talos clusters, that complexity often pays for itself.

## Prerequisites

Before setting up federation, you need at least two Talos Linux clusters running and accessible. Each cluster should have:

- A working kubeconfig
- Network connectivity between clusters (or at least from the host cluster to member clusters)
- A CNI plugin installed (Cilium or Flannel work well)

```bash
# Verify both clusters are healthy
export KUBECONFIG=~/talos-clusters/cluster-a/kubeconfig
kubectl get nodes

export KUBECONFIG=~/talos-clusters/cluster-b/kubeconfig
kubectl get nodes
```

## Setting Up KubeFed

KubeFed (Kubernetes Federation v2) is the official federation project. It uses a host cluster to manage member clusters. The host cluster runs the federation control plane, and member clusters join the federation.

First, install KubeFed on your host cluster:

```bash
# Switch to the host cluster
export KUBECONFIG=~/talos-clusters/cluster-a/kubeconfig

# Add the KubeFed Helm repo
helm repo add kubefed-charts https://raw.githubusercontent.com/kubernetes-sigs/kubefed/master/charts
helm repo update

# Install KubeFed
helm install kubefed kubefed-charts/kubefed \
  --namespace kube-federation-system \
  --create-namespace \
  --set controllermanager.replicaCount=2
```

Wait for the KubeFed components to come up:

```bash
# Check that pods are running
kubectl get pods -n kube-federation-system
# NAME                                          READY   STATUS
# kubefed-admission-webhook-xxx                 1/1     Running
# kubefed-controller-manager-xxx                1/1     Running
# kubefed-controller-manager-xxx                1/1     Running
```

## Joining Member Clusters

Now register both clusters with the federation. The host cluster is typically also a member:

```bash
# Install kubefedctl
curl -LO https://github.com/kubernetes-sigs/kubefed/releases/download/v0.10.0/kubefedctl-0.10.0-linux-amd64.tgz
tar xzf kubefedctl-0.10.0-linux-amd64.tgz
sudo mv kubefedctl /usr/local/bin/

# Join cluster-a (the host) as a member
kubefedctl join cluster-a \
  --host-cluster-context=cluster-a \
  --cluster-context=cluster-a \
  --v=2

# Join cluster-b as a member
kubefedctl join cluster-b \
  --host-cluster-context=cluster-a \
  --cluster-context=cluster-b \
  --v=2
```

Verify the clusters are joined:

```bash
kubectl get kubefedclusters -n kube-federation-system
# NAME        AGE   READY
# cluster-a   30s   True
# cluster-b   15s   True
```

## Federating Resources

KubeFed works by federating existing Kubernetes resource types. You enable federation for specific resource types, then create federated versions of those resources.

```bash
# Enable federation for Deployments, Services, and ConfigMaps
kubefedctl enable deployments.apps
kubefedctl enable services
kubefedctl enable configmaps
```

Now create a federated deployment:

```yaml
# federated-nginx.yaml
apiVersion: types.kubefed.io/v1beta1
kind: FederatedDeployment
metadata:
  name: nginx
  namespace: default
spec:
  template:
    metadata:
      labels:
        app: nginx
    spec:
      replicas: 3
      selector:
        matchLabels:
          app: nginx
      template:
        metadata:
          labels:
            app: nginx
        spec:
          containers:
            - name: nginx
              image: nginx:1.25
              ports:
                - containerPort: 80
  placement:
    clusters:
      - name: cluster-a
      - name: cluster-b
  overrides:
    - clusterName: cluster-a
      clusterOverrides:
        - path: "/spec/replicas"
          value: 2
    - clusterName: cluster-b
      clusterOverrides:
        - path: "/spec/replicas"
          value: 1
```

```bash
kubectl apply -f federated-nginx.yaml
```

This creates the nginx deployment on both clusters, with 2 replicas on cluster-a and 1 replica on cluster-b.

## Using Liqo as an Alternative

Liqo is a newer approach to multi-cluster that works differently from KubeFed. Instead of federating resources, Liqo creates virtual nodes that represent remote clusters. Pods scheduled on virtual nodes actually run on the remote cluster.

```bash
# Install Liqo on cluster-a
curl -sL https://get.liqo.io | bash

# Install Liqo on cluster-b
export KUBECONFIG=~/talos-clusters/cluster-b/kubeconfig
curl -sL https://get.liqo.io | bash
```

Peer the clusters together:

```bash
# On cluster-a, generate the peering command
export KUBECONFIG=~/talos-clusters/cluster-a/kubeconfig
liqoctl generate peer-command

# The output gives you a command to run on cluster-b
# Run it on cluster-b
export KUBECONFIG=~/talos-clusters/cluster-b/kubeconfig
liqoctl peer --remote-kubeconfig ~/talos-clusters/cluster-a/kubeconfig
```

Once peered, you will see virtual nodes appear:

```bash
export KUBECONFIG=~/talos-clusters/cluster-a/kubeconfig
kubectl get nodes
# NAME                STATUS   ROLES
# talos-cp-1          Ready    control-plane
# talos-worker-1      Ready    <none>
# liqo-cluster-b      Ready    agent    # virtual node representing cluster-b
```

Now you can schedule pods on the remote cluster just by using node affinity or tolerations:

```yaml
# deploy-to-remote.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-remote
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx-remote
  template:
    metadata:
      labels:
        app: nginx-remote
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: liqo.io/type
                    operator: In
                    values:
                      - virtual-node
      containers:
        - name: nginx
          image: nginx:1.25
```

## Network Connectivity Between Clusters

For federation to work properly, clusters need network connectivity. With Talos Linux, you have several options. If clusters are on the same network, direct connectivity works. For clusters in different networks or cloud regions, you need a mesh VPN or tunnel.

Cilium ClusterMesh is an excellent option for Talos clusters already using Cilium as their CNI:

```bash
# Enable ClusterMesh on both clusters
cilium clustermesh enable --context cluster-a
cilium clustermesh enable --context cluster-b

# Connect the clusters
cilium clustermesh connect --context cluster-a --destination-context cluster-b
```

This establishes encrypted tunnels between clusters and enables cross-cluster service discovery.

## Handling Failures

Federation needs to handle cluster failures gracefully. Configure health checks and failover policies:

```yaml
# replica-scheduling-preference.yaml
apiVersion: scheduling.kubefed.io/v1alpha1
kind: ReplicaSchedulingPreference
metadata:
  name: nginx
  namespace: default
spec:
  targetKind: FederatedDeployment
  totalReplicas: 6
  rebalance: true
  clusters:
    cluster-a:
      weight: 2
      maxReplicas: 4
    cluster-b:
      weight: 1
      maxReplicas: 3
```

When cluster-b becomes unavailable, KubeFed redistributes replicas to cluster-a based on the weights and limits you define.

## Monitoring Federation Status

Keep an eye on federation health by monitoring the KubeFed controller manager logs and the status of federated resources:

```bash
# Check federation controller logs
kubectl logs -n kube-federation-system -l control-plane=controller-manager -f

# Check status of federated deployments
kubectl get federateddeployments -A -o wide

# Check cluster status
kubectl get kubefedclusters -n kube-federation-system -o yaml
```

## Practical Recommendations

Start with a simple two-cluster federation before scaling up. Test failover scenarios early and often. Use Liqo if you want a simpler model that does not require learning new resource types. Use KubeFed if you need fine-grained control over placement and overrides. Regardless of which approach you choose, make sure you have solid monitoring and alerting in place before relying on federation for production workloads.

Federation across Talos Linux clusters works well because Talos gives you consistent, predictable cluster behavior. The immutable OS means fewer surprises when distributing workloads, and the API-driven configuration makes it easy to automate the setup across many clusters.
