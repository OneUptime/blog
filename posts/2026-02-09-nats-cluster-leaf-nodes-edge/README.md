# How to Configure NATS Cluster with Leaf Nodes for Edge Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NATS, Edge Computing, Networking

Description: Learn how to configure NATS leaf nodes to extend messaging to edge locations, implement hub-and-spoke topologies, and enable efficient communication between cloud and edge deployments.

---

NATS leaf nodes provide a lightweight way to extend NATS clusters to edge locations, remote sites, or disconnected environments. Unlike full cluster members, leaf nodes connect as clients to a hub cluster, requiring minimal configuration and supporting intermittent connectivity. This makes them ideal for IoT devices, edge computing, and distributed architectures.

In this guide, you'll learn how to configure NATS leaf nodes, implement hub-and-spoke topologies, handle network interruptions, and optimize message routing between cloud and edge deployments on Kubernetes.

## Understanding NATS Leaf Nodes

Leaf nodes:

- Connect to hub clusters as enhanced clients
- Maintain local subject namespace
- Support bidirectional message flow
- Handle disconnections gracefully
- Require minimal configuration
- Scale independently from hub clusters

Use cases include:
- Edge computing and IoT
- Remote office connectivity
- Multi-cloud deployments
- Development and staging environments

## Deploying the Hub NATS Cluster

Create a hub cluster in the cloud:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nats-hub-config
  namespace: nats
data:
  nats.conf: |
    port: 4222
    monitor_port: 8222

    jetstream {
      store_dir: /data/jetstream
      max_mem: 2G
      max_file: 20G
    }

    cluster {
      name: hub-cluster
      port: 6222
      routes: [
        nats://nats-hub-0.nats-hub:6222,
        nats://nats-hub-1.nats-hub:6222,
        nats://nats-hub-2.nats-hub:6222
      ]
    }

    leafnodes {
      port: 7422
      # Allow any leaf to connect
    }
---
apiVersion: v1
kind: Service
metadata:
  name: nats-hub
  namespace: nats
spec:
  clusterIP: None
  selector:
    app: nats-hub
  ports:
  - name: client
    port: 4222
  - name: cluster
    port: 6222
  - name: leafnodes
    port: 7422
  - name: monitor
    port: 8222
---
apiVersion: v1
kind: Service
metadata:
  name: nats-hub-lb
  namespace: nats
spec:
  selector:
    app: nats-hub
  type: LoadBalancer
  ports:
  - name: client
    port: 4222
  - name: leafnodes
    port: 7422
  - name: monitor
    port: 8222
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nats-hub
  namespace: nats
spec:
  serviceName: nats-hub
  replicas: 3
  selector:
    matchLabels:
      app: nats-hub
  template:
    metadata:
      labels:
        app: nats-hub
    spec:
      containers:
      - name: nats
        image: nats:2.10-alpine
        ports:
        - containerPort: 4222
        - containerPort: 6222
        - containerPort: 7422
        - containerPort: 8222
        command: [nats-server, --config, /etc/nats/nats.conf]
        volumeMounts:
        - name: config
          mountPath: /etc/nats
        - name: data
          mountPath: /data
      volumes:
      - name: config
        configMap:
          name: nats-hub-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ReadWriteOnce]
      resources:
        requests:
          storage: 50Gi
```

Deploy the hub:

```bash
kubectl create namespace nats
kubectl apply -f nats-hub.yaml

# Get the LoadBalancer IP

