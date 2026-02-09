# How to Use kubelet Configuration Files Instead of Command-Line Flags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubelet, Configuration Management

Description: Learn how to migrate from kubelet command-line flags to configuration files for better maintainability, version control, and consistency across your Kubernetes cluster nodes.

---

The kubelet accepts configuration through command-line flags, but managing dozens of flags across many nodes quickly becomes unwieldy. Kubernetes provides a structured configuration file format that offers better organization, validation, and version control. Modern best practices favor configuration files over flags for production deployments.

This guide demonstrates how to migrate from flag-based to file-based kubelet configuration and manage configurations effectively.

## Understanding kubelet Configuration Methods

The kubelet can be configured via:

1. **Command-line flags**: Legacy method, still widely used
2. **Configuration file**: Structured YAML file (recommended)
3. **Dynamic configuration**: Via API (deprecated in 1.22, removed in 1.24)

Benefits of configuration files:
- Structured, validated configuration
- Easy to version control and diff
- Easier to share across nodes
- Better documentation and comments
- Type checking and validation

## Viewing Current Flag-Based Configuration

Check how your kubelet is currently configured:

```bash
# View kubelet process with all flags
ps aux | grep kubelet

# Example output:
# /usr/bin/kubelet --bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.conf \
#   --kubeconfig=/etc/kubernetes/kubelet.conf \
#   --config=/var/lib/kubelet/config.yaml \
#   --pod-infra-container-image=registry.k8s.io/pause:3.9 \
#   --max-pods=110 \
#   --container-runtime=remote \
#   --container-runtime-endpoint=unix:///var/run/containerd/containerd.sock

# Check systemd service file
cat /etc/systemd/system/kubelet.service.d/10-kubeadm.conf
```

## Creating a Configuration File

Generate a basic configuration file:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
# Authentication
authentication:
  anonymous:
    enabled: false
  webhook:
    cacheTTL: 2m0s
    enabled: true
  x509:
    clientCAFile: /etc/kubernetes/pki/ca.crt
# Authorization
authorization:
  mode: Webhook
  webhook:
    cacheAuthorizedTTL: 5m0s
    cacheUnauthorizedTTL: 30s
# Networking
clusterDNS:
- 10.96.0.10
clusterDomain: cluster.local
# Resource management
maxPods: 110
podPidsLimit: 4096
systemReserved:
  cpu: 500m
  memory: 1Gi
  ephemeral-storage: 10Gi
kubeReserved:
  cpu: 500m
  memory: 1Gi
  ephemeral-storage: 5Gi
enforceNodeAllocatable:
- pods
- system-reserved
- kube-reserved
# Eviction
evictionHard:
  memory.available: 500Mi
  nodefs.available: 10%
  nodefs.inodesFree: 5%
evictionSoft:
  memory.available: 1.5Gi
  nodefs.available: 15%
evictionSoftGracePeriod:
  memory.available: 2m
  nodefs.available: 5m
# Container runtime
containerLogMaxSize: 10Mi
containerLogMaxFiles: 5
# Image management
imageGCHighThresholdPercent: 85
imageGCLowThresholdPercent: 80
imageMinimumGCAge: 2m
# Misc
cgroupDriver: systemd
cpuManagerPolicy: none
topologyManagerPolicy: none
runtimeRequestTimeout: 15m
hairpinMode: promiscuous-bridge
failSwapOn: true
```

## Migrating from Flags to Configuration File

Map common flags to configuration file fields:

**Flag-based:**
```bash
kubelet \
  --max-pods=110 \
  --pod-infra-container-image=registry.k8s.io/pause:3.9 \
  --cluster-dns=10.96.0.10 \
  --cluster-domain=cluster.local \
  --cgroup-driver=systemd \
  --container-runtime=remote \
  --container-runtime-endpoint=unix:///var/run/containerd/containerd.sock \
  --eviction-hard=memory.available<500Mi,nodefs.available<10% \
  --system-reserved=cpu=500m,memory=1Gi \
  --kube-reserved=cpu=500m,memory=1Gi \
  --enforce-node-allocatable=pods,system-reserved,kube-reserved
```

**File-based equivalent:**
```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
maxPods: 110
podInfraContainerImage: registry.k8s.io/pause:3.9
clusterDNS:
- 10.96.0.10
clusterDomain: cluster.local
cgroupDriver: systemd
containerRuntimeEndpoint: unix:///var/run/containerd/containerd.sock
evictionHard:
  memory.available: "500Mi"
  nodefs.available: "10%"
