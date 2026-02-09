# How to Configure KubeEdge EdgeMesh for Service Discovery Between Edge Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: KubeEdge, Edge Computing, Service Discovery, EdgeMesh, Kubernetes

Description: Learn how to set up and configure EdgeMesh in KubeEdge environments to enable seamless service discovery and communication between edge nodes without relying on cloud connectivity.

---

KubeEdge extends Kubernetes to edge computing environments, but standard Kubernetes service discovery assumes reliable cluster networking. EdgeMesh solves this challenge by providing service discovery and communication capabilities specifically designed for edge scenarios where nodes may have intermittent connectivity or operate behind NATs and firewalls.

In this guide, we'll configure EdgeMesh to enable service discovery between edge nodes in a KubeEdge deployment. This setup allows services running on different edge nodes to discover and communicate with each other even when cloud connectivity is unavailable or unreliable.

## Understanding EdgeMesh Architecture

EdgeMesh operates as a distributed service mesh layer specifically designed for edge computing. Unlike traditional service meshes that rely on centralized control planes in the cloud, EdgeMesh uses a decentralized architecture where each edge node runs components that enable local service discovery and routing.

The key components include EdgeMesh-Server running in the cloud and EdgeMesh-Agent running on each edge node. Agents maintain local service registries synchronized from Kubernetes, establish peer-to-peer connections between edge nodes, and route traffic based on service discovery information.

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

EdgeMesh requires specific network configurations on edge nodes. Ensure that nodes can establish direct connections or are configured for relay-based communication if direct connectivity is not possible.

## Installing EdgeMesh Components

Deploy EdgeMesh to your KubeEdge cluster using the provided manifests. EdgeMesh requires both server components in the cloud and agent components on edge nodes.

First, create the necessary namespace and configurations:

```bash
# Clone EdgeMesh repository
git clone https://github.com/kubeedge/edgemesh.git
cd edgemesh

# Create namespace for EdgeMesh
kubectl create namespace kubeedge

# Apply CRDs
kubectl apply -f build/crds/istio/
```

Deploy EdgeMesh server in the cloud:

```yaml
# edgemesh-server.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edgemesh-server
  namespace: kubeedge
spec:
  replicas: 1
  selector:
    matchLabels:
      app: edgemesh-server
  template:
    metadata:
      labels:
        app: edgemesh-server
    spec:
      # Run on cloud nodes only
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: node-role.kubernetes.io/edge
                operator: DoesNotExist
      containers:
      - name: edgemesh-server
        image: kubeedge/edgemesh-server:latest
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        ports:
        - containerPort: 20004
          name: tunnel
        - containerPort: 20006
          name: relay
        volumeMounts:
        - name: config
          mountPath: /etc/edgemesh/config
      volumes:
      - name: config
        configMap:
          name: edgemesh-server-cfg
---
apiVersion: v1
kind: Service
metadata:
  name: edgemesh-server
  namespace: kubeedge
spec:
  selector:
    app: edgemesh-server
  ports:
  - port: 20004
    name: tunnel
  - port: 20006
    name: relay
  type: NodePort
```

Create the server configuration:

```yaml
# edgemesh-server-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: edgemesh-server-cfg
  namespace: kubeedge
data:
  edgemesh-server.yaml: |
    kubeAPIConfig:
      kubeConfig: ""
      master: ""
    modules:
      tunnel:
        enable: true
        listenPort: 20004
        advertiseAddress:
        - CLOUD_SERVER_IP
      relay:
        enable: true
        listenPort: 20006
        advertiseAddress:
        - CLOUD_SERVER_IP
```

Replace `CLOUD_SERVER_IP` with your cloud server's external IP address that edge nodes can reach.

## Deploying EdgeMesh Agent to Edge Nodes

Deploy EdgeMesh agents as a DaemonSet that runs on edge nodes only:

