# How to Upgrade Photon OS in an Air-Gapped Environment with a Local Repository

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, Package Management, Security

Description: Build a verified local Photon repository for air-gapped package updates while preserving metadata, signatures, and rollback evidence.

---

An air-gapped Photon host still needs the same dependency resolution and package-integrity checks as an online host. The practical difference is that you transfer a tested repository snapshot into the isolated environment. Copying a handful of RPMs from another machine's cache is not a reliable way to capture every dependency or security advisory.

This walkthrough covers package updates within an installed Photon release. A Photon 4-to-5 major upgrade also needs the supported `photon-upgrade` workflow and a separately tested offline plan; pointing a Photon 4 system at Photon 5 packages is not that workflow.

## Define the snapshot boundary

On a representative target, record:

```bash
cat /etc/os-release
uname -m
rpm -qa | sort > installed-packages.txt
tdnf repolist
```

Choose the same release and architecture for the mirror. Include all approved repositories that supply installed packages, usually the release/base repository and updates, plus any required extras or internal packages. Photon explains their different roles in its [repository overview](https://vmware.github.io/photon/docs-v5/administration-guide/photon-os-packages/photon-os-package-repositories/).

Assign the snapshot a date or change identifier. Keep it immutable after testing. If package contents change while clients consume the snapshot, a test result no longer identifies the exact software later installed in production.

## Mirror packages and original metadata

Use a connected staging machine with the DNF reposync plugin installed. This is a repository-transfer workstation; it does not need to be the isolated Photon host. Configure dedicated repository IDs using the current Photon URLs and approved signing keys. Use literal Photon release/architecture paths, or explicit overrides, so the staging machine's own distribution variables cannot select the wrong source.

For example, after defining `photon5-base` and `photon5-updates` on that workstation:

```bash
dnf reposync --repoid=photon5-base \
  --download-metadata --download-path=/srv/photon-snapshot
dnf reposync --repoid=photon5-updates \
  --download-metadata --download-path=/srv/photon-snapshot
```

The [DNF reposync documentation](https://dnf-plugins-core.readthedocs.io/en/latest/reposync.html) explains that `--download-metadata` creates a directly usable repository copy. Do not combine this casually with `--newest-only`: preserved metadata can reference older RPMs that were not downloaded.

Preserve the metadata and package directory layout, including security-advisory metadata. Rebuilding only basic metadata with `createrepo_c` can discard information needed by security-only update workflows. Verify RPM signatures against independently trusted Photon keys and generate a checksum manifest for the complete transferred snapshot.

## Transfer and expose the repository

Move the snapshot through your approved removable-media or transfer process. Verify its checksum manifest after transfer and before publication. Protect the snapshot from writes by ordinary clients.

For a single machine, mount verified media or copy the snapshot under a controlled path. For many machines, publish it through an internal HTTPS service with a CA trusted by the targets. The following local-file example assumes the snapshot exists at `/srv/photon-snapshot`:

```ini
[offline-photon-base]
name=Approved Photon base snapshot
baseurl=file:///srv/photon-snapshot/photon5-base
enabled=0
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/VMWARE-RPM-GPG-KEY

[offline-photon-updates]
name=Approved Photon updates snapshot
baseurl=file:///srv/photon-snapshot/photon5-updates
enabled=0
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/VMWARE-RPM-GPG-KEY
```

Verify that the key path matches the installed release and trusted key material. Photon documents the `.repo` structure in [adding a repository](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/adding-a-new-repository/). Add equivalent sections for other required approved sources.

## Test using only the offline sources

On a disposable clone of the target, explicitly exclude every other repository:

```bash
tdnf --disablerepo='*' \
  --enablerepo=offline-photon-base \
  --enablerepo=offline-photon-updates makecache

tdnf --disablerepo='*' \
  --enablerepo=offline-photon-base \
  --enablerepo=offline-photon-updates update
```

Review the transaction interactively. A missing dependency means the snapshot or repository selection is incomplete; do not bypass dependency checks or signatures to continue. Repeat the test with external network access unavailable so success cannot depend on an unnoticed online source.

Reboot when required and exercise representative application traffic. Compare package inventories and record the snapshot ID with the acceptance result. Test restoring the previous VM or application backup before scheduling production installation.

## Operate the update pipeline

Retain the prior accepted snapshot and a recoverable application backup. Replacing repository files does not roll back installed RPMs or reverse an application data migration.

For each cycle, repeat mirroring, integrity verification, transfer, canary installation, and operational checks. Track advisory coverage separately from simple package availability. An isolated network reduces exposure paths, but it does not remove the need to identify vulnerable installed software and confirm fixes have actually taken effect.
