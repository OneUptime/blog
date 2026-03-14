# How to Configure Consul Connect Service Mesh on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Consul, Service Mesh, HashiCorp, Kubernetes, MTLS

Description: Step-by-step instructions for deploying HashiCorp Consul Connect as a service mesh on Talos Linux for secure service-to-service communication.

---

HashiCorp Consul Connect provides a service mesh that goes beyond just Kubernetes. While most service meshes are built specifically for Kubernetes, Consul Connect can span Kubernetes clusters, virtual machines, and bare metal servers. This makes it especially interesting for organizations that have workloads running across different platforms. On Talos Linux, Consul Connect runs as a Kubernetes-native deployment while still maintaining the ability to connect to external services.

This guide covers deploying Consul Connect on a Talos Linux cluster, configuring service-to-service mTLS, and setting up the key features that make Consul Connect useful.

## What is Consul Connect?

Consul has been a service discovery and configuration tool for years. Consul Connect adds service mesh capabilities on top of that foundation. It provides:

- Automatic mTLS between services using Envoy sidecar proxies
- Service discovery that works across Kubernetes and non-Kubernetes environments
- Intentions - a simple way to define which services can communicate with each other
- Traffic management including routing, splitting, and resolution
- A built-in certificate authority for managing service identities

The combination of service discovery and service mesh in a single tool is what sets Consul apart from mesh-only solutions.

## Prerequisites

You will need:

- A Talos Linux cluster with at least 3 worker nodes (Consul runs a server cluster that needs odd-numbered replicas)
- `kubectl` configured for cluster access
- Helm 3 installed
- The `consul-k8s` CLI (optional but helpful)

```bash
# Verify cluster health
kubectl get nodes

# Install the consul-k8s CLI
brew install hashicorp/tap/consul-k8s
# Or download from https://releases.hashicorp.com/consul-k8s/
```

## Installing Consul on Kubernetes

Use the official Helm chart to install Consul:

```bash
# Add the HashiCorp Helm repository
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update
```

Create a values file for the installation:

```yaml
# consul-values.yaml
global:
  name: consul
  datacenter: talos-dc1

server:
  replicas: 3
  storageClass: local-path  # Adjust based on your storage class
  storage: 10Gi
  resources:
    requests:
      memory: "256Mi"
      cpu: "100m"
    limits:
      memory: "512Mi"
      cpu: "500m"

connectInject:
  enabled: true
  default: false  # Don't inject by default, use annotations

meshGateway:
  enabled: false  # Enable if you need multi-cluster

ui:
  enabled: true
  service:
    type: NodePort
    nodePort:
      http: 31500

dns:
  enabled: true
```

Install Consul:

```bash
helm install consul hashicorp/consul \
  --namespace consul \
  --create-namespace \
  -f consul-values.yaml
```

## Verifying the Installation

Check that all Consul components are running:

```bash
# Check pods
kubectl get pods -n consul

# You should see:
# - consul-server-0, consul-server-1, consul-server-2 (the Consul servers)
# - consul-connect-injector (the sidecar injector)

# Check the Consul members
kubectl exec -n consul consul-server-0 -- consul members

# Access the UI
kubectl port-forward -n consul svc/consul-ui 8500:80
```

Open `http://localhost:8500` to see the Consul UI with service catalog and mesh visualization.

## Injecting the Consul Sidecar

To add a service to the mesh, annotate your pods:

```yaml
# meshed-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
      annotations:
        consul.hashicorp.com/connect-inject: "true"
        consul.hashicorp.com/connect-service: "web-frontend"
        consul.hashicorp.com/connect-service-port: "8080"
    spec:
      containers:
      - name: web
        image: nginx:alpine
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: web-frontend
  namespace: default
spec:
  selector:
    app: web-frontend
  ports:
  - port: 8080
    targetPort: 8080
```

Apply and verify the sidecar was injected:

