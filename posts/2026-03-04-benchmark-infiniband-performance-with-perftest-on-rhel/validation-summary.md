# Validation Summary: How to Benchmark InfiniBand Performance with perftest on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- InfiniBand
- RDMA
- perftest
- ib_write_bw, ib_write_lat, ib_read_bw, ib_read_lat, ib_send_bw, and ib_send_lat

## Sources Consulted
- Red Hat Enterprise Linux 7 Networking Guide, "InfiniBand and RDMA related software packages": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/networking_guide/sec-infiniband_and_rdma_related_software_packages
- linux-rdma/perftest upstream README and option reference: https://github.com/linux-rdma/perftest
- Debian perftest ib_write_bw man page, used as an additional packaged man-page reference for common options: https://manpages.debian.org/bookworm/perftest/ib_write_bw.1.en.html
- Red Hat OpenShift hardware accelerators documentation, example perftest command usage with `--report_gbits`, `-q`, `-D`, `-d`, and `-p`: https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html-single/hardware_accelerators/hardware_accelerators

## Issues Found
- The advanced option example described `-p 1` as selecting a port on the adapter. In perftest, `-p` / `--port` is the listen/connect TCP port, while `-i` / `--ib-port` selects the network port of the InfiniBand device. Changed the example to use `-i 1`.
- The write latency note said the output shows latency for different message sizes, but the shown command does not use `-a` and therefore tests the selected/default message size. Changed the note to say the output shows latency for the selected message size.

## Review Notes
The remaining commands and options are consistent with perftest usage. The bandwidth expectations for EDR and HDR are reasonable large-message rule-of-thumb values, but real results depend on adapter generation, PCIe bandwidth, MTU, CPU frequency behavior, topology, link health, and whether IPoIB or rdma_cm addressing is used.