systemReserved:
  cpu: "500m"
  memory: "1Gi"
kubeReserved:
  cpu: "500m"
  memory: "1Gi"
enforceNodeAllocatable:
- pods
- system-reserved
- kube-reserved
```

## Applying Configuration File

Update kubelet to use configuration file:

```bash
# Edit systemd service
sudo vim /etc/systemd/system/kubelet.service.d/10-kubeadm.conf

# Modify KUBELET_CONFIG_ARGS to reference config file:
# Environment="KUBELET_CONFIG_ARGS=--config=/var/lib/kubelet/config.yaml"

# Reload systemd
sudo systemctl daemon-reload

# Restart kubelet
sudo systemctl restart kubelet

# Verify kubelet started successfully
sudo systemctl status kubelet

# Check logs for configuration errors
sudo journalctl -u kubelet -n 50
```

## Validating Configuration Files

Validate configuration before applying:

```bash
# Use kubelet to validate config
kubelet --config=/var/lib/kubelet/config.yaml --dry-run

# Check for API version compatibility
kubectl explain kubeletconfiguration

# Use a validation script
cat > validate-kubelet-config.sh <<'EOF'
#!/bin/bash
CONFIG_FILE=$1

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Config file not found: $CONFIG_FILE"
  exit 1
fi

# Check YAML syntax
if ! python3 -c "import yaml; yaml.safe_load(open('$CONFIG_FILE'))" 2>/dev/null; then
  echo "Invalid YAML syntax"
  exit 1
fi

# Check API version
if ! grep -q "apiVersion: kubelet.config.k8s.io/v1beta1" "$CONFIG_FILE"; then
  echo "Warning: Unexpected API version"
fi

echo "Configuration file appears valid"
EOF

chmod +x validate-kubelet-config.sh
./validate-kubelet-config.sh /var/lib/kubelet/config.yaml
```

## Managing Configurations with kubeadm

kubeadm automatically generates kubelet config files:

```yaml
# kubeadm-cluster-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
maxPods: 200
podPidsLimit: 8192
systemReserved:
  cpu: 1000m
  memory: 2Gi
kubeReserved:
  cpu: 1000m
  memory: 2Gi
evictionHard:
  memory.available: 1Gi
  nodefs.available: 10%
cgroupDriver: systemd
containerLogMaxSize: 50Mi
containerLogMaxFiles: 10
```

Initialize cluster with custom config:

```bash
sudo kubeadm init --config kubeadm-cluster-config.yaml
```

For existing clusters, update ConfigMap:

```bash
# Extract current kubelet configuration
kubectl -n kube-system get configmap kubelet-config -o yaml > kubelet-config.yaml

# Edit the configuration
vim kubelet-config.yaml

# Apply changes
kubectl apply -f kubelet-config.yaml

# Restart kubelet on each node
# (Must be done manually on each node)
sudo systemctl restart kubelet
```

## Organizing Configurations by Node Type

Create role-specific configurations:

```yaml
# kubelet-config-control-plane.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
maxPods: 110
systemReserved:
  cpu: 1000m
  memory: 2Gi
kubeReserved:
  cpu: 2000m
  memory: 4Gi
evictionHard:
  memory.available: 2Gi
  nodefs.available: 15%
---
# kubelet-config-worker-large.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
maxPods: 250
systemReserved:
  cpu: 2000m
  memory: 4Gi
kubeReserved:
  cpu: 1000m
  memory: 2Gi
evictionHard:
  memory.available: 2Gi
  nodefs.available: 10%
---
# kubelet-config-worker-small.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
maxPods: 50
systemReserved:
  cpu: 200m
  memory: 512Mi
kubeReserved:
  cpu: 300m
  memory: 512Mi
evictionHard:
  memory.available: 500Mi
  nodefs.available: 10%
```

Deploy using configuration management tools (Ansible, etc.).

## Version Control Best Practices

Maintain configurations in Git:

```bash
# Create repository
mkdir -p kubelet-configs
cd kubelet-configs
git init

# Create directory structure
mkdir -p {control-plane,workers}/{dev,staging,prod}

# Example structure:
# kubelet-configs/
# ├── control-plane/
# │   ├── dev/
# │   │   └── config.yaml
# │   ├── staging/
# │   │   └── config.yaml
# │   └── prod/
# │       └── config.yaml
# └── workers/
#     ├── small/
#     │   └── config.yaml
#     ├── medium/
#     │   └── config.yaml
#     └── large/
#         └── config.yaml

