# How to Build a Minimal Photon OS 5 Docker Host from the ISO

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, Docker, VMware

Description: Install a minimal Photon OS 5 system from ISO and verify storage, networking, Docker startup, and container access.

---

A minimal Photon OS host should contain the packages needed to operate containers and diagnose failures without accumulating an unrelated development environment. Installing from ISO also lets you make deliberate disk and network choices before Docker starts writing data. This procedure assumes a new standalone VM with no existing data on its target disk.

## Prepare the virtual machine

Download the appropriate Photon OS 5 ISO from the [official download catalog](https://github.com/vmware/photon/wiki/Downloading-Photon-OS) and verify the published checksum. Match the architecture to the host. Upload the ISO to a datastore that the destination ESXi host can access, attach it to the VM's virtual CD/DVD drive, and enable connection at power-on.

Choose a supported guest type and compatible firmware in your vSphere release. Allocate resources for the workload, not merely for installing the operating system. Container image extraction, writable layers, and logs can consume far more disk space than Photon itself.

Use a dedicated application port group with the intended VLAN. Keep console access available while setting up the first administrator account and networking. For a first deployment, a simple single-NIC design makes routing failures easier to distinguish from installation problems.

## Install the minimal profile

Boot the ISO and follow the [Photon ISO installer guide](https://vmware.github.io/photon/docs-v5/installation-guide/run-photon-on-vsphere/installing-photon-os-from-iso-image-on-vsphere/). Select the intended disk, inspect the partition plan, and select the minimal installation option offered by the image. Disk initialization erases the selected installation target; identify it by size and device mapping before continuing.

When the installer offers a VMware-optimized kernel, select the option appropriate for a VMware guest. Follow the image's prompts for hostname, networking, and credentials. Installer screens can vary between revisions, so preserve the chosen settings in your build record rather than assuming every Photon 5 ISO has identical defaults.

After installation, disconnect the ISO or change the boot order so the VM boots its installed disk. Log in through the console and establish a baseline:

```bash
cat /etc/os-release
uname -r
lsblk -f
df -h /
ip -br address
ip route
systemctl --failed
```

Check that the filesystem you intend to hold container data has sufficient free space. A large VMDK does not imply that the guest partition and filesystem already use its full capacity.

## Repair package access before adding Docker

Run `tdnf repolist` and inspect the enabled `.repo` files. If the ISO predates the repository hostname migration, use the [official migration instructions](https://github.com/vmware/photon/wiki/changes-to-repository-location-in-photon) to bring `photon-repos` current. Do not solve a TLS failure by turning off verification.

Then review available updates and install the required packages:

```bash
tdnf check-update
tdnf update
tdnf install docker
systemctl enable --now docker
```

Run these as root or through an administrative account with appropriate privileges. Review the transaction before accepting it. Reboot when required by the updated components and confirm that the guest returns with working networking.

Inspect the result:

```bash
rpm -q docker
systemctl status docker --no-pager
docker version
docker info
```

`docker version` should show both the client and server. A client-only result usually means the daemon is unavailable or the user cannot access its socket. Granting access to the Docker socket is a privileged administrative decision, because it permits control over the host through containers.

## Run a bounded smoke test

Use an approved image from your registry. For a simple public example, Docker's official Nginx image can check image pulling and port publication:

```bash
docker run -d --name photon-web-test \
  -p 8080:80 nginx:stable
docker logs photon-web-test
docker port photon-web-test
```

The `stable` tag is convenient for this short test; production deployments should use your approved immutable image reference. Test `http://VM_ADDRESS:8080` from a client on the required network, then remove the test container with `docker rm -f photon-web-test`.

Docker documents that published ports interact with its host firewall rules; review the [packet-filtering behavior](https://docs.docker.com/engine/network/packet-filtering-firewalls/) before exposing production services. Restrict access at the appropriate host and network boundaries, and verify from an unauthorized network as well as an authorized one.

## Make the build maintainable

Record the ISO checksum, installed package versions, storage layout, network settings, and acceptance results. Arrange log rotation and disk-space monitoring before applications begin producing sustained traffic. Keep application backups separate from the ability to recreate the host.

Finally reboot and repeat the external endpoint test with your real deployment. This catches missing service enablement, transient network configuration, and storage mounts that worked only during installation.
