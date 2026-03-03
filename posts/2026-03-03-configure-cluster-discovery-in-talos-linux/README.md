# How to Configure Cluster Discovery in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cluster Discovery, Configuration, Kubernetes, Networking

Description: A complete guide to configuring the cluster discovery service in Talos Linux for automatic node registration and cluster membership management.

---

Cluster discovery in Talos Linux is the mechanism by which nodes find each other and establish cluster membership. It is a foundational feature that underpins several other capabilities, including KubeSpan mesh networking. This guide covers how the discovery service works, how to configure it, and how to customize it for different environments.

## What Cluster Discovery Does

When a Talos node boots, it needs to know about other nodes in the cluster. The discovery service handles this by providing a registry where nodes announce their presence and query for other members. Each node publishes its identity, network endpoints, and capabilities to the registry. Other nodes read this information to learn about the cluster topology.

Discovery is used by KubeSpan to find peer endpoints for establishing WireGuard tunnels. It is also used during cluster bootstrapping to help nodes find the control plane.

## Default Configuration

Discovery is enabled by default in Talos Linux and uses the public discovery service at `https://discovery.talos.dev`. The default configuration looks like this in the machine config:

```yaml
cluster:
  discovery:
    enabled: true
    registries:
      kubernetes:
        disabled: false
      service:
        disabled: false
        endpoint: https://discovery.talos.dev/
```

There are two types of registries:

1. **Service registry**: Uses the Talos discovery service (an external HTTP endpoint) where nodes register and query cluster membership.
2. **Kubernetes registry**: Uses Kubernetes annotations on Node objects to store discovery information. This works even without the external discovery service.

## Configuring the Service Registry

The service registry is the primary discovery mechanism. It works before Kubernetes is bootstrapped, which makes it essential for initial cluster formation.

To use the default public discovery service:

```yaml
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: false
        endpoint: https://discovery.talos.dev/
```

To use a self-hosted discovery service:

```yaml
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: false
        endpoint: https://discovery.internal.example.com/
```

We will cover setting up a self-hosted discovery service later in this guide.

## Configuring the Kubernetes Registry

The Kubernetes registry stores discovery data as annotations on Kubernetes Node objects. It works independently of the service registry and serves as a fallback:

```yaml
cluster:
  discovery:
    enabled: true
    registries:
      kubernetes:
        disabled: false
```

The Kubernetes registry is useful because it does not require any external service. However, it only works after Kubernetes is running, so it cannot help with initial cluster bootstrapping.

## Using Both Registries Together

The recommended configuration uses both registries:

```yaml
cluster:
  discovery:
    enabled: true
    registries:
      kubernetes:
        disabled: false
      service:
        disabled: false
        endpoint: https://discovery.talos.dev/
```

The service registry handles initial discovery and bootstrap, while the Kubernetes registry provides redundancy once the cluster is running. If the external discovery service goes down, the Kubernetes registry ensures nodes can still discover each other.

## Verifying Discovery Status

Check what the discovery service knows about your cluster:

```bash
# View all discovered cluster members
talosctl get discoveredmembers --nodes <node-ip>

# View detailed discovery information
talosctl get discoveredmembers --nodes <node-ip> -o yaml
```

The output shows each cluster member, including their node ID, endpoints, and any additional metadata. This is the information that KubeSpan and other features use.

Check which registries are active:

```bash
# Check the machine config for discovery settings
talosctl get machineconfig --nodes <node-ip> -o yaml | grep -A15 "discovery:"
```

## Setting Up a Self-Hosted Discovery Service

For production environments, especially air-gapped or security-sensitive ones, you should run your own discovery service. The Talos discovery service is open source and can be self-hosted.

Deploy the discovery service as a container:

```yaml
# discovery-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: talos-discovery
  namespace: talos-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: talos-discovery
  template:
    metadata:
      labels:
        app: talos-discovery
    spec:
      containers:
        - name: discovery
          image: ghcr.io/siderolabs/discovery-service:latest
          ports:
            - containerPort: 3000
          args:
            - --addr=:3000
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
---
apiVersion: v1
kind: Service
metadata:
  name: talos-discovery
  namespace: talos-system
spec:
  type: ClusterIP
  selector:
    app: talos-discovery
  ports:
    - port: 443
      targetPort: 3000
```

You will also need an Ingress or LoadBalancer to expose the service with TLS:

```yaml
# discovery-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: talos-discovery
  namespace: talos-system
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - discovery.internal.example.com
      secretName: discovery-tls
  rules:
    - host: discovery.internal.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: talos-discovery
                port:
                  number: 443
```

Then configure your Talos nodes to use the self-hosted service:

```yaml
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: false
        endpoint: https://discovery.internal.example.com/
```

## Security of Discovery Data

Discovery data is encrypted end-to-end. The discovery service itself cannot read the information that nodes exchange. Here is how it works:

1. Each cluster has a unique cluster ID derived from its secrets
2. Nodes encrypt their discovery data using keys derived from the cluster's trust domain
3. The discovery service stores and relays the encrypted blobs
4. Only nodes with the correct cluster secrets can decrypt the data

This means even if someone compromises the discovery service, they cannot learn the cluster topology or intercept endpoint information.

```bash
# View the cluster identity used for discovery
talosctl get clusteridentity --nodes <node-ip>
```

## Adjusting Discovery Behavior

You can tune how often nodes refresh their discovery information through the Talos API, though the defaults work well for most clusters. If you have a very large cluster (100+ nodes), the discovery service handles the load fine because each node only queries for its own cluster's members.

For clusters with nodes that change IPs frequently (like cloud instances with dynamic IPs), more frequent discovery updates help keep the information current. The default refresh interval is sufficient for most cloud environments.

## Checking Discovery Health

Monitor the health of your discovery setup:

```bash
# Check if discovery is working
talosctl get discoveredmembers --nodes <node-ip>

# If the list is empty or missing nodes, check the discovery service
talosctl logs controller-runtime --nodes <node-ip> | grep -i discovery

# Check if the node can reach the discovery endpoint
talosctl logs controller-runtime --nodes <node-ip> | grep -i "discovery.talos.dev"
```

Common issues include DNS resolution failures (the node cannot resolve the discovery service hostname), TLS certificate issues (especially with self-hosted services), and network connectivity issues (firewall blocking HTTPS to the discovery endpoint).

Cluster discovery is one of those features that works quietly in the background and you rarely think about until it stops working. The default configuration is solid for most use cases. When you need more control, self-hosting the discovery service gives you full ownership of the infrastructure. Regardless of which approach you take, understanding how discovery works helps you troubleshoot cluster formation issues and plan your network architecture more effectively.
