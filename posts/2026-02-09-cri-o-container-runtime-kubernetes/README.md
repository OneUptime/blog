# How to Use CRI-O as the Container Runtime for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CRI-O, Container Runtime, Configuration

Description: Learn how to install, configure, and use CRI-O as a lightweight container runtime for Kubernetes clusters with optimal performance and security features.

---

CRI-O is a lightweight container runtime built specifically for Kubernetes. Unlike Docker and containerd, which were designed as general-purpose container tools, CRI-O implements only what Kubernetes needs from the Container Runtime Interface (CRI). This focused approach results in a minimal, efficient runtime that integrates seamlessly with Kubernetes.

## Why Choose CRI-O

CRI-O offers several advantages for Kubernetes deployments. It has a smaller attack surface compared to full-featured container engines, follows Kubernetes release cycles closely, and provides excellent OCI compliance. The runtime is maintained by the Kubernetes community and designed to work exclusively with Kubernetes.

The architecture is straightforward: CRI-O receives requests from kubelet via the CRI, manages container lifecycle using crun, runc, or other OCI-compliant runtimes, and handles image pulling and storage. It does not include unnecessary features like docker-compose support or standalone CLI tools beyond what Kubernetes requires.

## Installing CRI-O on Ubuntu

Install CRI-O on Ubuntu 22.04 or later:

```bash
# Set up environment variables for your Kubernetes version

export KUBERNETES_VERSION=v1.36
export CRIO_VERSION=v1.36

# Install dependencies for package repositories
sudo apt-get update
sudo apt-get install -y software-properties-common curl gpg
sudo mkdir -p -m 755 /etc/apt/keyrings

# Add Kubernetes repository
curl -fsSL https://pkgs.k8s.io/core:/stable:/$KUBERNETES_VERSION/deb/Release.key | \
  sudo gpg --batch --yes --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/$KUBERNETES_VERSION/deb/ /" | \
  sudo tee /etc/apt/sources.list.d/kubernetes.list

# Add CRI-O repository
curl -fsSL https://download.opensuse.org/repositories/isv:/cri-o:/stable:/$CRIO_VERSION/deb/Release.key | \
  sudo gpg --batch --yes --dearmor -o /etc/apt/keyrings/cri-o-apt-keyring.gpg

echo "deb [signed-by=/etc/apt/keyrings/cri-o-apt-keyring.gpg] https://download.opensuse.org/repositories/isv:/cri-o:/stable:/$CRIO_VERSION/deb/ /" | \
  sudo tee /etc/apt/sources.list.d/cri-o.list

# Install CRI-O
sudo apt-get update
sudo apt-get install -y cri-o kubelet kubeadm kubectl

# Enable and start CRI-O
sudo systemctl daemon-reload
sudo systemctl enable crio
sudo systemctl start crio

# Configure crictl to use CRI-O explicitly
cat <<EOF | sudo tee /etc/crictl.yaml
runtime-endpoint: unix:///var/run/crio/crio.sock
image-endpoint: unix:///var/run/crio/crio.sock
timeout: 10
debug: false
EOF
```

Verify the installation:

```bash
# Check CRI-O status
sudo systemctl status crio

# Verify version
sudo crio --version

# Check runtime info
sudo crictl info
```

## Configuring CRI-O for Kubernetes

CRI-O uses configuration files in `/etc/crio/crio.conf` and `/etc/crio/crio.conf.d/`. Edit the main configuration:

```bash
# Create custom configuration
sudo mkdir -p /etc/crio/crio.conf.d
sudo nano /etc/crio/crio.conf.d/01-kubernetes.conf
```

Add these settings:

