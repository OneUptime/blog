# How to Deploy Photon OS 5 on ESXi from an OVA

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, VMware, Linux

Description: Deploy a Photon OS 5 OVA on ESXi, verify networking and repositories, and prepare the VM for container workloads.

---

Deploying an OVA gives you a prebuilt Photon OS installation, but a successful import does not establish that the guest has working DNS, current packages, or enough space for its workloads. Treat deployment and guest acceptance as separate steps. This walkthrough targets a standalone Photon OS 5 VM that you administer, using either vCenter or the ESXi Host Client.

## Select the image and destination

Use the project's [download page](https://github.com/vmware/photon/wiki/Downloading-Photon-OS) to locate a Photon OS 5 OVA and its published checksum. Match its processor architecture and virtual hardware requirements to the destination host. Image names and download locations change, so avoid reusing a URL copied from an older Photon tutorial.

On a Linux workstation, calculate the download's SHA-512 digest with `sha512sum`; on macOS, use `shasum -a 512`. Compare it with the checksum for that exact filename. Record the filename, checksum, and intended datastore in the deployment ticket so another operator can reproduce the VM.

Choose a port group with the correct VLAN and access to the services the guest needs: DHCP or a reserved static address, DNS, time synchronization, and package repositories. Allocate CPU, memory, and storage for the application, container images, logs, and update headroom. The OVA's starting disk size is not a production capacity recommendation.

## Import and inspect the VM

In vCenter, select **Deploy OVF Template** on the destination inventory object. In the ESXi Host Client, create or register a VM and choose the OVF/OVA deployment option. Supply the OVA, select compute and storage, map its network to the intended port group, and review the final settings. The [Photon OVA installation guide](https://vmware.github.io/photon/docs-v5/installation-guide/run-photon-on-vsphere/importing-photon-os-from-ova-on-vsphere/) documents this deployment flow.

Disable automatic power-on in the deployment wizard if offered. Before power-on, inspect the NIC connection setting, disk provisioning, firmware, and resource allocation. Keep the image's intended firmware configuration unless you have verified a reason to change it. A boot failure after changing firmware is a different problem from a corrupt download.

Open the console for first boot. Use the initial access method documented for the particular image, change any supplied initial password immediately, and record the administrator access method in your secret-management system. Avoid exposing an unconfigured VM directly to an untrusted network.

## Establish the guest baseline

Run these commands from the guest console as root:

```bash
cat /etc/os-release
uname -r
ip -br link
ip -br address
ip route
systemctl --failed
```

Confirm that the guest identifies itself as Photon OS 5. Match the NIC's MAC address with the adapter shown in vSphere. If no address is assigned, first verify the port group, VLAN, NIC connection, and DHCP scope. Changing guest package configuration cannot repair a disconnected virtual adapter.

Inspect the actual interface, substituting its name:

```bash
networkctl status eth0
resolvectl status
getent hosts packages-prod.broadcom.com
```

A successful `getent` lookup confirms host-name resolution through the configured name-service sources, which may include `/etc/hosts`; it does not by itself prove DNS or outbound HTTPS works. Check the clock as well: a badly incorrect date can make otherwise valid certificates fail validation.

## Refresh packages and test the workload path

Inspect repositories before updating:

```bash
tdnf repolist
cat /etc/yum.repos.d/photon.repo
tdnf check-update
```

Older images may reference the retired VMware repository hostname. Follow the project's [repository migration notice](https://github.com/vmware/photon/wiki/changes-to-repository-location-in-photon), including updating `photon-repos`, rather than disabling certificate checks. Once repository access works, review and apply the approved package updates with `tdnf update`, then reboot if the update plan requires it.

If this VM will host Docker, check the installed package with `rpm -q docker`. If Docker is absent, install it with `tdnf install docker` from the matching Photon repositories before enabling and testing the service:

```bash
systemctl enable --now docker
docker version
docker info
```

Pull and run an approved test image, then test an application endpoint from another machine on the intended client network. Testing only from inside the VM misses port-group and upstream firewall problems.

## Accept the deployment

Reboot once before declaring the VM ready. Verify the address, default route, DNS lookup, time, and required service again. Confirm that monitoring detects the VM and that the backup process includes application data, not just the boot disk.

For a reusable template, finish image maintenance before clearing clone-specific identity and shutting it down. A deployed VM is ready when its operational checks survive a reboot and an administrator can recover it through the console; an OVA task marked complete only proves the import finished.