# Track changes
git add .
git commit -m "Initial kubelet configurations"

# Create branches for testing
git checkout -b feature/increase-maxpods
# Make changes
git commit -m "Increase maxPods to 200 for large workers"
# Review and merge
```

## Automating Configuration Deployment

Use Ansible to deploy configurations:

```yaml
# deploy-kubelet-config.yml
---
- hosts: k8s_nodes
  become: yes
  tasks:
  - name: Deploy kubelet configuration
    copy:
      src: "configs/{{ inventory_hostname }}/config.yaml"
      dest: /var/lib/kubelet/config.yaml
      owner: root
      group: root
      mode: '0644'
    notify: restart kubelet

  - name: Validate kubelet configuration
    command: kubelet --config=/var/lib/kubelet/config.yaml --dry-run
    register: validation
    failed_when: validation.rc != 0

  handlers:
  - name: restart kubelet
    systemd:
      name: kubelet
      state: restarted
      daemon_reload: yes
```

Run playbook:

```bash
ansible-playbook -i inventory deploy-kubelet-config.yml
```

## Monitoring Configuration Drift

Detect configuration drift:

```bash
# Create a script to check configuration consistency
cat > check-kubelet-configs.sh <<'EOF'
#!/bin/bash

EXPECTED_HASH="<sha256sum of canonical config>"
NODES=$(kubectl get nodes -o name | cut -d'/' -f2)

for node in $NODES; do
  echo "Checking $node..."
  ACTUAL_CONFIG=$(ssh $node "sudo cat /var/lib/kubelet/config.yaml")
  ACTUAL_HASH=$(echo "$ACTUAL_CONFIG" | sha256sum | cut -d' ' -f1)

  if [ "$ACTUAL_HASH" != "$EXPECTED_HASH" ]; then
    echo "  WARNING: Configuration drift detected on $node"
  else
    echo "  OK: Configuration matches expected"
  fi
done
EOF

chmod +x check-kubelet-configs.sh
./check-kubelet-configs.sh
```

## Complete Production Example

Full production-ready configuration:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
# Authentication & Authorization
authentication:
  anonymous:
    enabled: false
  webhook:
    enabled: true
    cacheTTL: 2m0s
  x509:
    clientCAFile: /etc/kubernetes/pki/ca.crt
authorization:
  mode: Webhook
  webhook:
    cacheAuthorizedTTL: 5m0s
    cacheUnauthorizedTTL: 30s
# Cluster identity
clusterDNS:
- 10.96.0.10
clusterDomain: cluster.local
# Resource limits
maxPods: 110
podPidsLimit: 4096
# Resource reservations
systemReserved:
  cpu: 1000m
  memory: 2Gi
  ephemeral-storage: 20Gi
  pid: 1000
kubeReserved:
  cpu: 1000m
  memory: 2Gi
  ephemeral-storage: 10Gi
  pid: 500
enforceNodeAllocatable:
- pods
- system-reserved
- kube-reserved
# Eviction thresholds
evictionHard:
  memory.available: 1Gi
  nodefs.available: 10%
  nodefs.inodesFree: 5%
  pid.available: 5%
evictionSoft:
  memory.available: 2Gi
  nodefs.available: 15%
  nodefs.inodesFree: 10%
evictionSoftGracePeriod:
  memory.available: 2m
  nodefs.available: 5m
  nodefs.inodesFree: 5m
evictionPressureTransitionPeriod: 5m
evictionMaxPodGracePeriod: 120
# Container runtime
cgroupDriver: systemd
containerRuntimeEndpoint: unix:///var/run/containerd/containerd.sock
# Logging
containerLogMaxSize: 10Mi
containerLogMaxFiles: 5
# Image management
imageGCHighThresholdPercent: 85
imageGCLowThresholdPercent: 80
imageMinimumGCAge: 2m
# CPU management
cpuManagerPolicy: static
cpuManagerReconcilePeriod: 10s
reservedSystemCPUs: "0-1"
# Topology management
topologyManagerPolicy: best-effort
# Misc
runtimeRequestTimeout: 15m
hairpinMode: promiscuous-bridge
failSwapOn: true
serializeImagePulls: false
registryPullQPS: 10
registryBurst: 20
```

Using configuration files instead of command-line flags improves kubelet configuration management through better structure, validation, and version control. Migrate existing flag-based configurations to files, organize configurations by node role, use version control for tracking changes, and automate deployment with configuration management tools for consistent, maintainable Kubernetes clusters.
