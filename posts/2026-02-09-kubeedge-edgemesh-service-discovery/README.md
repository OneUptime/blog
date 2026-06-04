# How to Configure KubeEdge EdgeMesh for Service Discovery Between Edge Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: KubeEdge, Edge Computing, Service Discovery, EdgeMesh, Kubernetes

Description: Learn how to set up and configure EdgeMesh in KubeEdge environments to enable seamless service discovery and communication between edge nodes without relying on cloud connectivity.

---

KubeEdge extends Kubernetes to edge computing environments, but standard Kubernetes service discovery assumes reliable cluster networking. EdgeMesh solves this challenge by providing service discovery and communication capabilities specifically designed for edge scenarios where nodes may have intermittent connectivity or operate behind NATs and firewalls.

In this guide, we'll configure EdgeMesh to enable service discovery between edge nodes in a KubeEdge deployment. This setup allows services running on different edge nodes to discover and communicate with each other even when cloud connectivity is unavailable or unreliable.

## Understanding EdgeMesh Architecture

EdgeMesh operates as a distributed service mesh layer specifically designed for edge computing. Unlike traditional service meshes that rely on centralized control planes in the cloud, current EdgeMesh releases use an agent-based architecture where each participating node runs components that enable local service discovery and routing.

The key component is EdgeMesh-Agent. In EdgeMesh v1.12.0 and later, the former EdgeMesh-Server relay capability is merged into the agent's EdgeTunnel module, so agents can act as relay nodes when configured. Agents maintain service metadata, establish peer-to-peer or relayed connections between nodes, and route traffic based on service discovery information.

When a service on one edge node needs to communicate with a service on another node, EdgeMesh handles the discovery and routing without requiring traffic to flow through the cloud. This reduces latency and ensures edge services remain operational during cloud connectivity disruptions.

## Prerequisites and Environment Setup

Before deploying EdgeMesh, ensure you have a working KubeEdge cluster with at least two edge nodes. The cloud core should be running and edge nodes should be successfully joined to the cluster.

Verify your KubeEdge setup:

```bash
# Check cloud core status

kubectl get nodes

# Verify edge nodes are ready
kubectl get nodes -l node-role.kubernetes.io/edge=

# Check KubeEdge CloudCore logs
kubectl logs -n kubeedge -l app=cloudcore
```

EdgeMesh requires specific network configurations on participating nodes. Ensure that nodes can establish direct connections or that `relayNodes` are configured in the EdgeTunnel module if direct connectivity is not possible.

## Installing EdgeMesh Components

Deploy EdgeMesh to your KubeEdge cluster using the provided manifests. Current EdgeMesh releases deploy the agent components, with relay behavior configured through the agent's EdgeTunnel module.

First, create the necessary namespace and configurations:

```bash
# Clone EdgeMesh repository
git clone https://github.com/kubeedge/edgemesh.git
cd edgemesh

# Create namespace for EdgeMesh if it does not already exist
kubectl create namespace kubeedge --dry-run=client -o yaml | kubectl apply -f -

# Apply CRDs
kubectl apply -f build/crds/istio/

# Add the service filter label to the Kubernetes API service so EdgeMesh does not proxy it
kubectl label services kubernetes service.edgemesh.kubeedge.io/service-proxy-name="" --overwrite
```

If your nodes need a relay, edit `build/agent/resources/04-configmap.yaml` before deploying and set `modules.edgeTunnel.relayNodes` to the node names and advertised addresses that other nodes can reach. Regenerate the PSK in the same file before using it in production.

## Deploying EdgeMesh Agent to Edge Nodes

Deploy EdgeMesh agents with the upstream resource manifests:

```bash
kubectl apply -f build/agent/resources/
```

Configure the agent to enable service discovery:

```yaml
# edgemesh-agent-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: edgemesh-agent-cfg
  namespace: kubeedge
data:
  edgemesh-agent.yaml: |
    modules:
      edgeProxy:
        enable: true
      edgeTunnel:
        enable: true
        relayNodes:
        - nodeName: cloud-node-1
          advertiseAddress:
          - CLOUD_SERVER_IP
```

Replace `CLOUD_SERVER_IP` with the relay node address that other nodes can reach. If all nodes can connect directly, you can omit the `relayNodes` block.

Apply the updated configuration and restart the DaemonSet so agents pick it up:

```bash
kubectl apply -f edgemesh-agent-config.yaml
kubectl rollout restart daemonset/edgemesh-agent -n kubeedge

# Verify deployment
kubectl get pods -n kubeedge -l kubeedge=edgemesh-agent
```

## Enabling Service Discovery Between Edge Nodes

With EdgeMesh deployed, services can now discover each other across edge nodes. Create test services to verify service discovery functionality:

```yaml
# edge-service-a.yaml
apiVersion: v1
kind: Service
metadata:
  name: service-a
  namespace: default
spec:
  selector:
    app: service-a
  ports:
  - port: 8080
    targetPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service-a
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: service-a
  template:
    metadata:
      labels:
        app: service-a
    spec:
      nodeSelector:
        kubernetes.io/hostname: edge-node-1
      containers:
      - name: app
        image: hashicorp/http-echo:latest
        args:
          - "-listen=:8080"
          - "-text=Service A on Edge Node 1"
        ports:
        - containerPort: 8080
```

