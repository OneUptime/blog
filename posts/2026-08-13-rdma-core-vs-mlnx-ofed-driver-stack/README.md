# Choose Distribution RDMA or NVIDIA OFED Without Mixing Stacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RDMA, rdma-core, MLNX_OFED, DOCA-OFED, ConnectX, Linux

Description: Choose between a distribution's upstream RDMA stack and NVIDIA's vendor stack using kernel lifecycle, hardware generation, required features, and support matrices.

---

“rdma-core versus MLNX_OFED” is convenient shorthand, but it compares packages at different layers. Upstream `rdma-core` is the userspace project containing libibverbs, librdmacm, diagnostic tools, and hardware providers. A distribution deployment pairs those packages with RDMA drivers from its Linux kernel. MLNX_OFED historically bundled NVIDIA-tested kernel drivers, userspace libraries, tools, and supporting components as one vendor stack.

There is also a current naming change that matters in 2026: NVIDIA says the last standalone MLNX_OFED release was the October 2024 LTS and that new features moved to DOCA-OFED from January 2025. A new “vendor OFED” deployment should therefore evaluate the supported DOCA Host profile, not assume an old standalone MLNX_OFED image is current.

The safest default is the stack supported by the operating-system and application vendors for the exact adapter and feature set. Choose from evidence, then install one coherent kernel/userspace combination.

## Understand the Two Software Shapes

| Layer | Distribution/upstream path | NVIDIA vendor path |
| --- | --- | --- |
| kernel RDMA drivers | shipped and maintained with the distribution kernel | NVIDIA-packaged drivers matched to supported OS/kernel builds |
| userspace verbs and CM | distribution build of upstream `rdma-core` | vendor-packaged userspace and providers |
| HCA provider | for example upstream mlx5 provider | NVIDIA-tested provider from the vendor bundle |
| lifecycle | follows distribution kernel/security updates | follows DOCA-OFED/MLNX_OFED release and support matrix |
| feature timing | reaches a distribution after upstreaming and backport policy | may expose NVIDIA features earlier on validated combinations |
| support owner | OS vendor and upstream communities | NVIDIA plus the OS/application support agreement |

NVIDIA's MLNX_OFED installer documentation explicitly describes removing RDMA stacks from the standard distribution or another commercial stack before installing its own packages. That is a warning against layering both, not an invitation to cherry-pick arbitrary libraries.

## Prefer the Distribution Stack When It Meets the Requirement

Inbox kernel drivers plus distribution `rdma-core` are often the best operational fit when:

- the adapter is supported by the distribution kernel;
- the workload uses standard verbs, RDMA CM, IPoIB, SRP, NFS/RDMA, or RoCE features available in that release;
- security updates and kernel live-cycle integration matter more than an early vendor feature;
- Secure Boot keys and module signing are managed by the OS vendor;
- the application vendor certifies the distribution stack;
- the fleet upgrades kernels frequently.

Because the drivers are built with the kernel, an ordinary distribution kernel update should bring matching inbox modules. Distribution backports mean the feature set cannot be inferred from the upstream kernel version number alone; read that distribution's driver and hardware support notes.

Upstream rdma-core lists userspace support for kernel drivers including `mlx4_ib` and `mlx5_ib`. That does not guarantee a particular distribution enabled the driver, retained an older adapter, or certifies it. Treat upstream presence, OS packaging, and commercial support as three distinct questions.

## Choose DOCA-OFED for a Verified Vendor Requirement

A vendor stack is justified when a concrete requirement is absent or unsupported in the target distribution, for example:

- a new ConnectX/BlueField generation needs a newer driver than the OS provides;
- an NVIDIA-specific offload, telemetry, virtualization, or management capability is required;
- an HPC, storage, GPU, or appliance vendor certifies only a named DOCA-OFED build;
- NVIDIA support requests reproduction on a validated vendor matrix;
- the organization can hold or coordinate kernel updates with that matrix.

Current NVIDIA DOCA documentation describes `doca-ofed` as a driver-and-tools profile equivalent to an MLNX_OFED-like installation. It separately recommends broader profiles for some ConnectX and BlueField use cases. Do not install `doca-all` merely to obtain an RDMA driver; profile choice controls many additional components and must follow the product documentation.

The vendor path is not “newer is always faster.” It creates another compatibility boundary among OS release, kernel build, adapter, firmware, DOCA profile, application, and Secure Boot policy. Only select it when the required and supported combination is named.

## Let ConnectX Generation Narrow the Choice

Inventory the exact ordering part number and PSID, not just the marketing family:

~~~console
$ lspci -nnk | grep -A3 -iE 'mellanox|nvidia|infiniband|network controller'
$ sudo mlxfwmanager --query
$ rdma dev show
$ ibv_devinfo -v
~~~

For ConnectX-4-class and later devices, Linux and NVIDIA stacks use the mlx5 family, but support differs by exact SKU and release. Current DOCA profile documentation publishes a finite supported-device list. An `mlx5` module in a kernel is not proof that every new card feature is supported.

