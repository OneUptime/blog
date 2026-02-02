# How to Install K3s on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: K3s, Kubernetes, Ubuntu, Linux, DevOps

Description: A step-by-step guide to installing K3s on Ubuntu, from prerequisites to running your first workload on a lightweight Kubernetes cluster.

---

K3s is a lightweight Kubernetes distribution built for resource-constrained environments, edge computing, and developers who want a fast path to a working cluster. Rancher Labs stripped out cloud provider integrations and legacy features, bundled everything into a single binary under 100 MB, and replaced etcd with SQLite by default. The result is a Kubernetes cluster that starts in under 30 seconds and runs on machines with as little as 512 MB of RAM.

This guide walks through installing K3s on Ubuntu, configuring it for production use, and verifying the installation with a real workload.

## Why K3s Over Full Kubernetes?

Before diving into installation, here is when K3s makes sense:

| Scenario | K3s Advantage |
| --- | --- |
| Home labs and CI runners | Single binary, no container runtime to pre-install |
| Edge devices (Raspberry Pi, NUCs) | Low memory footprint, ARM64 support |
| Development environments | Fast spin-up, easy teardown |
| Air-gapped installations | Offline install script available |
| Learning Kubernetes | Same API, less infrastructure overhead |

If you need multi-master HA with external etcd and every upstream feature, standard kubeadm or a managed service might fit better. For everything else, K3s removes friction.

## Prerequisites

Before installing K3s, make sure your Ubuntu system meets these requirements:

- Ubuntu 20.04 LTS, 22.04 LTS, or 24.04 LTS
- At least 1 CPU core and 512 MB RAM (2 cores and 2 GB recommended for real workloads)
- Root or sudo access
- Ports 6443 (Kubernetes API), 8472/UDP (Flannel VXLAN), and 10250 (kubelet) open if running behind a firewall

Check your Ubuntu version to confirm compatibility.

```bash
# Display Ubuntu version to verify you're on a supported release
lsb_release -a
```

Update your system packages before proceeding.

```bash
# Update package lists and upgrade existing packages
sudo apt update && sudo apt upgrade -y
```

## Step 1: Install K3s with the Official Script

K3s provides a one-liner installation script that handles everything. This installs the latest stable release, sets up systemd services, and configures kubectl.

```bash
# Download and run the official K3s install script
# This installs K3s as a systemd service and starts it automatically
curl -sfL https://get.k3s.io | sh -
```

The script does the following:

1. Downloads the K3s binary to `/usr/local/bin/k3s`
2. Creates a systemd service at `/etc/systemd/system/k3s.service`
3. Generates the kubeconfig at `/etc/rancher/k3s/k3s.yaml`
4. Starts K3s immediately

After installation completes, verify the service is running.

```bash
# Check K3s service status
sudo systemctl status k3s
```

You should see "active (running)" in the output.

## Step 2: Configure kubectl Access

K3s bundles kubectl, but it requires root access by default since the kubeconfig lives in `/etc/rancher/k3s/k3s.yaml`. Set up access for your regular user.

```bash
# Create the .kube directory if it doesn't exist
mkdir -p ~/.kube

# Copy the K3s kubeconfig to your home directory
# This avoids needing sudo for every kubectl command
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config

# Fix ownership so your user can read the file
sudo chown $(id -u):$(id -g) ~/.kube/config

# Verify the configuration works
kubectl get nodes
```

You should see your node listed with status "Ready" after a few seconds.

```
NAME          STATUS   ROLES                  AGE   VERSION
ubuntu-node   Ready    control-plane,master   45s   v1.31.3+k3s1
```

## Step 3: Understand What K3s Installed

K3s bundles several components that would normally require separate installation.

```mermaid
flowchart TB
    subgraph K3s["K3s Server Node"]
        API[Kubernetes API Server]
        CTRL[Controller Manager]
        SCHED[Scheduler]
        SQLITE[(SQLite Database)]
        FLANNEL[Flannel CNI]
        COREDNS[CoreDNS]
        TRAEFIK[Traefik Ingress]
        LB[ServiceLB]
        CONT[containerd]
    end
    API --> SQLITE
    API --> CTRL
    API --> SCHED
    FLANNEL --> CONT
    COREDNS --> API
    TRAEFIK --> API
```

Key components:

- **containerd**: Container runtime (replaces Docker)
- **Flannel**: Default CNI for pod networking
- **CoreDNS**: Cluster DNS resolution
- **Traefik**: Ingress controller (can be disabled if you prefer nginx or another option)
- **ServiceLB**: Load balancer for bare-metal environments
- **SQLite**: Default datastore (can be swapped for etcd, MySQL, or PostgreSQL)

## Step 4: Verify Cluster Health

Run these commands to confirm everything is working.

```bash
# List all pods across all namespaces to verify core components
kubectl get pods -A
```

Expected output shows system pods running:

```
NAMESPACE     NAME                                      READY   STATUS    RESTARTS   AGE
kube-system   coredns-7b98449c4-xvz8p                  1/1     Running   0          2m
kube-system   local-path-provisioner-6c86858495-kfn2m  1/1     Running   0          2m
kube-system   metrics-server-54fd9b65b-9tdqm           1/1     Running   0          2m
kube-system   svclb-traefik-abc123-defgh               2/2     Running   0          2m
kube-system   traefik-7d5f6474df-xyzab                 1/1     Running   0          2m
```