```toml
# CRI-O Configuration for Kubernetes

[crio]
  # Root directory for CRI-O data
  root = "/var/lib/containers/storage"

  # Directory for runtime state
  runroot = "/var/run/containers/storage"

  # Storage driver (overlay recommended)
  storage_driver = "overlay"

  # Storage options
  storage_option = [
    "overlay.override_kernel_check=1",
  ]

[crio.api]
  # Listen on unix socket
  listen = "/var/run/crio/crio.sock"

  # Socket directory permissions
  stream_address = "127.0.0.1"
  stream_port = "0"

[crio.runtime]
  # Default runtime (crun)
  default_runtime = "crun"

  # Container runtime options
  no_pivot = false

  # SELinux (disable if not using)
  selinux = false

  # AppArmor (enable on Ubuntu)
  apparmor_profile = "crio-default"

  # Seccomp profile
  seccomp_profile = "/usr/share/containers/seccomp.json"

  # Cgroup manager (systemd recommended)
  cgroup_manager = "systemd"

  # Conmon binary path
  conmon = "/usr/bin/conmon"

  # Conmon environment variables
  conmon_env = [
    "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
  ]

  # Hooks directory
  hooks_dir = [
    "/usr/share/containers/oci/hooks.d",
  ]

  # Default capabilities
  default_capabilities = [
    "CHOWN",
    "DAC_OVERRIDE",
    "FSETID",
    "FOWNER",
    "SETGID",
    "SETUID",
    "SETPCAP",
    "NET_BIND_SERVICE",
    "KILL",
  ]

[crio.runtime.runtimes.crun]
  # Path to crun binary
  runtime_path = "/usr/bin/crun"

  # Runtime type
  runtime_type = "oci"

  # Runtime root
  runtime_root = "/run/crun"

[crio.image]
  # Default transport for pulling images
  default_transport = "docker://"

  # Global auth file
  global_auth_file = ""

  # Pause image for pod infrastructure containers
  pause_image = "registry.k8s.io/pause:3.10.1"

  # Pause image authentication
  pause_image_auth_file = ""

  # Pause command
  pause_command = "/pause"

[crio.network]
  # Network configuration directory
  network_dir = "/etc/cni/net.d/"

  # CNI plugin binary directory
  plugin_dirs = [
    "/opt/cni/bin/",
  ]

[crio.metrics]
  # Enable metrics endpoint
  enable_metrics = true

  # Metrics port
  metrics_port = 9090
```

Restart CRI-O to apply changes:

```bash
# Restart CRI-O
sudo systemctl restart crio

# Verify configuration
sudo crictl info | grep -i cgroup
```

## Setting Up Kubernetes with CRI-O

When initializing a Kubernetes cluster with kubeadm, specify CRI-O as the runtime:

```bash
# Create kubeadm configuration
cat <<EOF > kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
kubernetesVersion: v1.36.0
networking:
  podSubnet: 10.244.0.0/16
---
apiVersion: kubeadm.k8s.io/v1beta4
kind: InitConfiguration
nodeRegistration:
  criSocket: unix:///var/run/crio/crio.sock
---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
cgroupDriver: systemd
EOF

# Initialize cluster
sudo kubeadm init --config kubeadm-config.yaml

# For joining nodes, specify the CRI socket
sudo kubeadm join <control-plane-ip>:6443 \
  --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash> \
  --cri-socket unix:///var/run/crio/crio.sock
```

For kubelet installations not bootstrapped by kubeadm, configure the runtime endpoint in the kubelet configuration file:

```bash
# Edit kubelet configuration
sudo nano /var/lib/kubelet/config.yaml

# Set these fields
containerRuntimeEndpoint: unix:///var/run/crio/crio.sock
cgroupDriver: systemd

# Reload and restart kubelet
sudo systemctl daemon-reload
sudo systemctl restart kubelet
```

## Configuring Registry Authentication

Set up authentication for private registries:

```bash
# Create registry configuration directory
sudo mkdir -p /etc/containers/registries.conf.d

# Add registry configuration
cat <<EOF | sudo tee /etc/containers/registries.conf.d/02-registries.conf
[[registry]]
  prefix = "docker.io"
  insecure = false
  blocked = false
  location = "docker.io"

[[registry]]
  prefix = "registry.example.com"
  insecure = false
  blocked = false
  location = "registry.example.com"

  [[registry.mirror]]
    location = "mirror.registry.example.com"
    insecure = false
EOF

# Create auth file
sudo mkdir -p /var/lib/kubelet
cat <<EOF | sudo tee /var/lib/kubelet/config.json
{
  "auths": {
    "registry.example.com": {
      "auth": "base64-encoded-username-password"
    }
  }
}
EOF

# Point CRI-O at the global auth file for node-level pulls
sudo mkdir -p /etc/crio/crio.conf.d
cat <<EOF | sudo tee /etc/crio/crio.conf.d/02-auth.conf
[crio.image]
  global_auth_file = "/var/lib/kubelet/config.json"
EOF

# Restart CRI-O
sudo systemctl restart crio
```

