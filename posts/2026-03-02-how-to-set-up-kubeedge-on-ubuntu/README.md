# How to Set Up KubeEdge on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kubernetes, Edge Computing, KubeEdge, IoT

Description: Learn how to install and configure KubeEdge on Ubuntu to extend Kubernetes workloads to edge nodes for IoT and distributed computing scenarios.

---

KubeEdge extends Kubernetes capabilities to edge environments, letting you manage edge nodes and workloads from a central cloud control plane. It is useful for IoT deployments, industrial automation, retail edge computing, and anywhere you need to run containerized workloads close to data sources while maintaining central orchestration.

This tutorial walks through setting up a KubeEdge cluster with a cloud-side component (CloudCore) on an Ubuntu control plane node and an edge-side component (EdgeCore) on an Ubuntu edge node.

## Prerequisites

Before starting, make sure you have:

- Two Ubuntu 22.04 machines (one for cloud, one for edge)
- Kubernetes already running on the cloud node
- kubectl configured on the cloud node
- Root or sudo access on both machines
- Network connectivity between cloud and edge nodes

If you do not have Kubernetes set up, install it first using kubeadm.

## Installing keadm

`keadm` is the KubeEdge admin tool, similar to kubeadm for Kubernetes. Install it on both the cloud and edge nodes.

```bash
# Download the latest keadm release
KUBEEDGE_VERSION=v1.17.0
wget https://github.com/kubeedge/kubeedge/releases/download/${KUBEEDGE_VERSION}/keadm-${KUBEEDGE_VERSION}-linux-amd64.tar.gz

# Extract the archive
tar -xvzf keadm-${KUBEEDGE_VERSION}-linux-amd64.tar.gz

# Move keadm to a location in your PATH
sudo mv keadm-${KUBEEDGE_VERSION}-linux-amd64/keadm /usr/local/bin/keadm

# Verify installation
keadm version
```

## Setting Up CloudCore (Cloud Node)

CloudCore runs on the Kubernetes control plane and acts as the bridge between the cloud and edge nodes.

### Initialize CloudCore

```bash
# Initialize CloudCore with the public IP of the cloud node
# Replace <CLOUD_IP> with your cloud node's accessible IP address
sudo keadm init --advertise-address=<CLOUD_IP> --kubeedge-version=1.17.0

# Verify CloudCore is running
kubectl get pods -n kubeedge
```

The init command installs CloudCore as a system service and configures the required CRDs.

### Get the Token for Edge Node Registration

Edge nodes need a token to authenticate with CloudCore during registration.

```bash
# Generate a token for edge node registration
keadm gettoken

# The output will look like:
# 27a37ef16159f7d3be8fae95d588b79b3adbd3b1668ead7d4d69c14e9f2c8a10.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Save this token - you will need it when joining the edge node
```

### Verify CloudCore Configuration

```bash
# Check CloudCore service status
sudo systemctl status cloudcore

# View CloudCore logs
sudo journalctl -u cloudcore -f

# Check the CloudCore configuration file
cat /etc/kubeedge/config/cloudcore.yaml
```

## Setting Up EdgeCore (Edge Node)

On the edge node, install EdgeCore to connect it to the cloud control plane.

### Join the Edge Node

```bash
# On the edge node, use the token obtained from the cloud node
# Replace <CLOUD_IP> with the cloud node IP and <TOKEN> with the token
sudo keadm join \
  --cloudcore-ipport=<CLOUD_IP>:10000 \
  --token=<TOKEN> \
  --kubeedge-version=1.17.0

# Verify EdgeCore is running
sudo systemctl status edgecore
```

### Verify Edge Node Registration

Back on the cloud node, check that the edge node appears in Kubernetes:

```bash
# List all nodes including edge nodes
kubectl get nodes

# You should see something like:
# NAME           STATUS   ROLES        AGE   VERSION
# cloud-node     Ready    control-plane  5m    v1.28.0
# edge-node      Ready    agent,edge     2m    v1.28.6-kubeedge-v1.17.0
```

## Deploying Workloads to Edge Nodes

KubeEdge uses standard Kubernetes constructs for scheduling workloads to edge nodes.

### Label the Edge Node

```bash
# Add a label to identify edge nodes for scheduling
kubectl label node edge-node node-role.kubernetes.io/edge=""

# Add custom labels for your use case
kubectl label node edge-node location=warehouse-a
```

### Create a Deployment for Edge Nodes

```yaml
# edge-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edge-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: edge-app
  template:
    metadata:
      labels:
        app: edge-app
    spec:
      # Use nodeSelector to target edge nodes
      nodeSelector:
        node-role.kubernetes.io/edge: ""
      # Tolerations are required for edge nodes
      tolerations:
        - key: "node-role.kubernetes.io/edge"
          operator: "Exists"
          effect: "NoSchedule"
      containers:
        - name: app
          image: nginx:alpine
          ports:
            - containerPort: 80
```

```bash
# Deploy the application
kubectl apply -f edge-deployment.yaml

# Check where the pod was scheduled
kubectl get pods -o wide
```

## Working with EdgeMesh

EdgeMesh provides service discovery and traffic routing for edge nodes. It enables communication between pods on different edge nodes without needing a central proxy.

```bash
# Install EdgeMesh using Helm
helm install edgemesh \
  --namespace kubeedge \
  --set agent.psk=<RANDOM_PSK> \
  https://raw.githubusercontent.com/kubeedge/edgemesh/main/build/helm/edgemesh.tar.gz

# Verify EdgeMesh agent is running on edge node
kubectl get pods -n kubeedge -l app=edgemesh-agent
```

## Monitoring Edge Nodes

Since edge nodes may have intermittent connectivity, KubeEdge handles offline scenarios gracefully.

```bash
# Check edge node status
kubectl get nodes edge-node -o yaml | grep -A5 conditions

# View edge node events
kubectl describe node edge-node

# Check EdgeCore logs on the edge node
sudo journalctl -u edgecore -n 100 --no-pager
```

## Common Issues and Troubleshooting

### Edge Node Shows NotReady

If the edge node is stuck in NotReady state, check the tunnel connection:

```bash
# On edge node, check EdgeCore logs for connection errors
sudo journalctl -u edgecore | grep -i error

# Verify the cloud node port is accessible
curl -k https://<CLOUD_IP>:10002/
```

### Pods Stuck in Pending State

Edge nodes do not support all Kubernetes features. Check if the pod uses features unsupported on edge:

```bash
# Describe the pod to see scheduling errors
kubectl describe pod <POD_NAME>

# Check if the node has sufficient resources
kubectl describe node edge-node | grep -A10 "Allocated resources"
```

### Resetting an Edge Node

If you need to remove an edge node from the cluster:

```bash
# On the edge node
sudo keadm reset

# On the cloud node, delete the node object
kubectl delete node edge-node
```

## Security Considerations

KubeEdge uses TLS for all cloud-to-edge communication. Keep these points in mind:

- Rotate the registration token regularly using `keadm gettoken --force`
- Use network policies to restrict what edge nodes can access
- Keep EdgeCore and CloudCore versions in sync
- Restrict physical access to edge devices since they run container workloads

KubeEdge brings Kubernetes orchestration to resource-constrained edge environments without requiring constant cloud connectivity. Once set up, edge nodes function autonomously and sync state when connectivity is restored, making it well-suited for factory floors, remote sites, and any deployment where network reliability cannot be guaranteed.