```bash
kubectl apply -f meshed-app.yaml

# Check that the pod has 2 containers (app + envoy sidecar)
kubectl get pods -l app=web-frontend
kubectl describe pod -l app=web-frontend
```

## Configuring Service Intentions

Intentions define which services can communicate with each other. This is Consul Connect's authorization layer:

```yaml
# intentions.yaml
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceIntentions
metadata:
  name: web-frontend-to-api
  namespace: default
spec:
  destination:
    name: api-backend
  sources:
  - name: web-frontend
    action: allow
  - name: "*"
    action: deny  # Deny all other services
```

This allows `web-frontend` to talk to `api-backend` but denies all other services.

```bash
kubectl apply -f intentions.yaml

# Verify intentions
kubectl get serviceintentions
```

## Service Defaults and Protocols

Configure service defaults to specify the protocol your services use:

```yaml
# service-defaults.yaml
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceDefaults
metadata:
  name: api-backend
  namespace: default
spec:
  protocol: http
  meshGateway:
    mode: local
```

## Traffic Splitting

Consul Connect supports traffic splitting for canary deployments:

```yaml
# traffic-split.yaml
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceSplitter
metadata:
  name: api-backend
  namespace: default
spec:
  splits:
  - weight: 90
    serviceSubset: stable
  - weight: 10
    serviceSubset: canary

---
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceResolver
metadata:
  name: api-backend
  namespace: default
spec:
  subsets:
    stable:
      filter: "Service.Meta.version == v1"
    canary:
      filter: "Service.Meta.version == v2"
```

## Upstream Configuration

When a service needs to call another service through the mesh, configure upstreams:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
spec:
  template:
    metadata:
      annotations:
        consul.hashicorp.com/connect-inject: "true"
        consul.hashicorp.com/connect-service-upstreams: "api-backend:8081,cache-service:8082"
    spec:
      containers:
      - name: web
        image: nginx:alpine
        env:
        # The upstream is available on localhost at the specified port
        - name: API_URL
          value: "http://localhost:8081"
        - name: CACHE_URL
          value: "http://localhost:8082"
```

Your application connects to `localhost:8081` and the Envoy sidecar handles routing it to the `api-backend` service through the encrypted mesh.

## Monitoring Consul Connect

Check the health of your mesh:

```bash
# List all services in Consul
kubectl exec -n consul consul-server-0 -- consul catalog services

# Check service health
kubectl exec -n consul consul-server-0 -- consul catalog nodes -service=web-frontend

# View proxy configuration
kubectl exec -n consul consul-server-0 -- consul connect proxy -show-config web-frontend

# Check Envoy stats for a specific pod
kubectl exec <POD_NAME> -c envoy-sidecar -- curl -s localhost:19000/stats
```

## Talos Linux Considerations

Consul Connect works well on Talos Linux with a few points to consider:

1. Storage: Consul servers need persistent storage. Make sure you have a StorageClass available. On bare-metal Talos, you might use local-path-provisioner or a CSI driver.

2. DNS: Consul provides its own DNS for service discovery. On Talos, configure CoreDNS to forward `.consul` domain queries to the Consul DNS service:

```yaml
# coredns-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health
        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
        }
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
        loadbalance
    }
    consul:53 {
        forward . <CONSUL_DNS_SERVICE_IP>
        cache 30
    }
```

3. Network policies: If you have network policies in place, make sure Consul servers can communicate with each other and that the Connect injector can reach pods.

## Conclusion

Consul Connect on Talos Linux provides a service mesh that extends beyond Kubernetes boundaries. Its combination of service discovery, mTLS, and intentions-based authorization gives you fine-grained control over service-to-service communication. While it requires more resources than lighter alternatives like Linkerd, Consul Connect's ability to span multiple platforms and its integration with the broader HashiCorp ecosystem make it a strong choice for organizations already invested in HashiCorp tools. On Talos Linux, the deployment is clean and declarative, fitting naturally into the immutable infrastructure model.
