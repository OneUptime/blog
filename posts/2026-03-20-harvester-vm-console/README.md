# How to Access VM Console in Harvester

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, VM Console, Virtual Machine, KubeVirt, Kubernetes, SUSE Rancher, HCI

Description: Learn how to access the console of a virtual machine running in Harvester using the web-based VNC console, kubectl virt plugin, and serial console for headless VMs.

---

Harvester provides multiple ways to access virtual machine consoles, whether for GUI-based VMs (using VNC) or headless server VMs (using serial console). Console access is essential for troubleshooting VMs that have lost network connectivity.

---

## Method 1: Web Console via Harvester UI

The simplest way to access a VM console is through the Harvester web interface:

1. Navigate to **Virtual Machines** in the Harvester dashboard
2. Click on the VM you want to access
3. Click the **Console** button (or the terminal icon)
4. A console opens in your browser. If the VM has a graphics device attached, Harvester uses VNC; headless images use the serial console.
5. Click inside the console window to capture keyboard input

This method works for both Linux and Windows VMs when graphics are enabled. Headless cloud images are typically accessed with the serial console in the UI.

---

## Method 2: virtctl Console

For command-line access, use the `virtctl` tool. If you installed the krew plugin instead, replace `virtctl` with `kubectl virt` in the commands below:

```bash
# Install virtctl

VERSION=$(kubectl get kubevirt.kubevirt.io/kubevirt -n harvester-system -o jsonpath='{.status.observedKubeVirtVersion}')
ARCH=$(uname -s | tr A-Z a-z)-$(uname -m | sed 's/x86_64/amd64/')
curl -L -o virtctl https://github.com/kubevirt/kubevirt/releases/download/${VERSION}/virtctl-${VERSION}-${ARCH}
chmod +x virtctl
sudo install virtctl /usr/local/bin/

# Connect to the graphical console (requires remote-viewer)
virtctl vnc <vm-name> -n <namespace>

# Or open only the VNC proxy and connect with your own VNC client
virtctl vnc --proxy-only <vm-name> -n <namespace>

# Connect to the serial console (text-only, no VNC needed)
virtctl console <vm-name> -n <namespace>
```

---

## Method 3: Enable Serial Console on Linux VMs

For headless VMs, ensure the guest OS exposes a login on the serial console so it's accessible via `virtctl console`:

```bash
# Inside the VM, add the serial console to the kernel command line

# RHEL/CentOS/Rocky/AlmaLinux
grubby --update-kernel=ALL --args="console=ttyS0,115200n8"
grub2-editenv - unset kernelopts

# Ubuntu/Debian
sed -i 's/^GRUB_CMDLINE_LINUX="/GRUB_CMDLINE_LINUX="console=ttyS0,115200n8 /' /etc/default/grub
update-grub

# Enable and start the getty service
systemctl enable --now serial-getty@ttyS0.service

# Reboot the VM
reboot
```

After the VM reboots, connect via:

```bash
virtctl console <vm-name> -n <namespace>
```

---

## Method 4: Access VM Console via SSH Tunnel

If the Harvester API server is not directly accessible:

```bash
# Create an SSH tunnel to a Harvester management node's local Kubernetes API
ssh -N -L 6443:127.0.0.1:6443 user@harvester-management-node

# In another terminal, use the management node's kubeconfig, which points to https://127.0.0.1:6443
ssh user@harvester-management-node 'sudo cat /etc/rancher/rke2/rke2.yaml' > /tmp/harvester-kubeconfig-tunnel
export KUBECONFIG=/tmp/harvester-kubeconfig-tunnel

# Open a local VNC proxy and connect with your VNC client
virtctl vnc --proxy-only <vm-name> -n <namespace>
```

---

## Step 5: Configure VM for Console from the VirtualMachine Spec

```yaml
# In the VM manifest, set the console-related fields under spec.template.spec.domain.devices
spec:
  template:
    spec:
      domain:
        devices:
          # Enable serial console
          autoattachSerialConsole: true
          # Enable VNC console
          autoattachGraphicsDevice: true
```

---

## Troubleshooting Console Access

```bash
# Check if the VM is running
kubectl get vmi <vm-name> -n <namespace>
# VMI status should be: Running

# Check KubeVirt API pods used for console/VNC access
kubectl get pods -n harvester-system -l kubevirt.io=virt-api

# Check KubeVirt virt-handler on the node running the VM
NODE=$(kubectl get vmi <vm-name> -n <namespace> -o jsonpath='{.status.nodeName}')
kubectl get pods -n harvester-system \
  -l kubevirt.io=virt-handler \
  --field-selector spec.nodeName=$NODE

# View virt-handler logs for console errors
kubectl logs -n harvester-system \
  $(kubectl get pod -n harvester-system \
    -l kubevirt.io=virt-handler \
    --field-selector spec.nodeName=$NODE -o name)
```

---

## Best Practices

- Always enable the serial console on Linux server VMs at provisioning time - if the VM loses network access, it gives you a reliable text console even on headless images.
- Use `virtctl console` for automation scripts that need to interact with a VM - it's scriptable unlike the web VNC console.
- For Windows VMs, the VNC web console is usually the practical option - ensure the VM has a graphics device configured.