Pull a private image to test:

```bash
# Pull image through CRI-O
sudo crictl pull registry.example.com/myapp:latest

# List pulled images
sudo crictl images
```

## Using Multiple Runtime Handlers

Configure additional OCI runtimes for specialized workloads:

```bash
# Add runtime handlers to CRI-O config
cat <<EOF | sudo tee /etc/crio/crio.conf.d/03-runtimes.conf
[crio.runtime.runtimes.runc]
  runtime_path = "/usr/bin/runc"
  runtime_type = "oci"

[crio.runtime.runtimes.crun]
  runtime_path = "/usr/bin/crun"
  runtime_type = "oci"

[crio.runtime.runtimes.kata]
  runtime_path = "/usr/bin/kata-runtime"
  runtime_type = "vm"
EOF

# Restart CRI-O
sudo systemctl restart crio
```

Create RuntimeClass resources:

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: crun
handler: crun
---
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata
handler: kata
---
apiVersion: v1
kind: Pod
metadata:
  name: high-security-pod
spec:
  runtimeClassName: kata
  containers:
  - name: app
    image: nginx:latest
```

## Managing Containers with crictl

Use crictl to interact with CRI-O:

```bash
# List running containers
sudo crictl ps

# List all containers including stopped
sudo crictl ps -a

# Inspect a container
sudo crictl inspect <container-id>

# View container logs
sudo crictl logs <container-id>

# Execute command in container
sudo crictl exec -it <container-id> /bin/sh

# List images
sudo crictl images

# Pull an image
sudo crictl pull nginx:latest

# Remove an image
sudo crictl rmi nginx:latest

# List pods
sudo crictl pods

# Get pod details
sudo crictl inspectp <pod-id>
```

## Monitoring CRI-O Performance

Enable and access CRI-O metrics:

```bash
# Check if metrics are enabled
curl http://localhost:9090/metrics

# Expose one node's CRI-O metrics endpoint for Prometheus scraping
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: crio-metrics
  namespace: kube-system
  labels:
    app: crio
spec:
  ports:
  - name: metrics
    port: 9090
    targetPort: 9090
  type: ClusterIP
---
apiVersion: v1
kind: Endpoints
metadata:
  name: crio-metrics
  namespace: kube-system
subsets:
- addresses:
  - ip: <node-ip>
  ports:
  - name: metrics
    port: 9090
EOF
```

Monitor CRI-O resource usage:

```bash
# Check CRI-O service status
sudo systemctl status crio

# View memory usage
sudo systemctl show crio --property=MemoryCurrent

# Check storage usage
sudo df -h /var/lib/containers/storage

# View CRI-O logs
sudo journalctl -u crio -f
```

## Troubleshooting CRI-O Issues

Common issues and solutions:

```bash
# CRI-O won't start
sudo journalctl -u crio -n 50 --no-pager

# Check configuration syntax
sudo crio config > /tmp/crio-test.conf

# Reset CRI-O storage (WARNING: deletes all containers and images)
sudo systemctl stop crio
sudo rm -rf /var/lib/containers/storage/*
sudo systemctl start crio

# Verify CNI plugins
ls -la /opt/cni/bin/
ls -la /etc/cni/net.d/

# Test pod creation
sudo crictl runp test-pod.json
sudo crictl stopp <pod-id>
sudo crictl rmp <pod-id>
```

CRI-O provides a streamlined, Kubernetes-focused container runtime that reduces complexity while maintaining full compatibility with the Kubernetes ecosystem. Its minimal design and close alignment with Kubernetes releases make it an excellent choice for production clusters.
