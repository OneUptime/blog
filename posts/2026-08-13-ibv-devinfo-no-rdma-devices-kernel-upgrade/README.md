# Restore Missing RDMA Devices After a Kernel Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RDMA, InfiniBand, ibv_devinfo, Linux Kernel, ConnectX, MLNX_OFED

Description: Diagnose ibv_devinfo showing no RDMA devices after a kernel upgrade by separating PCI discovery, kernel module, uverbs, Secure Boot, and userspace provider failures.

---

When `ibv_devinfo` reports no RDMA devices immediately after a kernel upgrade, the cable and Subnet Manager are rarely the first suspects. An HCA should enumerate as a userspace verbs device even when its physical port is down. The upgrade more often exposed a missing module for the running kernel, an out-of-tree module ABI mismatch, Secure Boot rejection, or a mixed libibverbs/provider installation.

Diagnose the stack in order. `ibv_devinfo` sits above PCI discovery, the hardware driver, the kernel RDMA device, uverbs character devices, libibverbs, and a hardware-specific userspace provider. Each layer gives a different failure boundary.

## Record the Running Kernel and PCI Binding

First prove that the machine booted the kernel you think it did and that PCI still sees the adapter:

~~~console
$ uname -r
$ cat /proc/cmdline
$ lspci -nnk | grep -A3 -iE 'infiniband|network controller|mellanox|nvidia'
~~~

If the HCA is absent from `lspci`, libibverbs is not the problem. Check firmware/BIOS PCIe settings, physical presence, power, PCIe errors, and, on composable systems, whether the function was assigned to another host. If PCI sees it, note `Kernel driver in use` and the BDF such as `0000:5e:00.0`. On a typical KVM/QEMU VFIO host, a passed-through function remains visible to `lspci` but is bound to a VFIO driver such as `vfio-pci` or a device-specific VFIO driver.

For NVIDIA ConnectX-4 and newer devices, the normal low-level driver is `mlx5_core`; `mlx5_ib` provides InfiniBand/RDMA-specific integration. Seeing `mlx5_core` bound does not prove that `mlx5_ib` successfully attached.

## Verify Modules for This Exact Kernel

Query the module metadata, build identity, and load state:

~~~console
$ modinfo -F filename mlx5_core
$ modinfo -F vermagic mlx5_core
$ modinfo -F filename mlx5_ib
$ modinfo -F vermagic mlx5_ib
$ lsmod | grep -E 'mlx5_core|mlx5_ib|ib_core|ib_uverbs'
$ find /lib/modules/"$(uname -r)" -name 'mlx5*.ko*'
~~~

`modinfo` failing means kmod did not find indexed module metadata for the running kernel, but the driver may instead be built into the kernel. A valid `weak-updates` link can also resolve to a module built for another vendor-kernel release when its kABI is compatible. A kernel-reported version-magic mismatch or symbol-version disagreement indicates incompatibility; an `Unknown symbol` error can also indicate a missing dependency or mixed module set, so read the surrounding kernel log. `lsmod` lists only dynamically loaded modules; built-in support will not appear there. Probe one component at a time so any error is attributable:

~~~console
$ sudo modprobe mlx5_core
$ sudo modprobe mlx5_ib
$ sudo modprobe ib_uverbs
$ sudo journalctl -k -b --no-pager | grep -iE 'mlx5|infiniband|rdma|uverbs|module|firmware'
~~~

`ib_uverbs` can be built or packaged differently by distribution, so interpret a missing standalone module in the context of the kernel configuration and existing device nodes. The decisive evidence is the kernel log plus whether an RDMA class device and uverbs device appear.

## Look for the Classic Out-of-Tree Upgrade Failure

On Red Hat and SLES KMP installations, NVIDIA documents a specific MLNX_OFED failure mode: when its modules are incompatible with a new errata or OS kernel, the expected `weak-updates` links are not created and driver loading fails. On Debian/Ubuntu MLNX_OFED installations that use `mlnx-ofed-kernel-dkms`, DKMS normally builds modules for installed kernels, but that build can fail or the resulting module can remain unsigned.

Inspect package and build logs instead of repeatedly running `modprobe`:

~~~console
$ command -v ofed_info >/dev/null && ofed_info -s
$ dkms status
$ sudo journalctl -k -b --no-pager | grep -iE 'unknown symbol|invalid module|version magic|key was rejected'
~~~

Not every system has `ofed_info` or DKMS; their absence is itself useful when identifying whether the system uses distribution inbox RDMA or a vendor stack. Do not run an old `mlnx_add_kernel_support.sh` copied from another release. Build or install only through the documentation for the installed MLNX_OFED/DOCA-OFED release and a kernel/OS combination in its support matrix.

## Check Secure Boot and Module Signatures

A correctly compiled module can still be rejected. The Linux kernel can enforce valid module signatures, and NVIDIA's out-of-tree modules require a trusted signing key under Secure Boot configurations.

~~~console
$ mokutil --sb-state
$ modinfo -F signer mlx5_ib
$ sudo journalctl -k -b --no-pager | grep -iE 'secure boot|lockdown|unsigned|signature|verification|key.*rejected'
~~~

`mokutil` may not be installed, but the kernel log remains authoritative. Do not disable Secure Boot as the routine fix. Enroll the documented key or have the rebuilt module signed through the organization's approved process. A module with an unknown or invalid signature may be rejected when enforcement is enabled.

