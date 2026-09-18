# How to Upgrade Photon OS 4 to 5 Without Breaking Docker Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, Docker, VMware

Description: Use the supported Photon OS 4-to-5 upgrade process with Docker inventory, tested backups, deliberate downtime, and post-upgrade acceptance.

---

Photon supports upgrading a Photon OS 4 system to Photon OS 5 with the `photon-upgrade` package. Protecting Docker workloads requires a maintenance plan around that supported process. It does not mean containers remain running through an operating-system reboot, and a successful package upgrade does not prove that application data and networking still work.

This guide applies to a standalone Photon host. Use product-specific maintenance instructions for vendor appliances that embed Photon.

## Inventory everything the application needs

Before the window, record the operating system, kernel, package versions, and Docker state:

```bash
cat /etc/os-release
uname -r
rpm -q docker containerd runc
docker version
docker info
docker ps -a
docker network ls
docker volume ls
```

Save Compose files, environment-file references, deployment scripts, image digests, custom networks, published ports, and restart policies. Treat inspection output as sensitive: it can expose environment variables and mount paths. Store it with the same controls as other operational configuration.

Identify every bind mount and named volume. A container image is not a backup of database files stored in those mounts. Docker's [volume documentation](https://docs.docker.com/engine/storage/volumes/) explains that volume data exists separately from the container lifecycle.

Record the Docker data root, storage driver, filesystem type, proxy settings, registry certificates, daemon configuration, and systemd drop-ins. These details help distinguish a post-upgrade configuration mismatch from actual data loss.

## Prove recovery on a clone

Take an application-consistent backup using the database or application's supported procedure. Back up the VM configuration and all relevant data disks. Test recovery in an isolated network so a clone cannot compete with the live host for addresses, scheduled jobs, or database leadership.

Run the full operating-system upgrade on that clone first. Measure shutdown, upgrade, reboot, and application recovery time. Verify that installed agents and locally compiled kernel modules are compatible with the target kernel and userspace.

If downtime cannot fit the allowed window, build a separate Photon 5 host and migrate traffic with application-level replication or a tested data transfer. An in-place upgrade cannot provide a zero-downtime guarantee for a single host.

## Prepare the real maintenance window

Verify free space on root, boot, and the Docker data filesystem. Fix repository and certificate failures in advance; the project's [repository migration notice](https://github.com/vmware/photon/wiki/changes-to-repository-location-in-photon) is relevant to older Photon 4 images.

Stop new traffic and scheduled writers, drain queues where required, and stop applications gracefully using their deployment mechanism. For a Compose deployment, `docker compose stop` preserves containers and volumes while stopping services. Do not use a volume-removal option as part of host preparation.

The [official 4-to-5 upgrade instructions](https://vmware.github.io/photon/docs-v5/installation-guide/upgrading-to-photon-os-5/) require backing up settings and data, stopping services such as Docker, installing the upgrade package, and invoking the upgrade script.

After application shutdown, stop Docker and any active socket unit that could reactivate it. Then install and inspect the upgrade tool:

```bash
systemctl stop docker
# Stop docker.socket too if it exists on this installation.
tdnf install photon-upgrade
photon-upgrade.sh --help
```

Maintain console access throughout the upgrade. Do not depend on the same SSH session that the operating-system restart will terminate.

## Run the supported upgrade

Invoke the documented major-upgrade operation:

```bash
photon-upgrade.sh --upgrade-os
```

Read the prompts and reboot when directed. Do not substitute a manual repository-version edit for this script. Retaining customizations means they are carried forward; it does not guarantee every old customization remains appropriate for the new release.

Docker's [live-restore feature](https://docs.docker.com/engine/daemon/live-restore/) is not a solution for this window. It addresses limited daemon interruptions and cannot keep a container running while the host kernel reboots.

## Accept the upgraded host before returning traffic

After reboot, verify Photon 5 and the intended kernel, then inspect failed services and Docker logs:

```bash
cat /etc/os-release
uname -r
systemctl --failed
journalctl -b -u docker --no-pager
docker info
docker ps -a
```

Compare the data root, storage driver, mounts, network subnets, and image references with the baseline. If expected containers disappear, check whether Docker started with a different data directory before recreating anything.

Start the deployment and test it externally through the real load balancer or client route. Exercise reads, writes, persistence across an application restart, DNS, registry pulls, and outbound dependencies. Watch error rates and disk growth before restoring normal traffic.

If acceptance fails, use the tested recovery plan. Coordinate rollback with any writes made after cutover so restoring a VM does not silently discard new application data. Keep the maintenance record tied to observed service behavior, not merely the upgrade script's exit status.
