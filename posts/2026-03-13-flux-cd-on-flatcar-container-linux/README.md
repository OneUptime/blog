# How to Set Up Flux CD on Flatcar Container Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Flatcar Container Linux, Immutable Infrastructure, Edge

Description: Bootstrap Flux CD on Flatcar Container Linux for immutable infrastructure Kubernetes clusters, combining an auto-updating OS with GitOps-managed workloads.

---

## Introduction

Flatcar Container Linux is the community continuation of CoreOS Container Linux - an immutable, auto-updating operating system designed specifically for running containers. It boots from a read-only partition, receives atomic OS updates via the Omaha update protocol, and provides a minimal, purpose-built environment for container runtimes. Its combination of immutability and automatic updates makes it an excellent foundation for long-lived Kubernetes nodes.

Deploying Flux CD on Flatcar creates a fully GitOps-managed immutable infrastructure stack. The OS manages its own updates independently, while Flux manages Kubernetes workloads. Together, both layers are declarative: Flatcar's `Ignition` configuration handles OS provisioning, and Flux handles everything that runs on top of Kubernetes.

This guide covers provisioning Flatcar nodes with kubeadm using Ignition configuration, bootstrapping the cluster, and deploying Flux CD.

## Prerequisites

- Flatcar Container Linux nodes (bare metal, VMs, or cloud instances)
- Ignition configuration file for node provisioning
- `kubectl` and `flux` CLI on your workstation
- A Git repository for Flux CD bootstrap

## Step 1: Create the Ignition Configuration for Flatcar Nodes

Flatcar uses Ignition for first-boot configuration. Butane (the human-readable format) compiles to Ignition JSON:

```yaml
# flatcar-config.bu (Butane format - compile with: butane < flatcar-config.bu > ignition.json)
variant: flatcar
version: 1.0.0

passwd:
  users:
    - name: core
      ssh_authorized_keys:
        - "ssh-ed25519 AAAA...your-public-key"
      groups:
        - wheel
        - sudo

storage:
  files:
    # Install kubeadm prerequisites
    - path: /etc/modules-load.d/k8s.conf
      contents:
        inline: |
          overlay
          br_netfilter
    - path: /etc/sysctl.d/k8s.conf
      contents:
        inline: |
          net.bridge.bridge-nf-call-iptables=1
          net.bridge.bridge-nf-call-ip6tables=1
          net.ipv4.ip_forward=1

    # kubeadm configuration for the control plane
    - path: /etc/kubernetes/kubeadm-config.yaml
      contents:
        inline: |
          apiVersion: kubeadm.k8s.io/v1beta3
          kind: ClusterConfiguration
          kubernetesVersion: "1.29.0"
          controlPlaneEndpoint: "192.168.1.100:6443"
          networking:
            podSubnet: "10.244.0.0/16"
            serviceSubnet: "10.96.0.0/12"

systemd:
  units:
    # Configure containerd as the container runtime
    - name: containerd.service
      enabled: true
    # Disable automatic updates during initial cluster setup
    - name: update-engine.service
      mask: false
    - name: locksmithd.service
      mask: false
```

## Step 2: Compile Ignition Configuration

```bash
# Install butane
curl -L https://github.com/coreos/butane/releases/latest/download/butane-x86_64-unknown-linux-gnu \
  -o /usr/local/bin/butane
chmod +x /usr/local/bin/butane

# Compile Butane to Ignition JSON
butane --strict < flatcar-config.bu > ignition.json

# Validate the Ignition config
cat ignition.json | python3 -m json.tool > /dev/null && echo "Valid JSON"
```

## Step 3: Boot Flatcar Nodes with Ignition

Pass the Ignition config to your nodes via the hypervisor or cloud provider:

```bash
# For libvirt/QEMU:
virt-install --name flatcar-control1 \
  --os-variant=linux2022 \
  --ram=4096 --vcpus=2 \
  --disk path=/var/lib/libvirt/images/flatcar-control1.qcow2,size=50 \
  --cdrom flatcar_production_qemu_image.img \
  --qemu-commandline="-fw_cfg name=opt/org.flatcar-linux/config,file=$(pwd)/ignition.json"

# For cloud providers (AWS):
aws ec2 run-instances \
  --image-id ami-flatcar-linux-stable \
  --instance-type t3.medium \
  --user-data file://ignition.json
```

## Step 4: Initialize Kubernetes with kubeadm on Flatcar

```bash
# SSH into the first control plane node
ssh core@192.168.1.101

# Install kubeadm, kubelet, kubectl via the OEM partition scripts
# Flatcar ships with containerd; install kubelet via systemd-sysext or OEM channel

# Initialize the cluster
sudo kubeadm init \
  --config /etc/kubernetes/kubeadm-config.yaml \
  --upload-certs

# On worker nodes
sudo kubeadm join 192.168.1.100:6443 \
  --token TOKEN \
  --discovery-token-ca-cert-hash sha256:HASH
```

## Step 5: Configure kubectl and Install CNI

```bash
# Configure kubectl on the control plane node
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Install Flannel CNI (Flatcar compatible)
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

# Copy kubeconfig to your workstation
scp core@192.168.1.101:~/.kube/config ~/.kube/flatcar-config
export KUBECONFIG=~/.kube/flatcar-config

kubectl get nodes
```

## Step 6: Bootstrap Flux CD

```bash
export GITHUB_TOKEN=ghp_your_github_token

flux bootstrap github \
  --owner=my-org \
  --repository=flatcar-fleet \
  --branch=main \
  --path=clusters/flatcar-prod \
  --personal

# Verify Flux is running
kubectl get pods -n flux-system -w
```

## Step 7: Configure Flatcar Updates via Flux

Manage the Flatcar update locksmith strategy through a DaemonSet deployed by Flux:

```yaml
# clusters/flatcar-prod/system/update-operator.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: flatcar-update-agent
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: flatcar-update-agent
  template:
    metadata:
      labels:
        app: flatcar-update-agent
    spec:
      hostPID: true
      hostNetwork: true
      tolerations:
        - operator: Exists
      containers:
        - name: update-agent
          image: ghcr.io/flatcar/flatcar-linux-update-operator:latest
          securityContext:
            privileged: true
```

## Best Practices

- Use Ignition for all first-boot node configuration; avoid post-boot mutation of Flatcar nodes to preserve immutability guarantees.
- Enable Flatcar's automatic updates and use the Flatcar Linux Update Operator (managed by Flux) to coordinate rolling node reboots without Kubernetes workload disruption.
- Use Flatcar's OEM partition for cluster-specific configuration that survives OS updates.
- Avoid installing packages via `emerge` on Flatcar nodes; instead, run any additional tooling as containers or use systemd-sysext extensions.
- Store Ignition configurations in Git alongside Flux manifests to maintain a fully reproducible cluster definition.

## Conclusion

Flatcar Container Linux paired with Flux CD creates an infrastructure stack where both the OS and application layers are declarative, version-controlled, and automatically maintained. Flatcar's atomic updates keep nodes secure without manual patching, while Flux ensures workloads remain in sync with Git. This combination is particularly powerful for long-lived clusters where operational consistency and security patching discipline are critical.
