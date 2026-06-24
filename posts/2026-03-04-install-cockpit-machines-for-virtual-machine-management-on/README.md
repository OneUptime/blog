# How to Install Cockpit-Machines for Virtual Machine Management on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Cockpit, Linux

Description: Step-by-step guide on install cockpit-machines for virtual machine management using Red Hat Enterprise Linux 9.

---

This guide provides step-by-step instructions for completing this task on RHEL. Following these procedures ensures a reliable and secure setup.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Hardware virtualization support enabled in the system firmware

## Step 1: Install Required Packages

```bash
# Update the system first
sudo dnf update -y

# Install the RHEL web console, virtualization packages, and VM management add-on
sudo dnf install -y cockpit cockpit-machines qemu-kvm libvirt virt-install virt-viewer
```

The `cockpit-machines` package adds the Virtual Machines page to the RHEL web console. The `qemu-kvm`, `libvirt`, `virt-install`, and `virt-viewer` packages provide the KVM virtualization stack used to create and manage VMs.

## Step 2: Configure the Services

Enable and start the Cockpit web console socket:

```bash
# Enable and start Cockpit
sudo systemctl enable --now cockpit.socket
```

If you use `firewalld` and need to access the web console from another machine, open the Cockpit service:

```bash
sudo firewall-cmd --add-service=cockpit --permanent
sudo firewall-cmd --reload
```

Start the libvirt virtualization sockets used by RHEL 9:

```bash
for drv in qemu network nodedev nwfilter secret storage interface; do
  sudo systemctl start virt${drv}d{,-ro,-admin}.socket
done
```

## Step 3: Enable and Start the Service

```bash
# Check that the web console socket is running
sudo systemctl status cockpit.socket

# Check that the QEMU libvirt socket is running
sudo systemctl status virtqemud.socket
```


## Verification

Confirm everything is working by checking the service status, validating the virtualization host, and opening the web console:

```bash
# Check the web console service status
sudo systemctl status cockpit.socket

# Verify that the host is ready for virtualization
sudo virt-host-validate

# Review recent Cockpit logs
journalctl -u cockpit.socket --no-pager -n 20
```

Open `https://localhost:9090` in a browser, log in with a local system account, and confirm that **Virtual Machines** appears in the side menu.

## Troubleshooting

- If the web console fails to start, check the logs with `journalctl -u cockpit.socket -e --no-pager`.
- If virtual machines do not appear, ensure the required package is installed: `rpm -q cockpit-machines`.
- If VM creation fails, run `sudo virt-host-validate` and follow any `FAIL` or `WARN` messages.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
