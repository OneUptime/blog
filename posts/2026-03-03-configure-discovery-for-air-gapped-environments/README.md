# How to Configure Discovery for Air-Gapped Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Air-Gapped, Discovery, Offline, Cluster Management

Description: A complete guide to configuring Talos Linux cluster discovery in air-gapped environments where nodes have no internet access.

---

Air-gapped environments present unique challenges for Talos Linux clusters. The default discovery service at `discovery.talos.dev` requires internet access, which is not available in isolated networks. But discovery is still important for KubeSpan, node registration, and cluster operations. This guide covers how to configure discovery for environments with no internet connectivity.

## Understanding the Challenge

In a standard Talos Linux deployment, nodes communicate with the public discovery service to register themselves and discover other cluster members. In an air-gapped environment:

- No outbound internet access is available
- The public discovery service is unreachable
- All software and configurations must be pre-staged
- Network communication is limited to the isolated network

You have three options for handling discovery in this environment:
1. Disable the service registry and rely only on the Kubernetes registry
2. Deploy a self-hosted discovery service within the air-gapped network
3. Disable discovery entirely and manage node connectivity manually

## Option 1: Kubernetes Registry Only

The simplest approach is to disable the service registry and use only the Kubernetes-based discovery:

```yaml
# air-gapped-discovery.yaml
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: true
      kubernetes:
        disabled: false
```

This works because the Kubernetes registry stores discovery data in Node object annotations, which requires only the Kubernetes API server (running inside your cluster). No external connectivity needed.

The limitation is that the Kubernetes registry only works after Kubernetes is running. For initial cluster bootstrap, you need to handle node discovery differently. Fortunately, Talos handles bootstrap through the control plane endpoint in the machine configuration:

```yaml
cluster:
  controlPlane:
    endpoint: https://10.0.0.10:6443
```

The bootstrap process works like this:
1. You bootstrap the first control plane node explicitly with `talosctl bootstrap`
2. Other control plane nodes connect to the endpoint and join etcd
3. Worker nodes connect to the endpoint and join the cluster
4. Once Kubernetes is running, the Kubernetes registry handles ongoing discovery

```bash
# Bootstrap in an air-gapped environment
talosctl bootstrap --nodes 10.0.0.10

# Other nodes join via the control plane endpoint
# No discovery service needed for this step
```

## Option 2: Self-Hosted Discovery Service

For full discovery functionality, deploy the Talos discovery service within your air-gapped network. You need to pre-stage the container image.

### Preparing the Image

On a machine with internet access, pull and save the image:

```bash
# Pull the discovery service image
docker pull ghcr.io/siderolabs/discovery-service:latest

# Save it as a tar file for transfer to the air-gapped network
docker save ghcr.io/siderolabs/discovery-service:latest -o discovery-service.tar
```

Transfer the tar file to the air-gapped network and load it into your container registry:

```bash
# Load the image into the air-gapped registry
docker load -i discovery-service.tar
docker tag ghcr.io/siderolabs/discovery-service:latest \
  registry.internal.local/siderolabs/discovery-service:latest
docker push registry.internal.local/siderolabs/discovery-service:latest
```

### Deploying the Service

Deploy within your air-gapped Kubernetes cluster (you may need a management cluster or use a standalone deployment):

```yaml
# discovery-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: discovery-service
  namespace: talos-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: discovery-service
  template:
    metadata:
      labels:
        app: discovery-service
    spec:
      containers:
        - name: discovery
          image: registry.internal.local/siderolabs/discovery-service:latest
          args:
            - --addr=:3000
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
---
apiVersion: v1
kind: Service
metadata:
  name: discovery-service
  namespace: talos-system
spec:
  type: LoadBalancer
  selector:
    app: discovery-service
  ports:
    - port: 443
      targetPort: 3000
```

### TLS Configuration

The discovery service requires TLS. In an air-gapped environment, you likely have an internal CA:

```yaml
# Create a TLS secret using your internal CA-signed certificate
apiVersion: v1
kind: Secret
metadata:
  name: discovery-tls
  namespace: talos-system
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
```

Configure an Ingress with TLS termination, or use a LoadBalancer with TLS passthrough.

### Configure Talos Nodes

Point your Talos nodes to the internal discovery service:

```yaml
# internal-discovery.yaml
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: false
        endpoint: https://discovery.internal.local/
      kubernetes:
        disabled: false
```