ConnectX-3 and ConnectX-3 Pro need special care. NVIDIA states that MLNX_OFED 5.1 and later no longer support them, while the upstream rdma-core tree still contains an mlx4 provider. The viable path may be a distribution that still supports mlx4 or an older, specifically maintained vendor LTS. Do not put a modern OFED image on legacy hardware based solely on the word “ConnectX.” Verify the OS and security lifetime before preserving an old stack.

For the newest hardware, the inverse problem occurs: a long-lived enterprise kernel may recognize the PCI function but lack the required RDMA support. A supported newer OS kernel can be a cleaner solution than introducing out-of-tree modules to an otherwise standard fleet.

## Inventory the Installed Stack Before Deciding

Capture facts from a representative node:

~~~console
$ uname -r
$ modinfo mlx5_core | grep -E '^(filename|version|vermagic):'
$ modinfo mlx5_ib | grep -E '^(filename|version|vermagic):'
$ command -v ofed_info >/dev/null && ofed_info -s
$ ldd "$(command -v ibv_devinfo)"
$ rdma dev show
~~~

Then use the native package manager to list and identify owners of RDMA, libibverbs, mlx5-provider, OFED, and DOCA packages. Warning signs include:

- kernel modules under a vendor `extra`/`updates` tree but distribution libibverbs packages;
- binaries from `/usr/local` loading libraries from `/usr`;
- both DOCA/MLNX repositories and distribution RDMA repositories supplying files;
- an installer version that does not support the running kernel;
- initramfs containing an older driver than the root filesystem.

Package names and paths vary, so diagnose ownership rather than deleting files by pattern.

## Use a Written Selection Matrix

Make the choice reviewable:

| Question | Distribution path favored when… | Vendor path favored when… |
| --- | --- | --- |
| required feature | present and supported in the OS build | absent inbox and documented in DOCA-OFED |
| kernel cadence | rapid security/errata adoption is required | kernel versions can follow vendor matrix |
| application support | application certifies OS RDMA | application certifies named vendor build |
| hardware age | OS supports the adapter through its lifetime | exact current device is in vendor profile matrix |
| operations | one OS-native update path is preferred | team can operate vendor repos, signing, and rebuilds |
| incident ownership | OS vendor owns kernel integration | NVIDIA owns feature/driver reproduction |

Do not use a synthetic microbenchmark as the only selection criterion. Test the real transport, message sizes, GPU/storage paths, failover, telemetry, container access, and kernel-upgrade procedure. A small throughput gain cannot compensate for an unsupported security-update process.

## Migrate as an Image Change, Not a Package Overlay

For a controlled migration:

1. Record firmware, module paths, packages, port GUIDs, link modes, and baseline application tests.
2. Confirm the destination OS/kernel/device/firmware matrix.
3. Drain the node and preserve an out-of-band recovery path.
4. Use the source stack's documented uninstall and destination stack's documented install procedure.
5. Rebuild initramfs and enroll signing keys only as the destination documentation requires.
6. Reboot, then verify module provenance, RDMA enumeration, link layer, and application behavior.
7. Exercise the next kernel update in staging before fleet rollout.

A rollback is a complete return to the previous known-good image, not reinstalling one old provider library into the new kernel stack.

## Official Documentation

- [rdma-core: upstream userspace architecture and supported providers](https://github.com/linux-rdma/rdma-core)
- [Linux kernel: mlx5 driver documentation](https://www.kernel.org/doc/html/latest/networking/device_drivers/ethernet/mellanox/mlx5/index.html)
- [NVIDIA: Linux drivers and the MLNX_OFED-to-DOCA-OFED transition](https://network.nvidia.com/products/infiniband-drivers/linux/mlnx_ofed/)
- [NVIDIA DOCA: current Host profile selection and supported devices](https://docs.nvidia.com/doca/sdk/doca-profiles/)
- [NVIDIA: MLNX_OFED architecture, components, and transition note](https://docs.nvidia.com/networking/display/MLNXOFEDv24040660/Introduction)
- [NVIDIA: MLNX_OFED support and legacy ConnectX limitations](https://docs.nvidia.com/networking/display/nvidia-mlnx-ofed-documentation-v24-10-1-1-4-0-105-lts.105%20LTS.pdf)
- [NVIDIA: kernel compatibility and rebuild issues](https://docs.nvidia.com/networking/display/mlnxofedv23102131201lts/installation-related-issues.pdf)

## Conclusion

Use distribution RDMA when its kernel and rdma-core packages support the exact device, workload, and support contract; it gives the cleanest OS-integrated lifecycle. Use DOCA-OFED when a named NVIDIA feature, new device, or certification requires the vendor stack and the fleet can follow its OS/kernel matrix. Treat old MLNX_OFED as an LTS compatibility choice, not the source of new features. Whichever path wins, deploy its kernel and userspace as one tested image and keep the other stack out.
