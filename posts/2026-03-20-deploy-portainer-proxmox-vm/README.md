# How to Deploy Portainer on a Proxmox VM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Proxmox, VM, Docker, Self-Hosted, Virtualization

Description: Learn how to create a virtual machine in Proxmox VE and deploy Portainer CE for Docker container management in a home lab.

---

Running Portainer in a Proxmox VM provides full OS isolation and is simpler to configure than LXC for Docker. You can provision the VM with Terraform/OpenTofu or the Proxmox CLI; this guide shows the Proxmox CLI workflow.

---

## Create a VM with Proxmox `qm` CLI

```bash
# Download Ubuntu 22.04 cloud image

wget https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img

# Import and create VM
qm create 200   --name portainer-vm   --memory 2048   --cores 2   --net0 virtio,bridge=vmbr0   --ide2 local-lvm:cloudinit

qm importdisk 200 jammy-server-cloudimg-amd64.img local-lvm
qm set 200 --scsihw virtio-scsi-pci --scsi0 local-lvm:vm-200-disk-0
qm set 200 --boot order=scsi0
qm set 200 --serial0 socket --vga serial0
qm resize 200 scsi0 +18G

# Cloud-init configuration
qm set 200   --ipconfig0 ip=dhcp   --sshkeys ~/.ssh/id_rsa.pub   --ciuser ubuntu

qm start 200
```

---

## Install Docker and Portainer via SSH

```bash
# SSH into the VM using the IP assigned by DHCP
ssh ubuntu@<vm-ip>

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu

# Deploy Portainer
sudo docker volume create portainer_data
sudo docker run -d   --name portainer   --restart=always   -p 9443:9443   -v /var/run/docker.sock:/var/run/docker.sock   -v portainer_data:/data   portainer/portainer-ce:lts
```

---

## Create a VM Template for Reuse

```bash
# After installing Docker and Portainer, prepare the VM for cloning
sudo cloud-init clean --machine-id
sudo poweroff

# After the VM shuts down, convert it to a template
qm template 200

# Clone from template
qm clone 200 201 --name portainer-prod --full
qm start 201
```

---

## Autostart on Proxmox Boot

```bash
qm set 201 --onboot 1
```

---

## Summary

Create a Proxmox VM from a cloud image using `qm create` with cloud-init for SSH key injection. Resize the disk, configure networking, and start the VM. SSH in to install Docker and deploy Portainer over HTTPS on port `9443`. Enable `--onboot 1` for automatic startup on the running VM. If you want to reuse the build, clean cloud-init state, power off the VM, and convert it to a template for quick provisioning of additional Portainer VMs.
