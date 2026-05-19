# Validation Summary: How to Configure InfiniBand on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- InfiniBand
- RDMA / Linux RDMA core
- NVIDIA MLNX_OFED
- OpenSM
- IP over InfiniBand (IPoIB)
- Netplan
- linux-rdma perftest
- Open MPI
- UCX
- infiniband-diags

## Sources Consulted
- NVIDIA MLNX_OFED installation documentation: https://docs.nvidia.com/networking/display/ofed/installing+mlnx_ofed
- NVIDIA IP over InfiniBand documentation: https://docs.nvidia.com/networking/display/mlnxenv496060lts/ip+over+infiniband+(ipoib)
- Linux kernel IPoIB documentation: https://www.kernel.org/doc/html/latest/infiniband/ipoib.html
- Ubuntu package metadata for rdma-core and related binaries: https://packages.ubuntu.com/source/jammy/rdma-core
- Local Ubuntu apt package metadata for Noble packages: `rdma-core`, `ibverbs-utils`, `infiniband-diags`, `perftest`, `opensm`, `openmpi-bin`, `libopenmpi-dev`
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Open MPI InfiniBand / RoCE support documentation: https://docs.open-mpi.org/en/v5.0.7/tuning-apps/networking/ib-and-roce.html
- OpenUCX running documentation: https://openucx.readthedocs.io/en/master/running.html
- linux-rdma perftest documentation: https://github.com/linux-rdma/perftest
- Debian man pages for infiniband-diags commands: https://manpages.debian.org/unstable/infiniband-diags/
- NVIDIA InfiniBand speed references for EDR, HDR, and HDR100: https://www.nvidia.com/en-us/networking/infiniband/direct-attach-copper-cables/

## Issues Found
- The Ubuntu inbox package example listed `libmlx5-1` and `mlnx-tools`, which are not current Ubuntu Noble package names and make the install command fail on current Ubuntu. Replaced them with `ibverbs-providers`, which supplies user-space RDMA providers including mlx5 support.
- The module loading example omitted `ib_ipoib`, which is required for IP over InfiniBand network interfaces. Added it to both the `modprobe` commands and the persistent modules file.
- The Netplan example set MTU `65520` before configuring connected mode. NVIDIA documents MTU `65520` as valid for IPoIB connected mode, while datagram mode uses much smaller MTUs. Added `infiniband-mode: connected` and clarified the MTU comment.
- The manual IPoIB mode command changed `/sys/class/net/ib0/mode` while the interface could be up, but NVIDIA documents mode changes as requiring the interface to be down. Added `ip link set ib0 down` and `ip link set ib0 up` around the mode change.
- The `ib_send_bw -R` comment described the command as IPoIB/IP-based testing. perftest documents `-R` as RDMA CM connection setup. Updated the comment accordingly.
- The expected-results text called a 100 Gb/s link "HDR"; NVIDIA references HDR as 200 Gb/s and HDR100/EDR as 100 Gb/s. Changed the wording to "100Gb/s EDR or HDR100".
- The Open MPI example forced UCX PML but not the UCX OSC component. Open MPI documents `--mca pml ucx --mca osc ucx` for forcing UCX for point-to-point and one-sided operations. Added `OMPI_MCA_osc=ucx` and `-mca osc ucx`.
- Several infiniband-diags examples were not valid as written: `ibroute` needs a switch LID/GUID/direct route, `ibsysstat` needs a destination, `perfquery -x mlx5_0 1` passed a device name where the command expects LID/GUID/port unless `-C`/`-P` are used, and `infiniband-diags` is a package name rather than a diagnostic command. Updated the examples to use the documented arguments.

## Review Notes
- The guide remains version-sensitive. MLNX_OFED package names and supported Ubuntu releases change by NVIDIA driver release, so readers should still download a package that matches their exact Ubuntu version and kernel support matrix.
- The IPoIB interface name `ib0` is common but not guaranteed on every system; users may need to substitute the actual interface shown by `ip link`.
- The performance numbers are plausible for a healthy 100 Gb/s fabric, but actual results depend on PCIe generation, CPU, NUMA placement, firmware, cable/switch quality, message size, and test parameters.
