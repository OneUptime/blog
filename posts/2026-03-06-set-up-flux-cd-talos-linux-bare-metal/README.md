# How to Set Up Flux CD on Talos Linux Bare Metal

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, talos linux, bare metal, kubernetes, gitops, immutable os, continuous delivery

Description: A step-by-step guide to deploying Flux CD on Talos Linux bare metal clusters for a fully immutable, GitOps-driven Kubernetes platform.

---

## Introduction

Talos Linux is a purpose-built, immutable operating system designed exclusively for running Kubernetes. It has no SSH access, no shell, and no package manager. The entire system is managed through an API, making it one of the most secure Kubernetes platforms available. Pairing Talos Linux with Flux CD creates a fully declarative, GitOps-driven infrastructure from the OS layer up.

This guide covers provisioning a Talos Linux cluster on bare metal hardware and bootstrapping Flux CD for automated application delivery.

## Prerequisites

Before you begin, ensure you have:

- At least two bare metal machines (one control plane, one worker) with PXE boot or USB boot capability
- A workstation with `talosctl`, `kubectl`, and `flux` CLI tools installed
- A GitHub account and personal access token with repo permissions
- Network connectivity between all machines
- A DHCP server on the network (or static IP assignments)

## Installing Required CLI Tools

Install the necessary tools on your workstation:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Verify talosctl
talosctl version --client

# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify Flux CLI
flux --version
```

## Generating Talos Configuration

Generate the machine configuration files for your cluster:

```bash
# Generate Talos secrets
talosctl gen secrets -o secrets.yaml

# Generate machine configuration
# Replace the endpoint with your control plane IP
talosctl gen config k8s-flux-cluster https://10.0.0.10:6443 \
  --with-secrets secrets.yaml \
  --output-dir _out
```

This creates three files in the `_out` directory:

- `controlplane.yaml` - Configuration for control plane nodes
- `worker.yaml` - Configuration for worker nodes
- `talosconfig` - Client configuration for `talosctl`

## Customizing Talos Configuration for Flux

Edit the control plane configuration to optimize for Flux CD workloads:

```yaml
# _out/controlplane-patch.yaml
# Patch file for control plane nodes
machine:
  install:
    # Specify the disk to install Talos on
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.8.0
  network:
    hostname: cp-01
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.0.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.0.1
  # Enable time synchronization for consistent Flux reconciliation
  time:
    servers:
      - time.cloudflare.com
cluster:
  # Allow Flux to schedule on control plane if needed
  allowSchedulingOnControlPlanes: true
```

```yaml
# _out/worker-patch.yaml
# Patch file for worker nodes
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.8.0
  network:
    hostname: worker-01
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.0.11/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.0.1
  time:
    servers:
      - time.cloudflare.com
```

Apply the patches to generate final configurations:

```bash
# Generate patched control plane config
talosctl gen config k8s-flux-cluster https://10.0.0.10:6443 \
  --with-secrets secrets.yaml \
  --config-patch @_out/controlplane-patch.yaml \
  --config-patch-control-plane @_out/controlplane-patch.yaml \
  --config-patch-worker @_out/worker-patch.yaml \
  --output-dir _out/patched
```

## Provisioning Talos Linux on Bare Metal

Boot your machines from the Talos Linux ISO (download from the Talos releases page) and apply the configurations:

```bash
# Set up talosctl config
export TALOSCONFIG=_out/talosconfig
talosctl config endpoint 10.0.0.10
talosctl config node 10.0.0.10

# Apply configuration to the control plane node
talosctl apply-config --insecure \
  --nodes 10.0.0.10 \
  --file _out/patched/controlplane.yaml

# Apply configuration to the worker node
talosctl apply-config --insecure \
  --nodes 10.0.0.11 \
  --file _out/patched/worker.yaml
```

## Bootstrapping the Kubernetes Cluster

After the machines reboot with their new configuration, bootstrap Kubernetes:

```bash
# Bootstrap the Kubernetes cluster on the control plane
talosctl bootstrap --nodes 10.0.0.10

# Wait for the cluster to be ready
talosctl health --nodes 10.0.0.10
```

Retrieve the kubeconfig:

```bash
# Get kubeconfig
talosctl kubeconfig --nodes 10.0.0.10 -f ~/.kube/talos-config

# Set the KUBECONFIG variable
export KUBECONFIG=~/.kube/talos-config

# Verify cluster access
kubectl get nodes
```

## Running Flux Pre-flight Checks

Verify that your Talos cluster meets the Flux requirements:

```bash
# Run pre-flight checks
flux check --pre
```

Talos Linux ships with a modern Kubernetes version and all required APIs, so pre-flight checks should pass cleanly.

## Bootstrapping Flux CD

Set up your GitHub credentials and bootstrap Flux:

```bash
# Set GitHub credentials
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>

# Bootstrap Flux CD
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=talos-gitops \
  --branch=main \
  --path=./clusters/bare-metal \
  --personal
