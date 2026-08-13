# Validation Summary: InfiniBand Is LinkUp but Not Active: Find the Missing Control Plane

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- InfiniBand port state and subnet management
- OpenSM and redundant Subnet Managers
- Linux RDMA sysfs and userspace MAD interfaces
- rdma-core InfiniBand diagnostic utilities
- ConnectX VPI, RoCE, and IP over InfiniBand
- systemd service discovery and logging

## Sources Consulted

- [Linux kernel stable InfiniBand sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)
- [Linux kernel userspace MAD access documentation](https://docs.kernel.org/infiniband/user_mad.html)
- [Linux kernel IP over InfiniBand documentation](https://docs.kernel.org/infiniband/ipoib.html)
- [iproute2 `rdma-link(8)` manual](https://github.com/iproute2/iproute2/blob/main/man/man8/rdma-link.8)
- [rdma-core `ibstat(8)` manual](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibstat.8.in.rst)
- [rdma-core `sminfo(8)` manual](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/sminfo.8.in.rst)
- [rdma-core `ibportstate(8)` manual](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibportstate.8.in.rst)
- [rdma-core `iblinkinfo(8)` manual](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/iblinkinfo.8.in.rst)
- [rdma-core `ibqueryerrors(8)` manual](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibqueryerrors.8.in.rst)
- [OpenSM `opensm(8)` manual](https://github.com/linux-rdma/opensm/blob/master/man/opensm.8.in)
- [systemd `systemctl(1)` manual](https://www.freedesktop.org/software/systemd/man/latest/systemctl.html)
- [NVIDIA InfiniBand fabric utilities documentation](https://docs.nvidia.com/networking/display/mlnxofedv23105140lts/infiniband-fabric-utilities)
- [NVIDIA Subnet Manager documentation](https://docs.nvidia.com/doca/sdk/nvidia-sm/index.html)
- [InfiniBand Trade Association specification FAQ](https://www.infinibandta.org/ibta-specification/)

## Issues Found

- The service-discovery command used `systemctl list-units`, which omits inactive units by default. It now uses `systemctl list-unit-files` so an installed but stopped OpenSM service is also discoverable.
- The `ibportstate` example used angle-bracket placeholders. In a shell, those tokens are parsed as input redirections, so they were replaced with shell-safe `SWITCH_LID` and `SWITCH_PORT` placeholders.
- The OpenSM access check mentioned only `/dev/infiniband/umad*`. It now also identifies the corresponding `/dev/infiniband/issm*` device used to declare a userspace Subnet Manager.
- The LID checks treated every nonzero LID as usable. InfiniBand also reserves permissive LID `0xffff`; the diagnosis and expected healthy endpoint now require a usable unicast LID that is neither `0x0` nor `0xffff`.
- The IPoIB verification step implied that every deployment requires a P_Key child interface. It now makes the child interface conditional because the parent interface uses the port's P_Key-table index 0.
- The documentation list linked to the Linux NFS/RDMA page, which is marked obsolete and was only indirect support for the SM requirement. It was replaced with the current Linux userspace MAD documentation.

## Review Notes

- The state-machine explanation and the `ibstat`, `rdma link`, `sminfo`, OpenSM, `iblinkinfo`, and fabric-diagnostic command forms are consistent with the current upstream manuals.
- The NVIDIA fabric-utilities link is version-pinned to MLNX_OFED 23.10 LTS, but the documented command forms used in the post also match current upstream rdma-core manuals.
- On ConnectX-8 adapters, current NVIDIA documentation requires creating an SMI interface before running OpenSM or InfiniBand management tools. The post's generic workflow remains valid once the platform exposes the required management interfaces.
