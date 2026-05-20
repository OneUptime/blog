# Validation Summary: How to Configure AF_XDP for User-Space Networking on Ubuntu

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ubuntu
- Linux AF_XDP sockets
- XDP and eBPF
- libxdp and libbpf helper APIs
- XSKMAP
- xdp-project xdpsock sample
- Linux networking performance tuning

## Sources Consulted
- Linux kernel AF_XDP documentation: https://docs.kernel.org/networking/af_xdp.html
- eBPF Docs, BPF_PROG_TYPE_XDP: https://docs.ebpf.io/linux/program-type/BPF_PROG_TYPE_XDP/
- eBPF Docs, BPF_MAP_TYPE_XSKMAP: https://docs.ebpf.io/linux/map-type/BPF_MAP_TYPE_XSKMAP/
- eBPF Docs, bpf_redirect_map helper: https://docs.ebpf.io/linux/helper-function/bpf_redirect_map/
- eBPF Docs, libxdp xsk_socket__create: https://docs.ebpf.io/ebpf-library/libxdp/functions/xsk_socket__create/
- libxdp manual page: https://www.mankier.com/3/libxdp
- xdp-project xdp-tools README: https://github.com/xdp-project/xdp-tools
- xdp-project bpf-examples AF_XDP-example README and Makefile: https://github.com/xdp-project/bpf-examples/tree/main/AF_XDP-example

## Issues Found
- The overview implied all AF_XDP packet delivery is zero-copy. Updated it to distinguish zero-copy mode, where the NIC can DMA into UMEM, from copy mode, where the kernel copies packets into UMEM.
- The user-space C skeleton used `xsk_*` libxdp APIs without including the libxdp AF_XDP header. Added `#include <xdp/xsk.h>` and `#include <stdint.h>`.
- The receive skeleton never populated the fill ring before waiting for packets. Added an initial fill-ring population function, matching the kernel documentation requirement that RX descriptors cannot appear without frames supplied through the FILL ring.
- The receive skeleton recycled `i * UMEM_FRAME_SIZE` rather than the UMEM addresses from consumed RX descriptors. Updated the example to return the actual consumed descriptor addresses to the fill ring.
- The `xdpsock` build instructions pointed to the old kernel source tree location and used an incorrect `make -C samples/bpf M=samples/bpf` command. Replaced the section with the maintained xdp-project `bpf-examples/AF_XDP-example` build path and local `./xdpsock` invocation.
- The zero-copy support check implied that `ethtool -i` proves support. Adjusted the wording to say it only identifies the driver and that support is driver- and version-specific.

## Review Notes
The simplified AF_XDP application remains a skeleton. A production application should add robust UMEM frame ownership tracking, error handling for partial ring reservations, XDP program loading or explicit XSKMAP registration when using a custom XDP program, and queue steering for multi-queue NICs.