```

## Verifying the Installation

Confirm all Flux components are healthy:

```bash
# Check Flux system health
flux check

# List running Flux pods
kubectl get pods -n flux-system

# Check the Git repository source
flux get sources git
```

## Setting Up the Repository Structure

Clone and organize your GitOps repository:

```bash
# Clone the repository
git clone https://github.com/$GITHUB_USER/talos-gitops.git
cd talos-gitops

# Create a structured directory layout
mkdir -p clusters/bare-metal/infrastructure
mkdir -p clusters/bare-metal/apps
mkdir -p infrastructure/sources
mkdir -p infrastructure/controllers
mkdir -p apps/base
mkdir -p apps/production
```

## Installing a CNI with Flux

Talos Linux does not ship with a CNI by default when using custom configurations. Deploy Cilium via Flux:

```yaml
# infrastructure/sources/cilium.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: cilium
  namespace: flux-system
spec:
  interval: 24h
  url: https://helm.cilium.io/
```

```yaml
# infrastructure/controllers/cilium.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: cilium
  namespace: flux-system
spec:
  interval: 15m
  chart:
    spec:
      chart: cilium
      version: "1.16.x"
      sourceRef:
        kind: HelmRepository
        name: cilium
        namespace: flux-system
  targetNamespace: kube-system
  values:
    # Talos-specific Cilium configuration
    ipam:
      mode: kubernetes
    kubeProxyReplacement: true
    securityContext:
      capabilities:
        ciliumAgent:
          - CHOWN
          - KILL
          - NET_ADMIN
          - NET_RAW
          - IPC_LOCK
          - SYS_ADMIN
          - SYS_RESOURCE
          - DAC_OVERRIDE
          - FOWNER
          - SETGID
          - SETUID
    cgroup:
      # Talos mounts cgroup2 at this path
      hostRoot: /sys/fs/cgroup
      autoMount:
        enabled: false
    k8sServiceHost: localhost
    k8sServicePort: 7445
```

```yaml
# clusters/bare-metal/infrastructure/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../infrastructure/sources/cilium.yaml
  - ../../../infrastructure/controllers/cilium.yaml
```

```yaml
# clusters/bare-metal/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/bare-metal/infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
```

## Deploying Applications

Create a sample workload that Flux will manage:

```yaml
# apps/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: demo
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: web-app
          image: nginx:alpine
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
          # Security context suitable for Talos
          securityContext:
            readOnlyRootFilesystem: true
            runAsNonRoot: true
            runAsUser: 101
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: cache
              mountPath: /var/cache/nginx
            - name: run
              mountPath: /var/run
      volumes:
        - name: tmp
          emptyDir: {}
        - name: cache
          emptyDir: {}
        - name: run
          emptyDir: {}
```

```yaml
# apps/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
```

```yaml
# clusters/bare-metal/apps/demo-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: demo-app
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    # Ensure infrastructure (CNI) is ready before deploying apps
    - name: infrastructure
  path: ./apps/base
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: web-app
      namespace: demo
  timeout: 3m
```

## Managing Talos Upgrades via GitOps

You can manage Talos machine configuration updates through a GitOps workflow using the Talos System Extensions:

```yaml
# infrastructure/controllers/talos-ccm.yaml
# Deploy the Talos Cloud Controller Manager
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: talos-ccm
  namespace: flux-system
spec:
  interval: 15m
  chart:
    spec:
      chart: talos-cloud-controller-manager
      version: ">=1.6.0"
      sourceRef:
        kind: HelmRepository
        name: siderolabs
        namespace: flux-system
  targetNamespace: kube-system
  values:
    tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/control-plane
```

## Setting Up Image Automation

Automate container image updates on your bare metal cluster:

```yaml
# clusters/bare-metal/apps/image-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: web-app
  namespace: flux-system
spec:
  image: nginx
  interval: 5m
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: web-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: web-app
  policy:
    # Only allow alpine-based tags
    alphabetical:
      order: asc
  filterTags:
    pattern: "^alpine"
```

## Troubleshooting

Since Talos has no SSH access, all debugging happens through `talosctl` and `kubectl`:

```bash
# View Talos system logs
talosctl logs kubelet --nodes 10.0.0.10

# Check Flux controller logs
kubectl logs -n flux-system deploy/source-controller
kubectl logs -n flux-system deploy/kustomize-controller

# Force reconciliation
flux reconcile kustomization flux-system --with-source

# View Flux events for errors
flux events --for Kustomization/demo-app

# Check Talos services
talosctl services --nodes 10.0.0.10

# View dmesg for hardware issues
talosctl dmesg --nodes 10.0.0.10
```

## Conclusion

You now have Flux CD running on a Talos Linux bare metal cluster. This setup provides an extremely secure, immutable infrastructure managed entirely through GitOps. With no SSH access and no shell on the host OS, the attack surface is minimal. Every change to your cluster, from CNI configuration to application deployments, flows through your Git repository and is automatically reconciled by Flux CD.
