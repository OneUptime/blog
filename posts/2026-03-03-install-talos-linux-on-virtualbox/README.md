# How to Install Talos Linux on VirtualBox

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, VirtualBox, Virtualization, Kubernetes, Development

Description: Get Talos Linux running on Oracle VirtualBox for local development and testing of Kubernetes clusters on any desktop operating system.

---

Oracle VirtualBox is a free, cross-platform virtualization tool that runs on Windows, macOS, and Linux. While it is not the fastest virtualization option available, its accessibility and ease of use make it a popular choice for local development and learning. Running Talos Linux on VirtualBox is a great way to explore the Talos workflow without needing cloud accounts or dedicated hardware. This guide covers the complete setup process.

## Prerequisites

Install VirtualBox and the required CLI tools:

```bash
# Install VirtualBox from https://www.virtualbox.org/wiki/Downloads
# Or on macOS with Homebrew:
brew install --cask virtualbox

# On Ubuntu/Debian:
sudo apt install virtualbox

# Verify VirtualBox is installed
VBoxManage --version

# Install talosctl
curl -sL https://talos.dev/install | sh

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/
```

## Downloading the Talos ISO

Download the Talos ISO image:

```bash
# Download the Talos ISO
curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/talos-amd64.iso

# Store it in a convenient location
mkdir -p ~/talos-vbox
mv talos-amd64.iso ~/talos-vbox/
```

## Creating VMs with VBoxManage

Create virtual machines using the VirtualBox command-line tool:

```bash
# Set base directory
VBOX_DIR="${HOME}/talos-vbox"

# Function to create a Talos VM
create_talos_vm() {
  local NAME=$1
  local MEMORY=$2
  local CPUS=$3
  local DISK_SIZE=$4

  # Create the VM
  VBoxManage createvm --name "${NAME}" --ostype "Linux_64" --register

  # Configure system settings
  VBoxManage modifyvm "${NAME}" \
    --memory ${MEMORY} \
    --cpus ${CPUS} \
    --boot1 dvd \
    --boot2 disk \
    --boot3 none \
    --boot4 none \
    --firmware efi \
    --rtcuseutc on \
    --graphicscontroller vmsvga \
    --vram 16 \
    --audio-driver none

  # Configure networking
  VBoxManage modifyvm "${NAME}" \
    --nic1 hostonly \
    --hostonlyadapter1 "vboxnet0" \
    --nictype1 virtio \
    --nic2 nat \
    --nictype2 virtio

  # Create and attach a disk
  VBoxManage createmedium disk \
    --filename "${VBOX_DIR}/${NAME}/${NAME}.vdi" \
    --size ${DISK_SIZE} \
    --format VDI

  # Add a SATA controller
  VBoxManage storagectl "${NAME}" \
    --name "SATA" \
    --add sata \
    --controller IntelAhci

  # Attach the disk
  VBoxManage storageattach "${NAME}" \
    --storagectl "SATA" \
    --port 0 \
    --device 0 \
    --type hdd \
    --medium "${VBOX_DIR}/${NAME}/${NAME}.vdi"

  # Add an IDE controller for the ISO
  VBoxManage storagectl "${NAME}" \
    --name "IDE" \
    --add ide

  # Attach the Talos ISO
  VBoxManage storageattach "${NAME}" \
    --storagectl "IDE" \
    --port 0 \
    --device 0 \
    --type dvddrive \
    --medium "${VBOX_DIR}/talos-amd64.iso"

  echo "Created VM: ${NAME}"
}

# Create a host-only network if it does not exist
VBoxManage hostonlyif create
VBoxManage hostonlyif ipconfig vboxnet0 --ip 192.168.56.1 --netmask 255.255.255.0

# Enable DHCP on the host-only network
VBoxManage dhcpserver add --ifname vboxnet0 \
  --ip 192.168.56.1 \
  --netmask 255.255.255.0 \
  --lowerip 192.168.56.10 \
  --upperip 192.168.56.254 \
  --enable

# Create control plane VMs (8GB RAM, 4 CPUs, 50GB disk)
create_talos_vm "talos-cp-1" 8192 4 51200
create_talos_vm "talos-cp-2" 8192 4 51200
create_talos_vm "talos-cp-3" 8192 4 51200

# Create worker VMs (8GB RAM, 4 CPUs, 100GB disk)
create_talos_vm "talos-worker-1" 8192 4 102400
create_talos_vm "talos-worker-2" 8192 4 102400
create_talos_vm "talos-worker-3" 8192 4 102400
```

## Starting the VMs

Start all VMs in headless mode:

```bash
# Start all VMs
for vm in talos-cp-1 talos-cp-2 talos-cp-3 talos-worker-1 talos-worker-2 talos-worker-3; do
  VBoxManage startvm "${vm}" --type headless
  echo "Started ${vm}"
done

# Check that all VMs are running
VBoxManage list runningvms
```

## Finding VM IP Addresses

Wait for the VMs to boot and get their IP addresses:

