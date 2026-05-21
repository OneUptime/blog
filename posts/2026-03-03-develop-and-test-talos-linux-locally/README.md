# How to Develop and Test Talos Linux Locally

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Local Development, Testing, QEMU, Docker

Description: A practical guide to developing and testing Talos Linux locally using Docker, QEMU, and talosctl for rapid iteration on custom builds and configurations.

---

Developing for Talos Linux requires a way to quickly test changes without deploying to production hardware. Fortunately, Talos has excellent local development support through Docker-based clusters, QEMU virtual machines, and the talosctl CLI. You can spin up a full Kubernetes cluster running on Talos in minutes, test your modifications, tear it down, and start again. This rapid feedback loop is essential whether you are developing system extensions, testing configuration changes, or contributing to the core project.

This guide covers the different approaches to local Talos development and testing, with practical workflows for each.

## Local Development Options

`talosctl cluster create` ships with two built-in local provisioners:

- **Docker** - The fastest option, runs Talos nodes as Docker containers (works on Linux and macOS)
- **QEMU** - Full virtual machines for testing bare-metal-like behavior (Linux only, requires KVM)

Docker is best for rapid development cycles. QEMU is best when you need to test features that require real VM behavior, like kernel modules, disk operations, or boot processes. Other virtualization platforms such as VirtualBox or VMware are supported as Talos boot targets via downloadable images, but they are not exposed as `--provisioner` options for the local cluster command.

## Docker-Based Local Clusters

The fastest way to get a local Talos cluster is with Docker.

### Creating a Cluster

```bash
# Create a basic cluster with 1 control plane and 2 workers

talosctl cluster create \
  --name dev-cluster \
  --controlplanes 1 \
  --workers 2

# The cluster will be ready in about 2-3 minutes
# talosctl automatically configures kubectl access
```

### Using a Custom Installer Image

If you have built a custom Talos image, use it for your local cluster.

```bash
# Build your custom installer first
cd /path/to/talos
make installer TAG=dev

# Create cluster with custom image
talosctl cluster create \
  --name dev-cluster \
  --install-image ghcr.io/siderolabs/installer:dev \
  --controlplanes 1 \
  --workers 1
```

### Cluster Management

```bash
# Check cluster status
talosctl cluster show --name dev-cluster

# Get kubectl access (talosctl cluster create merges the cluster
# into your default kubeconfig at ~/.kube/config)
kubectl get nodes

# View cluster details
talosctl -n 10.5.0.2 health
talosctl -n 10.5.0.2 dashboard

# Destroy the cluster when done
talosctl cluster destroy --name dev-cluster
```

## QEMU-Based Local Clusters

QEMU provides more realistic testing by running Talos in actual virtual machines.

### Setting Up QEMU

```bash
# Install QEMU and dependencies
sudo apt-get install -y \
  qemu-system-x86 \
  qemu-utils \
  bridge-utils \
  iptables \
  ovmf

# Verify KVM support
ls /dev/kvm

# Add your user to the kvm group so /dev/kvm is accessible
# without elevated privileges (log out and back in to apply)
sudo usermod -aG kvm "$USER"
```

The QEMU provisioner also relies on the standard CNI plugins (`bridge`, `static`, `firewall`) plus `tc-redirect-tap`, installed under `/opt/cni/bin`. See the official QEMU local-platform guide for the up-to-date list of dependencies.

### Creating a QEMU Cluster

```bash
# Create a QEMU-based cluster
# The QEMU provisioner needs root for networking (tap devices, iptables);
# --preserve-env=HOME keeps the talosconfig in your user's home directory.
sudo --preserve-env=HOME talosctl cluster create \
  --name qemu-cluster \
  --provisioner qemu \
  --controlplanes 1 \
  --workers 2 \
  --cpus 2 \
  --memory 4096 \
  --disk 10240

# This takes longer than Docker (5-10 minutes)
# but provides more realistic behavior
```

### Using Custom ISOs with QEMU

```bash
# Build a custom ISO
cd /path/to/talos
make iso TAG=dev

# Create cluster with custom ISO
sudo --preserve-env=HOME talosctl cluster create \
  --name qemu-cluster \
  --provisioner qemu \
  --iso-path _out/talos-amd64.iso \
  --controlplanes 1 \
  --workers 1
```

## Development Workflow

Here is a practical workflow for developing and testing changes to Talos.

### Workflow 1: Testing Configuration Changes

```bash
# 1. Create a base cluster
talosctl cluster create --name test-config

# 2. Generate machine config
talosctl gen config test https://10.5.0.2:6443

# 3. Edit the configuration
# Make your changes to controlplane.yaml or worker.yaml

# 4. Apply configuration changes
talosctl -n 10.5.0.2 apply-config --file controlplane.yaml

# 5. Verify changes
talosctl -n 10.5.0.2 get machineconfig -o yaml

# 6. Clean up
talosctl cluster destroy --name test-config
```

### Workflow 2: Testing Custom Builds

```bash
# 1. Make your code changes
cd /path/to/talos
git checkout -b my-feature

# Edit source files...

# 2. Build the modified components
make talosctl
make installer TAG=my-feature

# 3. Create a cluster with your build
talosctl cluster create \
  --name feature-test \
  --install-image ghcr.io/siderolabs/installer:my-feature

# 4. Test your changes
talosctl -n 10.5.0.2 health
kubectl get nodes

# 5. Iterate - make more changes, rebuild, upgrade
make installer TAG=my-feature-v2
talosctl -n 10.5.0.2 upgrade \
  --image ghcr.io/siderolabs/installer:my-feature-v2

# 6. Clean up
talosctl cluster destroy --name feature-test
```