Check cluster info for API server details.

```bash
# Display cluster information including API server endpoint
kubectl cluster-info
```

## Step 5: Deploy a Test Workload

Confirm the cluster works by deploying a simple nginx pod and exposing it.

```bash
# Create a deployment with one nginx replica
kubectl create deployment nginx --image=nginx:alpine

# Expose the deployment as a LoadBalancer service
# K3s ServiceLB will assign an external IP from your node's address
kubectl expose deployment nginx --port=80 --type=LoadBalancer

# Watch the service until an external IP is assigned
kubectl get svc nginx -w
```

Once the EXTERNAL-IP shows your node's IP address, test connectivity.

```bash
# Fetch the external IP programmatically
EXTERNAL_IP=$(kubectl get svc nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Verify nginx responds
curl http://$EXTERNAL_IP
```

You should see the nginx welcome page HTML.

Clean up the test resources when done.

```bash
# Remove the test deployment and service
kubectl delete deployment nginx
kubectl delete svc nginx
```

## Step 6: Add Worker Nodes (Optional)

K3s supports adding agent nodes to distribute workloads. On your server node, retrieve the node token.

```bash
# Display the node token needed for workers to join
sudo cat /var/lib/rancher/k3s/server/node-token
```

On each worker node, run the install script with the server URL and token.

```bash
# Replace SERVER_IP with your K3s server's IP address
# Replace NODE_TOKEN with the token from the previous command
curl -sfL https://get.k3s.io | K3S_URL=https://SERVER_IP:6443 K3S_TOKEN=NODE_TOKEN sh -
```

After the agent starts, verify the new node appears on the server.

```bash
# List all nodes in the cluster
kubectl get nodes
```

The output should show both nodes:

```
NAME            STATUS   ROLES                  AGE   VERSION
ubuntu-server   Ready    control-plane,master   10m   v1.31.3+k3s1
ubuntu-worker   Ready    <none>                 30s   v1.31.3+k3s1
```

## Step 7: Configure K3s for Production

For production use, consider these adjustments.

### Disable Traefik if Using Another Ingress

If you prefer nginx-ingress or another controller, disable Traefik during installation.

```bash
# Install K3s without the bundled Traefik ingress controller
curl -sfL https://get.k3s.io | sh -s - --disable=traefik
```

### Use External Datastore for High Availability

For multi-server setups, point K3s to an external PostgreSQL or MySQL database.

```bash
# Install K3s with an external PostgreSQL database
# This enables running multiple server nodes for HA
curl -sfL https://get.k3s.io | sh -s - server \
  --datastore-endpoint="postgres://user:password@db-host:5432/k3s"
```

### Set a Static Node IP

If your server has multiple interfaces, specify which IP to advertise.

```bash
# Install with a specific node IP and external IP for API access
curl -sfL https://get.k3s.io | sh -s - \
  --node-ip=192.168.1.100 \
  --node-external-ip=192.168.1.100
```

## Common Installation Options Reference

| Option | Purpose |
| --- | --- |
| `--disable=traefik` | Skip Traefik installation |
| `--disable=servicelb` | Skip the built-in load balancer |
| `--flannel-backend=none` | Use a different CNI (Calico, Cilium) |
| `--write-kubeconfig-mode=644` | Make kubeconfig world-readable |
| `--tls-san=my.domain.com` | Add SANs to the API server certificate |
| `--data-dir=/custom/path` | Store K3s data in a custom directory |
| `--cluster-init` | Initialize a new HA cluster with embedded etcd |

## Uninstalling K3s

If you need to remove K3s, use the included uninstall scripts.

```bash
# On the server node - removes K3s and all data
/usr/local/bin/k3s-uninstall.sh

# On agent nodes - removes the K3s agent
/usr/local/bin/k3s-agent-uninstall.sh
```

This deletes all cluster data, containers, and configurations. Back up any persistent volumes first.

## Troubleshooting Common Issues

**Node stuck in NotReady state**

Check the kubelet logs for errors.

```bash
# View K3s service logs for troubleshooting
sudo journalctl -u k3s -f
```

**Cannot connect to API server**

Verify the correct kubeconfig is being used.

```bash
# Confirm KUBECONFIG points to the right file
echo $KUBECONFIG

# Or use the K3s-provided kubectl directly
sudo k3s kubectl get nodes
```

**Flannel network issues**

Ensure UDP port 8472 is open between nodes and the firewall allows VXLAN traffic.

```bash
# Open Flannel VXLAN port if using ufw
sudo ufw allow 8472/udp
```

## Next Steps

With K3s running, you have a production-capable Kubernetes cluster ready for workloads. From here you might:

- Install Helm for package management
- Set up persistent storage with Longhorn or a local-path provisioner
- Configure monitoring with Prometheus and Grafana
- Add GitOps with ArgoCD or Flux

For teams running K3s in production, monitoring cluster health becomes critical. Track node status, pod restarts, and resource utilization to catch issues before they impact users.

---

*Running Kubernetes in production? [OneUptime](https://oneuptime.com) provides unified monitoring for your K3s clusters with alerting, status pages, and incident management. Monitor your infrastructure and applications from a single platform.*
