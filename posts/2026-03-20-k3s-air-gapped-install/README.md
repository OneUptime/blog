# How to Install K3s in an Air-Gapped Environment - Install

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Air-Gapped, Kubernetes, Offline Install, Private Registry, SUSE Rancher

Description: Learn how to install K3s in an air-gapped environment without internet access by pre-loading container images, using a private registry, and deploying the K3s binary manually.

---

Air-gapped K3s installations are required in secure government, financial, and industrial environments where nodes have no internet access. This guide walks through the complete offline installation process.

---

## Step 1: Prepare Assets on an Internet-Connected Machine

Download all required files on a machine with internet access:

```bash
K3S_VERSION="v1.34.7+k3s1"

# Download the K3s binary

curl -Lo k3s https://github.com/k3s-io/k3s/releases/download/${K3S_VERSION}/k3s
chmod +x k3s

# Download the air-gapped images tarball
curl -Lo k3s-airgap-images-amd64.tar.gz \
  https://github.com/k3s-io/k3s/releases/download/${K3S_VERSION}/k3s-airgap-images-amd64.tar.gz

# Download the install script
curl -Lo install.sh https://get.k3s.io
chmod +x install.sh
```

---

## Step 2: Transfer Files to Air-Gapped Nodes

```bash
# Copy to each node via USB, SCP through a bastion, or other secure method
scp k3s k3s-airgap-images-amd64.tar.gz install.sh user@node-ip:/tmp/
```

---

## Step 3: Install K3s on the Server Node

```bash
# On the server node - run all commands as root

# Place the binary in PATH
cp /tmp/k3s /usr/local/bin/
chmod +x /usr/local/bin/k3s

# Place the air-gapped images where K3s expects them
mkdir -p /var/lib/rancher/k3s/agent/images/
cp /tmp/k3s-airgap-images-amd64.tar.gz \
   /var/lib/rancher/k3s/agent/images/

# If SELinux is enabled, install the matching k3s-selinux RPM before running install.sh

# Install K3s, but do not start it until registries.yaml is in place
INSTALL_K3S_SKIP_DOWNLOAD=true \
  INSTALL_K3S_SKIP_START=true \
  INSTALL_K3S_EXEC='server --disable-default-registry-endpoint' \
  /tmp/install.sh
```

---

## Step 4: Configure a Private Registry

If you are using a private registry in an air-gapped environment, mirror the images you need into it first, then create the registry configuration file on every node before starting K3s. The install commands in this guide disable fallback to upstream registries for the registries configured below:

```yaml
# /etc/rancher/k3s/registries.yaml
mirrors:
  "docker.io":
    endpoint:
      - "https://registry.internal.example.com"
  "registry.k8s.io":
    endpoint:
      - "https://registry.internal.example.com"
  "ghcr.io":
    endpoint:
      - "https://registry.internal.example.com"

configs:
  "registry.internal.example.com":
    auth:
      username: admin
      password: securepassword
    tls:
      # Path to the internal CA certificate
      ca_file: /etc/ssl/certs/internal-ca.crt
```

Start K3s after creating this file on the server:

```bash
systemctl start k3s

# Verify K3s started
systemctl status k3s
kubectl get nodes
```

Create the same `/etc/rancher/k3s/registries.yaml` file on each agent node before running the agent install script.

---

## Step 5: Install Agent Nodes

Repeat the binary and image placement on each agent node, then join:

```bash
# Get the join token from the server
cat /var/lib/rancher/k3s/server/node-token

# On the agent node
cp /tmp/k3s /usr/local/bin/
chmod +x /usr/local/bin/k3s
mkdir -p /var/lib/rancher/k3s/agent/images/
cp /tmp/k3s-airgap-images-amd64.tar.gz /var/lib/rancher/k3s/agent/images/

INSTALL_K3S_SKIP_DOWNLOAD=true \
  INSTALL_K3S_EXEC='agent --disable-default-registry-endpoint' \
  K3S_URL=https://<SERVER_IP>:6443 \
  K3S_TOKEN=<TOKEN> \
  /tmp/install.sh
```

---

## Best Practices

- Mirror all required Helm chart images to your internal registry using tools like `helm pull` + `crane copy`.
- Keep a local Helm chart repository using **ChartMuseum** or **Harbor**.
- Document the exact K3s version and image list used so you can reproduce the setup for upgrades.
- Test the air-gapped install procedure in a simulated isolated network before deploying to production.