Create a similar service on another edge node:

```yaml
# edge-service-b.yaml
apiVersion: v1
kind: Service
metadata:
  name: service-b
  namespace: default
spec:
  selector:
    app: service-b
  ports:
  - port: 8080
    targetPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service-b
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: service-b
  template:
    metadata:
      labels:
        app: service-b
    spec:
      nodeSelector:
        kubernetes.io/hostname: edge-node-2
      containers:
      - name: app
        image: hashicorp/http-echo:latest
        args:
          - "-listen=:8080"
          - "-text=Service B on Edge Node 2"
        ports:
        - containerPort: 8080
```

By default, EdgeMesh handles ClusterIP service traffic unless the service is filtered out. The test services do not need an opt-in label.

Deploy both services:

```bash
kubectl apply -f edge-service-a.yaml
kubectl apply -f edge-service-b.yaml

# Verify services are running on different nodes
kubectl get pods -o wide
```

## Testing Cross-Node Service Discovery

Verify that services on different edge nodes can discover and communicate with each other through EdgeMesh:

```bash
# Get shell access to service-a pod
kubectl exec -it deployment/service-a -- sh

# Inside the pod, test service discovery
wget -O- http://service-b.default.svc.cluster.local:8080

# Should return: Service B on Edge Node 2
```

EdgeMesh handles DNS resolution and routing automatically. The service name resolves through EdgeMesh's DNS component, and traffic is routed directly between edge nodes without traversing the cloud.

## Configuring Service Discovery Filters

EdgeMesh allows you to control which services are excluded from EdgeMesh proxying using label-based filtering. This prevents unnecessary proxying of services that should stay on the regular Kubernetes path:

```yaml
# Update edgemesh-agent config
apiVersion: v1
kind: ConfigMap
metadata:
  name: edgemesh-agent-cfg
  namespace: kubeedge
data:
  edgemesh-agent.yaml: |
    modules:
      edgeProxy:
        enable: true
        # Default mode: services with this label are filtered out
        serviceFilterMode: "FilterIfLabelExists"
```

With the default `FilterIfLabelExists` mode, services that have the `service.edgemesh.kubeedge.io/service-proxy-name` label are not proxied by EdgeMesh. For example, the Kubernetes API service is commonly labeled this way so EdgeMesh does not intercept it:

```bash
kubectl label services kubernetes service.edgemesh.kubeedge.io/service-proxy-name="" --overwrite
```

## Monitoring EdgeMesh Service Discovery

Monitor EdgeMesh operations to ensure service discovery works correctly:

```bash
# Check EdgeMesh agent logs
kubectl logs -n kubeedge -l kubeedge=edgemesh-agent

# View service synchronization status
kubectl logs -n kubeedge -l kubeedge=edgemesh-agent | grep "service"

# Check tunnel connections between nodes
kubectl logs -n kubeedge -l kubeedge=edgemesh-agent | grep -i "tunnel"
```

EdgeMesh logs show service discovery events, tunnel establishment between nodes, and routing decisions. These logs help troubleshoot connectivity issues between edge nodes.

## Handling Network Partition Scenarios

One of EdgeMesh's key features is maintaining service discovery during cloud connectivity loss. Test this behavior by simulating network partition:

```bash
# On edge node, block cloud connectivity temporarily
sudo iptables -A OUTPUT -d CLOUD_IP -j DROP

# Services should still communicate
kubectl exec -it deployment/service-a -- wget -O- http://service-b:8080

# Restore connectivity
sudo iptables -D OUTPUT -d CLOUD_IP -j DROP
```

EdgeMesh maintains local service registries that continue operating during cloud disconnection, ensuring edge services remain available.

## Configuring Multi-Zone Edge Deployments

For edge deployments spanning multiple geographic locations or network zones, configure EdgeMesh relay nodes with addresses that are reachable from the other zones:

```yaml
modules:
  edgeProxy:
    enable: true
  edgeTunnel:
    enable: true
    relayNodes:
    - nodeName: edge-relay-zone-a
      advertiseAddress:
      - 203.0.113.10
    - nodeName: edge-relay-zone-b
      advertiseAddress:
      - 198.51.100.20
```

This configuration gives EdgeMesh explicit relay candidates for cross-zone communication when direct connections or hole punching are not available. Kubernetes topology labels can still be useful for scheduling workloads, but EdgeMesh does not automatically use those labels as a locality-aware routing policy.

## Conclusion

EdgeMesh provides robust service discovery capabilities designed specifically for edge computing scenarios in KubeEdge environments. By enabling direct communication between edge nodes and maintaining service discovery during cloud connectivity disruptions, EdgeMesh ensures that edge applications remain operational and performant.

The combination of decentralized service discovery, direct node-to-node routing, and resilience to network partitions makes EdgeMesh essential for production edge deployments. This setup supports edge applications that require reliable inter-service communication without depending on continuous cloud connectivity.

For production deployments, implement proper monitoring of EdgeMesh components, configure appropriate service filters to optimize resource usage, and test failure scenarios to ensure your edge services maintain availability during various network conditions.