### Workflow 3: Testing System Extensions

Modern Talos releases bake system extensions into the installer image rather than installing them at runtime - the `.machine.install.extensions` field is deprecated. For local development, build a custom installer that includes the extension and then upgrade the node to that installer.

```bash
# 1. Build your extension as an OCI image
cd /path/to/my-extension
docker build -t localhost:5000/my-extension:dev .

# 2. Run a local registry and push the extension
docker run -d -p 5000:5000 --name registry registry:2
docker push localhost:5000/my-extension:dev

# 3. Build a custom installer image that includes your extension.
#    See the Talos "Boot Assets" guide for the imager command,
#    or use the Image Factory at https://factory.talos.dev for
#    images that pull in official extensions by schematic ID.
#    The result is an installer image tag you can point upgrade at,
#    for example: ghcr.io/my-org/installer:dev-with-ext

# 4. Create a cluster and upgrade it to your custom installer
talosctl cluster create --name ext-test
talosctl -n 10.5.0.2 upgrade \
  --image ghcr.io/my-org/installer:dev-with-ext

# 5. Verify the extension is present
talosctl -n 10.5.0.2 get extensions
```

## Using the Talos Dashboard

The talosctl dashboard provides a terminal-based UI for monitoring your cluster.

```bash
# Launch the dashboard
talosctl -n 10.5.0.2 dashboard

# The dashboard shows:
# - CPU and memory usage
# - Running services
# - Kernel messages
# - Network statistics
# - Kubernetes status
```

The dashboard is extremely useful during development because it gives you real-time visibility into what is happening on the node.

## Running Tests

Talos has its own test suite that you can run locally.

```bash
# Run unit tests
make unit-tests

# Run integration tests (requires a running cluster)
make integration-test

# Run specific test packages
go test ./internal/app/machined/...
go test ./pkg/machinery/...
```

### End-to-End Testing

The Talos Makefile exposes platform-specific E2E targets such as `e2e-docker` and `e2e-qemu`. Each one provisions a fresh cluster on the chosen provisioner and runs the integration suite against it.

```bash
# Run the Docker-based E2E suite (fastest)
make e2e-docker

# Or run the QEMU-based E2E suite (more realistic)
make e2e-qemu

# These run comprehensive tests including:
# - Node provisioning
# - Configuration application
# - Kubernetes functionality
# - Upgrade scenarios
# - Reset and recovery
```

## Debugging Talos Locally

When things go wrong, use these debugging techniques.

### Viewing Logs

```bash
# View all service logs
talosctl -n 10.5.0.2 logs machined
talosctl -n 10.5.0.2 logs containerd
talosctl -n 10.5.0.2 logs kubelet
talosctl -n 10.5.0.2 logs etcd

# View kernel messages
talosctl -n 10.5.0.2 dmesg

# Follow logs in real time
talosctl -n 10.5.0.2 logs machined -f
```

### Inspecting System State

```bash
# View running processes
talosctl -n 10.5.0.2 processes

# Check resource usage
talosctl -n 10.5.0.2 stats

# Read specific files on the node
talosctl -n 10.5.0.2 read /proc/cmdline
talosctl -n 10.5.0.2 read /proc/version
talosctl -n 10.5.0.2 read /etc/os-release

# List files in a directory
talosctl -n 10.5.0.2 list /var/log/
```

### Using Serial Console (QEMU)

When using QEMU clusters, you can access the serial console for early boot debugging.

```bash
# QEMU clusters expose a serial console
# Check the cluster info for console details
talosctl cluster show --name qemu-cluster
```

## Continuous Integration Setup

For team development, set up CI to test changes automatically.

```yaml
# .github/workflows/test.yml
name: Test Talos Changes
on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install talosctl
        run: curl -sL https://talos.dev/install | sh

      - name: Build custom image
        run: make installer TAG=${{ github.sha }}

      - name: Create test cluster
        run: |
          talosctl cluster create \
            --name ci-test \
            --install-image ghcr.io/siderolabs/installer:${{ github.sha }} \
            --wait-timeout 10m

      - name: Run tests
        run: |
          kubectl get nodes
          kubectl get pods -A

      - name: Cleanup
        if: always()
        run: talosctl cluster destroy --name ci-test
```

## Tips for Efficient Local Development

A few practical tips that speed up the development cycle.

Keep a base cluster running and use `talosctl upgrade` instead of destroying and recreating for each change. This saves the cluster bootstrap time.

Use Docker provisioner for most development. Only switch to QEMU when you specifically need VM-level behavior.

Pre-pull common images to your Docker cache to speed up cluster creation.

```bash
# Pre-pull Talos images
docker pull ghcr.io/siderolabs/installer:v1.7.0
docker pull ghcr.io/siderolabs/kubelet:v1.29.0
```

Use `talosctl apply-config` for configuration changes that do not require an upgrade. This is much faster than a full upgrade cycle.

## Conclusion

Local development and testing is a core part of working with Talos Linux. The Docker and QEMU provisioners let you create disposable clusters in minutes, and the talosctl CLI provides everything you need to manage, debug, and iterate on your changes. Whether you are testing a new configuration, building a custom extension, or working on the Talos codebase itself, the local development workflow is fast and reliable. Start with Docker clusters for speed, and use QEMU when you need the fidelity of real virtual machines.