```bash
# Wait for VMs to boot
sleep 60

# Get IP addresses from the VirtualBox DHCP leases
# Or check the VirtualBox GUI console for each VM
# The Talos maintenance mode screen shows the IP address

# You can also use VBoxManage to get guest properties
# (requires guest additions, which Talos does not have)
# Instead, check your DHCP server or ARP table
arp -a | grep "56"

# Or scan the network
nmap -sn 192.168.56.0/24
```

## Generating Talos Configuration

```bash
# Use the first control plane node IP or set up a single node first
talosctl gen config talos-vbox-cluster "https://192.168.56.11:6443" \
  --output-dir _out

# Patch for VirtualBox
cat > vbox-patch.yaml <<'EOF'
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.7.0
  network:
    interfaces:
      - interface: eth0
        dhcp: true
      - interface: eth1
        dhcp: true
EOF

# Apply patches
talosctl machineconfig patch _out/controlplane.yaml \
  --patch @vbox-patch.yaml \
  --output _out/controlplane-patched.yaml

talosctl machineconfig patch _out/worker.yaml \
  --patch @vbox-patch.yaml \
  --output _out/worker-patched.yaml
```

## Applying Configuration and Bootstrapping

Apply the configuration to nodes in maintenance mode:

```bash
# Replace these IPs with the actual IPs from your DHCP assignments
CP1_IP="192.168.56.11"
CP2_IP="192.168.56.12"
CP3_IP="192.168.56.13"
WORKER1_IP="192.168.56.21"
WORKER2_IP="192.168.56.22"
WORKER3_IP="192.168.56.23"

# Apply configuration to control plane nodes
talosctl apply-config --insecure --nodes ${CP1_IP} \
  --file _out/controlplane-patched.yaml
talosctl apply-config --insecure --nodes ${CP2_IP} \
  --file _out/controlplane-patched.yaml
talosctl apply-config --insecure --nodes ${CP3_IP} \
  --file _out/controlplane-patched.yaml

# Apply configuration to worker nodes
talosctl apply-config --insecure --nodes ${WORKER1_IP} \
  --file _out/worker-patched.yaml
talosctl apply-config --insecure --nodes ${WORKER2_IP} \
  --file _out/worker-patched.yaml
talosctl apply-config --insecure --nodes ${WORKER3_IP} \
  --file _out/worker-patched.yaml

# Wait for installation and reboot
sleep 180

# Remove ISO from all VMs after installation
for vm in talos-cp-1 talos-cp-2 talos-cp-3 talos-worker-1 talos-worker-2 talos-worker-3; do
  VBoxManage storageattach "${vm}" \
    --storagectl "IDE" \
    --port 0 \
    --device 0 \
    --type dvddrive \
    --medium emptydrive
done
```

Bootstrap the cluster:

```bash
# Configure talosctl
talosctl config merge _out/talosconfig
talosctl config endpoint ${CP1_IP}
talosctl config node ${CP1_IP}

# Bootstrap
talosctl bootstrap --nodes ${CP1_IP}

# Wait for health
talosctl health --wait-timeout 15m

# Get kubeconfig
talosctl kubeconfig

# Verify the cluster
kubectl get nodes -o wide
kubectl get pods -A
```

## Single-Node Cluster for Quick Testing

If you just want to try Talos quickly, a single-node cluster is the simplest option:

```bash
# Create a single VM with more resources
create_talos_vm "talos-single" 8192 4 51200

# Start it
VBoxManage startvm "talos-single" --type headless

# Generate single-node configuration
talosctl gen config talos-single "https://192.168.56.10:6443" \
  --output-dir _out-single

# Apply configuration (replace IP with actual DHCP-assigned IP)
talosctl apply-config --insecure --nodes 192.168.56.10 \
  --file _out-single/controlplane.yaml

# Bootstrap
talosctl config merge _out-single/talosconfig
talosctl config endpoint 192.168.56.10
talosctl bootstrap --nodes 192.168.56.10

# Get kubeconfig
talosctl kubeconfig
kubectl get nodes
```

## Performance Tips for VirtualBox

VirtualBox is not the fastest hypervisor, but you can improve performance:

1. **Enable hardware virtualization** in your BIOS (VT-x/AMD-V)
2. **Use EFI firmware** (Generation 2 equivalent) for better boot performance
3. **Use virtio network adapters** instead of the default emulated NICs
4. **Allocate sufficient RAM** to avoid swap pressure
5. **Use SSD storage** for the VM disk files
6. **Disable audio** and unnecessary hardware emulation

## Cleaning Up

```bash
# Stop and delete all VMs
for vm in talos-cp-1 talos-cp-2 talos-cp-3 talos-worker-1 talos-worker-2 talos-worker-3; do
  VBoxManage controlvm "${vm}" poweroff 2>/dev/null
  sleep 2
  VBoxManage unregistervm "${vm}" --delete
done

# Remove the host-only network
VBoxManage hostonlyif remove vboxnet0

# Clean up files
rm -rf ~/talos-vbox
```

## Conclusion

VirtualBox is the most accessible platform for running Talos Linux because it works on every major desktop operating system and is completely free. While it is not suitable for production workloads due to performance limitations, it is excellent for learning Talos, testing configurations, and developing against a local Kubernetes cluster. The VBoxManage CLI makes it scriptable, so you can automate the entire setup and teardown process for repeatable testing environments.