## Find the Kernel/User Boundary

Once the hardware driver attaches, inspect the kernel RDMA objects:

~~~console
$ ls -la /sys/class/infiniband
$ rdma dev show
$ rdma link show
$ ls -la /dev/infiniband
~~~

The outcomes narrow the issue:

| Evidence | Likely boundary |
| --- | --- |
| PCI device only; no `/sys/class/infiniband` entry | hardware/RDMA kernel driver did not attach |
| RDMA class entry, but no `uverbs*` | userspace-access module, device creation, or kernel configuration |
| RDMA class and `uverbs*` exist; `ibv_devinfo` empty/fails | libibverbs provider, library mix, permissions, or namespace |
| Device lists, port is `Down` | enumeration is fixed; diagnose link separately |

The stable Linux ABI exposes an `ibdev` association beneath `/sys/class/infiniband_verbs/uverbsN`. Use it to map character devices to HCAs rather than assuming `uverbs0` always belongs to `mlx5_0`.

## Audit libibverbs and the Hardware Provider

Upstream rdma-core contains libibverbs plus providers such as `libmlx5` for `mlx5_ib`. If the kernel device exists but verbs tools cannot open it, check which binary and libraries are actually being used:

~~~console
$ command -v ibv_devinfo
$ ldd "$(command -v ibv_devinfo)"
$ ibv_devices
$ ibv_devinfo -v
$ ls -l /dev/infiniband/uverbs*
~~~

Distribution package names differ, so use the native package manager to find the owner of `ibv_devinfo`, `libibverbs.so`, and the mlx5 provider library. Look for a mixture of `/usr`, `/usr/local`, vendor repository, and distribution files. `LD_LIBRARY_PATH`, containers, and chroots can make the command load a different libibverbs than the host package manager reports.

Set `IBV_SHOW_WARNINGS=1` when provider discovery is in doubt; libibverbs then warns when it discovers a kernel verbs device without a corresponding userspace provider. For runtime library/provider diagnostics, rdma-core also supports `VERBS_LOG_LEVEL` with `VERBS_LOG_FILE`. Permissions matter when a process opens `/dev/infiniband/uverbsN`, but an HCA missing from the kernel RDMA class is not a permissions problem.

## Repair One Coherent Stack

Choose the repair that matches the pre-upgrade stack:

- **Distribution inbox stack:** install the distribution's RDMA userspace/provider packages and the complete kernel module package for the running kernel, then regenerate dependency metadata or initramfs only through that distribution's documented procedure.
- **MLNX_OFED/DOCA-OFED:** use a supported OS/kernel build or rebuild/install the vendor kernel packages exactly as that release documents, including signing. NVIDIA's standalone MLNX_OFED stopped receiving new features after its October 2024 LTS release; fresh vendor-stack decisions should include DOCA-OFED.
- **Immediate recovery:** booting the previously working kernel can restore service while the new-kernel package is corrected. It is evidence of compatibility, not a substitute for a supported upgrade plan.

Do not overlay distribution and vendor packages until `ibv_devinfo` happens to work. Vendor installers can replace inbox kernel and userspace components; partial leftovers create the next upgrade failure.

Finally, reboot or reload only as the repaired stack documents, then verify the entire chain:

~~~console
$ lspci -nnk -s 5e:00.0
$ rdma dev show
$ ls -l /dev/infiniband/uverbs*
$ ibv_devinfo -v
$ ibstat
~~~

Use the real BDF. After enumeration succeeds, diagnose a non-Active port separately: check the cable and link mode, and for an InfiniBand port that reaches `INIT` but not `ACTIVE`, check the Subnet Manager.

## Official Documentation

- [rdma-core: userspace libraries, device nodes, and supported providers](https://github.com/linux-rdma/rdma-core)
- [rdma-core: `ibv_devinfo(1)` manual](https://github.com/linux-rdma/rdma-core/blob/master/libibverbs/man/ibv_devinfo.1)
- [rdma-core: `ibv_get_device_list(3)` provider warnings](https://github.com/linux-rdma/rdma-core/blob/master/libibverbs/man/ibv_get_device_list.3.md)
- [rdma-core: libibverbs permissions and debugging](https://github.com/linux-rdma/rdma-core/blob/master/Documentation/libibverbs.md)
- [Linux kernel: stable InfiniBand and uverbs sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)
- [Linux kernel: module signing and enforcement](https://docs.kernel.org/admin-guide/module-signing.html)
- [NVIDIA MLNX_OFED: installation-related kernel compatibility issues](https://docs.nvidia.com/networking/display/mlnxofedv24104140lts/installation-related-issues)
- [NVIDIA MLNX_OFED: UEFI Secure Boot key enrollment](https://docs.nvidia.com/networking/display/mlnxofedv24104140lts/uefi-secure-boot)

## Conclusion

An empty `ibv_devinfo` after a kernel upgrade is a layered software-enumeration problem until evidence says otherwise. Prove PCI discovery, then module presence and signature for the exact running kernel, then the kernel RDMA class and uverbs devices, and finally libibverbs plus its hardware provider. Repair either the distribution stack or the supported vendor stack as one coherent unit. Only after the HCA enumerates should you investigate physical link state and, for InfiniBand, the Subnet Manager/OpenSM.