```yaml
# edgemesh-agent.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: edgemesh-agent
  namespace: kubeedge
spec:
  selector:
    matchLabels:
      app: edgemesh-agent
  template:
    metadata:
      labels:
        app: edgemesh-agent
    spec:
      # Run on edge nodes only
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: node-role.kubernetes.io/edge
                operator: Exists
      hostNetwork: true
      containers:
      - name: edgemesh-agent
        image: kubeedge/edgemesh-agent:latest
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        securityContext:
          privileged: true
        volumeMounts:
        - name: config
          mountPath: /etc/edgemesh/config
        - name: host-time
          mountPath: /etc/localtime
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: edgemesh-agent-cfg
      - name: host-time
        hostPath:
          path: /etc/localtime
          type: ""
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
    kubeAPIConfig:
      kubeConfig: ""
      master: ""
    modules:
      edgeDNS:
        enable: true
        listenPort: 53
      edgeProxy:
        enable: true
        serviceFilterMode: "FilterIfLabelExists"
      tunnel:
        enable: true
        listenPort: 20004
      edgeGateway:
        enable: false
```

Deploy both configurations:

```bash
kubectl apply -f edgemesh-server-config.yaml
kubectl apply -f edgemesh-server.yaml
kubectl apply -f edgemesh-agent-config.yaml
kubectl apply -f edgemesh-agent.yaml

# Verify deployment
kubectl get pods -n kubeedge -l app=edgemesh-agent
kubectl get pods -n kubeedge -l app=edgemesh-server
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
  labels:
    edgemesh.kubeedge.io/service: "true"
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
  labels:
    edgemesh.kubeedge.io/service: "true"
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
          - "-text=Service B on Edge Node 2"
        ports:
        - containerPort: 8080
```

The label `edgemesh.kubeedge.io/service: "true"` indicates that EdgeMesh should handle service discovery for these services.

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

EdgeMesh allows you to control which services participate in edge service discovery using label-based filtering. This prevents unnecessary synchronization of cloud services to edge nodes:

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
        # Only discover services with this label
        serviceFilterMode: "FilterIfLabelExists"
        serviceFilterKey: "edgemesh.kubeedge.io/service"
```

This configuration ensures that only services explicitly labeled for edge discovery are synchronized to edge nodes, reducing resource consumption.

## Monitoring EdgeMesh Service Discovery

Monitor EdgeMesh operations to ensure service discovery works correctly:

```bash
# Check EdgeMesh agent logs
kubectl logs -n kubeedge -l app=edgemesh-agent

# View service synchronization status
kubectl logs -n kubeedge -l app=edgemesh-agent | grep "service sync"

# Check tunnel connections between nodes
kubectl logs -n kubeedge -l app=edgemesh-agent | grep "tunnel"
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

For edge deployments spanning multiple geographic locations or network zones, configure EdgeMesh to optimize routing based on locality:

```yaml
# Add zone labels to nodes
kubectl label node edge-node-1 topology.kubernetes.io/zone=zone-a
kubectl label node edge-node-2 topology.kubernetes.io/zone=zone-b

# EdgeMesh automatically prefers local zone routing
# when multiple service endpoints exist
```

This configuration ensures that service discovery prefers endpoints in the same zone, reducing latency and bandwidth consumption across zones.

## Conclusion

EdgeMesh provides robust service discovery capabilities designed specifically for edge computing scenarios in KubeEdge environments. By enabling direct communication between edge nodes and maintaining service discovery during cloud connectivity disruptions, EdgeMesh ensures that edge applications remain operational and performant.

The combination of decentralized service discovery, direct node-to-node routing, and resilience to network partitions makes EdgeMesh essential for production edge deployments. This setup supports edge applications that require reliable inter-service communication without depending on continuous cloud connectivity.

For production deployments, implement proper monitoring of EdgeMesh components, configure appropriate service filters to optimize resource usage, and test failure scenarios to ensure your edge services maintain availability during various network conditions.
