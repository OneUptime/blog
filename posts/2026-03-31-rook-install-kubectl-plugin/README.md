# How to Install the kubectl Plugin for Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, kubectl, Plugin, Administration

Description: Install and use the kubectl-rook-ceph plugin to simplify Ceph cluster management and diagnostics directly from kubectl without entering toolbox pods.

---

## Overview

The `kubectl-rook-ceph` plugin extends kubectl with Rook-specific subcommands. Instead of exec-ing into a toolbox pod for every Ceph operation, you can run `kubectl rook-ceph` commands directly from your workstation. This improves operator efficiency and makes scripting easier.

## Installing via Krew

The recommended installation method uses the [Krew](https://krew.sigs.k8s.io/) kubectl plugin manager:

```bash
# Install Krew if not already installed
(
  set -x; cd "$(mktemp -d)" &&
  OS="$(uname | tr '[:upper:]' '[:lower:]')" &&
  ARCH="$(uname -m | sed -e 's/x86_64/amd64/' -e 's/arm.*$/arm/' -e 's/aarch64$/arm64/')" &&
  KREW="krew-${OS}_${ARCH}" &&
  curl -fsSLO "https://github.com/kubernetes-sigs/krew/releases/latest/download/${KREW}.tar.gz" &&
  tar zxvf "${KREW}.tar.gz" &&
  ./"${KREW}" install krew
)

# Add Krew to PATH
export PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"

# Install rook-ceph plugin
kubectl krew install rook-ceph
```

## Manual Installation

Download the binary directly for environments without Krew:

```bash
PLUGIN_VERSION=v0.9.6
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m | sed 's/x86_64/amd64/')

curl -LO "https://github.com/rook/kubectl-rook-ceph/releases/download/${PLUGIN_VERSION}/kubectl-rook-ceph_${PLUGIN_VERSION}_${OS}_${ARCH}.tar.gz"
tar xzf "kubectl-rook-ceph_${PLUGIN_VERSION}_${OS}_${ARCH}.tar.gz"
chmod +x kubectl-rook-ceph
sudo mv kubectl-rook-ceph /usr/local/bin/
```

## Verifying the Installation

```bash
kubectl rook-ceph rook version
```

## Common Plugin Commands

Check cluster status without entering a toolbox pod:

```bash
kubectl rook-ceph ceph status
```

List all OSDs:

```bash
kubectl rook-ceph ceph osd tree
```

Show pool usage:

```bash
kubectl rook-ceph ceph df
```

List RBD images in a pool:

```bash
kubectl rook-ceph rbd ls replicapool
```

## Debugging with the Plugin

The plugin provides dedicated debug commands:

```bash
# Run operator commands
kubectl rook-ceph operator restart

# Check OSD status
kubectl rook-ceph ceph osd status
```

## Specifying Namespace

If Rook is not in the default `rook-ceph` namespace:

```bash
kubectl rook-ceph -n my-rook-namespace ceph status
```

## Updating the Plugin

```bash
kubectl krew upgrade rook-ceph
```

## Summary

The `kubectl-rook-ceph` plugin streamlines Ceph administration by surfacing Ceph commands directly through kubectl. Install it via Krew for easy management, and use it for routine status checks, OSD inspection, and diagnostic collection - reducing the need to maintain a persistent toolbox pod.