HUB_IP=$(kubectl get svc nats-hub-lb -n nats -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Hub cluster available at: $HUB_IP"
```

## Configuring Leaf Nodes at Edge Locations

Deploy leaf nodes in edge locations:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nats-leaf-config
  namespace: nats-edge
data:
  nats.conf: |
    port: 4222
    monitor_port: 8222

    jetstream {
      store_dir: /data/jetstream
      max_mem: 512M
      max_file: 5G
    }

    leafnodes {
      remotes = [
        {
          url: "nats://HUB_CLUSTER_IP:7422"
        }
      ]
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nats-leaf
  namespace: nats-edge
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nats-leaf
  template:
    metadata:
      labels:
        app: nats-leaf
    spec:
      containers:
      - name: nats
        image: nats:2.10-alpine
        ports:
        - containerPort: 4222
        - containerPort: 8222
        command: [nats-server, --config, /etc/nats/nats.conf]
        volumeMounts:
        - name: config
          mountPath: /etc/nats
        - name: data
          mountPath: /data
      volumes:
      - name: config
        configMap:
          name: nats-leaf-config
      - name: data
        emptyDir: {}
```

Replace `HUB_CLUSTER_IP` with the actual hub IP and deploy:

```bash
# In edge cluster
kubectl create namespace nats-edge
sed "s/HUB_CLUSTER_IP/${HUB_IP}/" nats-leaf.yaml | kubectl apply -f -
```

## Implementing Authenticated Leaf Connections

Use credentials for secure leaf connections:

```yaml
# Hub configuration with authentication
leafnodes {
  port: 7422
  authorization {
    user: leaf_user
    password: secure_password
    timeout: 2
  }
}
```

Leaf configuration with credentials:

```yaml
leafnodes {
  remotes = [
    {
      url: "nats://leaf_user:secure_password@hub-cluster:7422"
    }
  ]
}
```

Using TLS for secure connections:

```yaml
# Hub with TLS
leafnodes {
  port: 7422
  tls {
    cert_file: "/etc/nats/certs/server-cert.pem"
    key_file: "/etc/nats/certs/server-key.pem"
    ca_file: "/etc/nats/certs/ca.pem"
    verify: true
  }
}
```

Leaf with TLS:

```yaml
leafnodes {
  remotes = [
    {
      url: "tls://hub-cluster:7422"
      tls {
        cert_file: "/etc/nats/certs/leaf-cert.pem"
        key_file: "/etc/nats/certs/leaf-key.pem"
        ca_file: "/etc/nats/certs/ca.pem"
      }
    }
  ]
}
```

## Publishing Messages from Edge to Hub

Edge applications publish locally, messages route to hub:

```go
package main

import (
    "log"
    "github.com/nats-io/nats.go"
)

func main() {
    // Connect to local leaf node
    nc, err := nats.Connect("nats://localhost:4222")
    if err != nil {
        log.Fatal(err)
    }
    defer nc.Close()

    // Publish sensor data - routed to hub
    nc.Publish("sensors.temperature", []byte(`{"value": 72.5, "unit": "F"}`))
    nc.Publish("sensors.humidity", []byte(`{"value": 45, "unit": "%"}`))
    if err := nc.Flush(); err != nil {
        log.Fatal(err)
    }

    log.Println("Published sensor data from edge")
}
```

Hub consumers receive edge messages:

```go
// Running on hub cluster
func consumeEdgeMessages() {
    nc, _ := nats.Connect("nats://nats-hub:4222")
    defer nc.Close()

    nc.Subscribe("sensors.>", func(msg *nats.Msg) {
        log.Printf("Received from edge: %s - %s", msg.Subject, string(msg.Data))
    })

    select {} // Keep running
}
```

## Implementing Hub-to-Edge Commands

Hub sends commands to specific edge locations:

```go
// Hub publishes commands
func sendCommandToEdge(edgeID string) {
    nc, _ := nats.Connect("nats://nats-hub:4222")
    defer nc.Close()

    subject := fmt.Sprintf("commands.%s.restart", edgeID)
    nc.Publish(subject, []byte(`{"action": "restart", "service": "data-collector"}`))
    nc.Flush()

    log.Printf("Sent command to edge: %s", edgeID)
}
```

Edge subscribes to commands:

```go
// Edge listens for commands
func handleCommands(edgeID string) {
    nc, _ := nats.Connect("nats://localhost:4222")
    defer nc.Close()

    subject := fmt.Sprintf("commands.%s.>", edgeID)
    nc.Subscribe(subject, func(msg *nats.Msg) {
        log.Printf("Received command: %s", string(msg.Data))
        // Execute command
        executeCommand(msg.Data)
    })

    select {}
}
```

## Handling Intermittent Connectivity

Leaf nodes reconnect to the hub after disconnections. Core NATS messages are not persisted across a disconnected leaf link unless you use JetStream or another store-and-forward pattern:

```yaml
leafnodes {
  # Retry remote leaf connections every 5 seconds
  reconnect: 5s
  remotes = [
    {
      url: "nats://hub-cluster:7422"
    }
  ]
}
```

Use JetStream for persistence during disconnections:

```go
// Edge publishes to local JetStream
func publishWithPersistence() {
    nc, _ := nats.Connect("nats://localhost:4222")
    defer nc.Close()

    js, _ := nc.JetStream()

    // Create local stream
    js.AddStream(&nats.StreamConfig{
        Name:     "EDGE_SENSORS",
        Subjects: []string{"sensors.>"},
        Storage:  nats.FileStorage,
    })

    // Publish - stored locally even if hub is unreachable
    js.Publish("sensors.temperature", []byte(`{"value": 72.5}`))
}
```

## Monitoring Leaf Node Connectivity

Check leaf node connections:

```bash
# View leaf node status
curl http://$HUB_IP:8222/leafz
```

Create alerts for disconnected leaf nodes:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: nats-leaf-alerts
spec:
  groups:
  - name: nats-leafnodes
    rules:
    - alert: LeafNodeDisconnected
      expr: |
        gnatsd_leafz_conn_nodes_total < 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Leaf node disconnected"

    - alert: LeafNodeHighLatency
      expr: |
        gnatsd_leafz_conn_rtt > 0.5
      for: 10m
      labels:
        severity: warning
```

## Implementing Multi-Tier Leaf Topologies

Create cascading leaf nodes:

```yaml
# Regional hub (itself a leaf to global hub)
leafnodes {
  port: 7422  # Accept leaf connections
  reconnect: 5s
  remotes = [
    {
      url: "nats://global-hub:7422"
    }
  ]
}
```

This creates a hierarchy: Edge -> Regional Hub -> Global Hub

## Optimizing Message Routing

Configure subject filtering to reduce traffic:

```yaml
leafnodes {
  remotes = [
    {
      url: "nats://hub-cluster:7422"
      # Do not import these subjects from the hub
      deny_imports: ["debug.>", "internal.>"]
      # Do not export these local subjects to the hub
      deny_exports: ["commands.>", "config.>"]
    }
  ]
}
```

## Best Practices

Follow these practices:

1. **Use TLS for production** - Secure leaf connections with certificates
2. **Implement authentication** - Don't allow anonymous leaf connections
3. **Configure subject filtering** - Reduce unnecessary message routing
4. **Monitor connectivity** - Alert on disconnected leaf nodes
5. **Use local JetStream** - Buffer messages during network outages
6. **Plan for scale** - Consider regional hubs for many edge locations
7. **Test failure scenarios** - Verify behavior during disconnections

## Troubleshooting Leaf Node Issues

Common problems and solutions:

```bash
# Check leaf node connection from hub
curl http://$HUB_IP:8222/leafz

# View leaf node logs
kubectl logs -n nats-edge deployment/nats-leaf -f

# Test connectivity from leaf to hub
kubectl exec -n nats-edge deployment/nats-leaf -- \
  sh -c 'nc -vz HUB_CLUSTER_IP 7422'

# Check route configuration
kubectl exec -n nats nats-hub-0 -- cat /etc/nats/nats.conf | grep -A 10 leafnodes
```

## Conclusion

NATS leaf nodes provide an efficient way to extend messaging to edge locations while maintaining simplicity and handling network unreliability. By configuring hub clusters, deploying leaf nodes strategically, and implementing proper monitoring, you can build robust edge-to-cloud messaging architectures.

Leaf nodes excel in scenarios requiring lightweight edge deployments, intermittent connectivity, and efficient message routing. Combined with JetStream for persistence and proper subject filtering, NATS leaf nodes enable scalable IoT and edge computing platforms on Kubernetes.
