# Validation Summary: How to Mount RBD on Windows Clients

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RADOS Block Device (RBD)
- Ceph Windows client (rbd-wnbd / WNBD driver)
- Rook-Ceph (Kubernetes operator)
- PowerShell (disk management and scheduled tasks)
- Kubernetes StorageClass with CSI RBD driver
- Windows Server disk management (GPT, NTFS)

## Sources Consulted
- Ceph official documentation: RBD on Windows (https://docs.ceph.com/en/reef/rbd/rbd-windows/)
- Ceph official documentation: Installing Ceph on Windows (https://docs.ceph.com/en/reef/install/windows-install/)
- Ceph official documentation: Windows Basic Configuration (https://docs.ceph.com/en/reef/install/windows-basic-config/)
- Ceph source: doc/rbd/rbd-windows.rst (https://github.com/ceph/ceph/blob/main/doc/rbd/rbd-windows.rst)
- WNBD driver repository (https://github.com/cloudbase/wnbd)
- Ceph Windows installer (https://github.com/cloudbase/ceph-windows-installer)
- Microsoft PowerShell documentation for disk management cmdlets (Get-Disk, Initialize-Disk, New-Partition, Format-Volume)
- Kubernetes StorageClass documentation (https://kubernetes.io/docs/concepts/storage/storage-classes/)

## Issues Found

### 1. Incorrect RBD mapping command: `rbd-nbd` used instead of `rbd device map`
- **What was wrong:** The post used `rbd-nbd map` to map an RBD image on Windows. `rbd-nbd` is a Linux-only tool that relies on the Linux NBD (Network Block Device) kernel module. It does not exist on Windows.
- **What was changed:** Replaced `rbd-nbd map` with `rbd device map`, which is the correct user-facing command on Windows. On Windows, `rbd device map` uses the WNBD (Windows Network Block Device) Storport Miniport driver behind the scenes.
- **Why:** The `rbd-nbd` binary is not available on Windows. The Ceph Windows client uses `rbd-wnbd` as the backend service daemon, but users interact via the standard `rbd device map` / `rbd device unmap` / `rbd device list` commands.

### 2. Incorrect alternative mapping command: `rbd map` replaced with `rbd device list`
- **What was wrong:** The post showed `rbd map` as an alternative command. While `rbd map` is a shorthand that works on some platforms, the canonical and documented form on Windows is `rbd device map`. The "alternative" was also redundant with the primary command.
- **What was changed:** Replaced the `rbd map` alternative with `rbd device list` to show how to verify mapped devices, which is more useful as a follow-up step.
- **Why:** Provides a more useful command sequence (map then verify) and avoids ambiguity about the correct command form.

### 3. Startup script used incorrect `rbd.exe map` subcommand
- **What was wrong:** The boot startup script called `rbd.exe map` which should be `rbd.exe device map`.
- **What was changed:** Updated to `rbd.exe device map windows-pool/windows-disk01 --id windows-node1`.
- **Why:** Consistent with the correct `rbd device map` syntax documented by Ceph for Windows.

## Review Notes
- The Ceph CSI RBD driver's Windows node support (shown in the Kubernetes StorageClass section) is still evolving. The `allowedTopologies` approach using `kubernetes.io/os: windows` is a valid Kubernetes mechanism, but users should verify that their version of ceph-csi supports Windows node plugins before relying on this configuration.
- The `ceph osd pool create windows-pool 32` command explicitly sets pg_num to 32. Modern Ceph (Nautilus+) supports PG autoscaling by default, so the explicit pg_num is optional but still valid syntax.
- The post correctly uses `C:\ProgramData\ceph\` for the keyring path on the command line. Note that inside `ceph.conf` files on Windows, forward slashes must be used instead of backslashes per the official docs.
- The Tag "Window" in the post metadata should likely be "Windows" (with an 's').