If using an internal CA, add the CA certificate to the Talos trust store:

```yaml
machine:
  files:
    - content: |
        -----BEGIN CERTIFICATE-----
        <your-internal-ca-certificate>
        -----END CERTIFICATE-----
      path: /etc/ssl/certs/internal-ca.pem
      permissions: 0644
```

## Option 3: Disable Discovery Entirely

For the most locked-down environments:

```yaml
# no-discovery.yaml
cluster:
  discovery:
    enabled: false
```

Without discovery:
- KubeSpan will not work
- You must manage node membership manually
- Cluster operations still function through standard Kubernetes mechanisms

## Pre-Staging Talos Images

In air-gapped environments, you also need to pre-stage Talos Linux itself. Download the Talos images and installer:

```bash
# On a machine with internet access
# Download the Talos ISO
wget https://github.com/siderolabs/talos/releases/download/v1.7.0/talos-amd64.iso

# Download the installer image
docker pull ghcr.io/siderolabs/installer:v1.7.0
docker save ghcr.io/siderolabs/installer:v1.7.0 -o talos-installer.tar

# Download required Kubernetes images
talosctl images --kubernetes-version 1.29.0 > required-images.txt
```

Transfer these to your air-gapped network and push to your internal registry.

Configure Talos to use your internal registry:

```yaml
machine:
  registries:
    mirrors:
      ghcr.io:
        endpoints:
          - https://registry.internal.local
      registry.k8s.io:
        endpoints:
          - https://registry.internal.local
      docker.io:
        endpoints:
          - https://registry.internal.local
```

## DNS Configuration for Air-Gapped Networks

Nodes need to resolve the discovery service hostname. Configure DNS in the Talos machine config:

```yaml
machine:
  network:
    nameservers:
      - 10.0.0.2  # Internal DNS server
```

Make sure your internal DNS resolves the discovery service hostname:

```bash
# On the internal DNS server, add:
# discovery.internal.local -> <discovery-service-ip>
```

## Testing Discovery in Air-Gapped Environments

After setting everything up, validate the configuration:

```bash
# Check that nodes can reach the internal discovery service
talosctl logs controller-runtime --nodes <node-ip> | grep discovery

# Verify discovered members
talosctl get discoveredmembers --nodes <node-ip>

# Check Kubernetes nodes
kubectl get nodes

# Test KubeSpan connectivity (if enabled)
talosctl get kubespanpeerstatus --nodes <node-ip>
```

If discovery is not working, check:

```bash
# DNS resolution
talosctl logs controller-runtime --nodes <node-ip> | grep -i "dns\|resolv"

# TLS issues
talosctl logs controller-runtime --nodes <node-ip> | grep -i "tls\|certificate"

# Network connectivity
talosctl get addresses --nodes <node-ip>
talosctl get routes --nodes <node-ip>
```

## Backup and Recovery

In air-gapped environments, recovery from failures requires more planning because you cannot download anything from the internet:

```bash
# Back up cluster secrets
talosctl gen secrets -o /secure-backup/secrets.yaml

# Back up machine configurations
talosctl get machineconfig --nodes <node-ip> -o yaml > /secure-backup/machineconfig-<node>.yaml

# Back up the etcd database
talosctl etcd snapshot /secure-backup/etcd-snapshot.db --nodes <cp-node-ip>
```

Keep these backups in a secure location within the air-gapped environment. If you need to rebuild the cluster, you will need these files along with the pre-staged images.

## Operational Workflow

Day-to-day operations in an air-gapped environment with self-hosted discovery follow the same patterns as a regular cluster, with the additional requirement that any new software must be pre-staged:

```bash
# Adding a new node (image must already be in internal registry)
talosctl apply-config --insecure \
  --nodes <new-node-ip> \
  --file worker.yaml

# Upgrading Talos (new installer image must be pre-staged)
talosctl upgrade --image registry.internal.local/siderolabs/installer:v1.8.0 \
  --nodes <node-ip>
```

Running Talos Linux in air-gapped environments requires more upfront planning, but the actual configuration is straightforward. Whether you choose the Kubernetes-only registry, a self-hosted discovery service, or no discovery at all, the key is matching the approach to your security requirements and operational capabilities. Start with the simplest option that meets your needs and add complexity only when necessary.
