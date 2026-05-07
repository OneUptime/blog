# How to Configure NodePort Services in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, NodePort

Description: Step-by-step instructions for configuring NodePort services in Rancher to expose applications on specific ports across all cluster nodes.

NodePort is a Kubernetes service type that exposes your application on a static port on every node in the cluster. This is useful for development environments, bare-metal clusters without cloud load balancers, or when you need direct access to specific ports. This guide shows you how to configure NodePort services in Rancher.

## Prerequisites

- A running Rancher instance (v2.6 or later)
- A managed Kubernetes cluster
- A deployed application
- kubectl access to your cluster

## Understanding NodePort Services

When you create a NodePort service, Kubernetes allocates a port from a configured range (default 30000-32767) and opens that port on every node. Traffic to any node on that port is forwarded to the service, which then distributes it to the backing pods.

## Step 1: Deploy a Sample Application

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nodeport-demo
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nodeport-demo
  template:
    metadata:
      labels:
        app: nodeport-demo
    spec:
      containers:
      - name: app
        image: nginx:latest
        ports:
        - containerPort: 80
```

```bash
kubectl apply -f nodeport-demo.yaml
```

## Step 2: Create a NodePort Service via kubectl

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nodeport-demo-svc
  namespace: default
spec:
  type: NodePort
  selector:
    app: nodeport-demo
  ports:
  - port: 80
    targetPort: 80
    nodePort: 30080
```

```bash
kubectl apply -f nodeport-svc.yaml
```

If you omit `nodePort`, Kubernetes will automatically assign one from the available range.

## Step 3: Create a NodePort Service via the Rancher UI

1. In the Rancher dashboard, go to **Cluster Management**.
2. Open your cluster and click **Explore**.
3. Go to **Service Discovery** > **Services**.
4. Click **Create**.
5. Select **NodePort** as the service type.
6. Configure the service:
   - **Name**: `nodeport-demo-svc`
   - **Namespace**: `default`
   - **Selectors**: `app = nodeport-demo`
7. Under **Ports**, configure:
   - **Service Port**: `80`
   - **Target Port**: `80`
   - **Node Port**: `30080` (or leave blank for auto-assignment)
8. Click **Create**.

## Step 4: Access the Service

Access the application using any node's IP address and the NodePort:

```bash
# Get node IPs

kubectl get nodes -o wide

# Access the service
curl http://<NODE_IP>:30080
```

You can use any node's IP address, even if the pod is not running on that particular node. Kubernetes handles the routing internally.

## Step 5: Configure Multiple Ports

Expose multiple ports through a single NodePort service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: multi-port-svc
  namespace: default
spec:
  type: NodePort
  selector:
    app: multi-port-app
  ports:
  - name: http
    port: 80
    targetPort: 8080
    nodePort: 30080
  - name: https
    port: 443
    targetPort: 8443
    nodePort: 30443
  - name: metrics
    port: 9090
    targetPort: 9090
    nodePort: 30090
```

## Step 6: Change the NodePort Range

By default, Kubernetes uses ports 30000-32767 for NodePort services. To change this range on Rancher-managed RKE2 or K3s clusters, edit the cluster configuration in Rancher:

1. Go to **Cluster Management** > **Your Cluster** > **Edit Config**.
2. Under **Networking**, change **NodePort Service Port Range** to `20000-40000`.
3. Save and wait for the cluster to reconcile.

If you're working with an older RKE (RKE1) cluster, use the equivalent **Node Port Range** option or `service_node_port_range` setting in the cluster YAML.

## Step 7: Restrict External Traffic Policy

By default, traffic can hop between nodes. To restrict traffic to the local node only:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: local-nodeport-svc
  namespace: default
spec:
  type: NodePort
  externalTrafficPolicy: Local
  selector:
    app: nodeport-demo
  ports:
  - port: 80
    targetPort: 80
    nodePort: 30080
```

Setting `externalTrafficPolicy: Local` preserves the client's source IP but only routes to pods on the receiving node. If no pods are running on a particular node, the connection will fail on that node.

## Step 8: Use NodePort Behind an External Load Balancer

In bare-metal environments, combine NodePort with an external load balancer:

```plaintext
                    +-----------+
                    |  External |
                    |    LB     |
                    +-----+-----+
                          |
            +-------------+-------------+
            |             |             |
      +-----+-----+ +----+------+ +----+------+
      | Node1:30080| |Node2:30080| |Node3:30080|
      +-----+-----+ +----+------+ +----+------+
            |             |             |
      +-----+-----+ +----+------+ +----+------+
      |   Pod 1   | |   Pod 2   | |   Pod 3   |
      +-----------+ +-----------+ +-----------+
```

Configure your external load balancer to send traffic to all nodes on the NodePort.

## Step 9: Monitor NodePort Services

Check the service status:

```bash
kubectl get svc nodeport-demo-svc -n default
kubectl describe svc nodeport-demo-svc -n default
kubectl get endpointslice -n default -l kubernetes.io/service-name=nodeport-demo-svc
```

Verify connectivity:

```bash
# Test from outside the cluster
curl -v http://<NODE_IP>:30080

# Test from inside the cluster
kubectl run test -n default --image=busybox --restart=Never --rm -it --command -- wget -qO- http://nodeport-demo-svc
```

## Troubleshooting

- **Port conflict**: If a NodePort is already in use, choose a different port
- **Firewall rules**: Ensure the NodePort range is open on your firewall and security groups
- **No endpoints**: Check that pods are running and selectors match: `kubectl get endpointslice -n <namespace> -l kubernetes.io/service-name=<svc-name>`
- **Connection refused**: Verify the targetPort matches the container port
- **Timeout**: Check node firewall rules and network security groups

## Summary

NodePort services in Rancher provide a straightforward way to expose applications externally, especially in environments without cloud load balancers. While not ideal for production traffic due to limited port ranges and the need to know node IPs, they work well for development, testing, and as backends for external load balancers. For production workloads, consider using Ingress or LoadBalancer services instead.
