# Validation Summary: How to Configure RDMA over Converged Ethernet (RoCE) on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RDMA
- RoCE and RoCEv2
- rdma-core/libibverbs tools
- NetworkManager/nmcli
- Data Center Bridging and Priority Flow Control
- NVIDIA/Mellanox RoCE utilities
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "Configuring InfiniBand and RDMA networks": https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/8/pdf/configuring_infiniband_and_rdma_networks/Red_Hat_Enterprise_Linux-8-Configuring_InfiniBand_and_RDMA_networks-en-US.pdf
- NVIDIA MLNX_OFED documentation, "RDMA over Converged Ethernet (RoCE)": https://docs.nvidia.com/networking/display/MLNXOFEDv23103220lts/RDMA+over+Converged+Ethernet+(RoCE)
- NVIDIA MLNX_OFED documentation, "Quality of Service (QoS)": https://docs.nvidia.com/networking/display/mlnxofedv531001/quality+of+service+(qos)
- IANA Service Name and Transport Protocol Port Number Registry: https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=4791
- lldpad dcbtool manual page: https://www.mankier.com/8/dcbtool
- lldpad PFC manual page: https://www.mankier.com/8/lldptool-pfc

## Issues Found
- The PFC setup installed `lldpad` but did not start the `lldpad` service before using `dcbtool`. Added `sudo systemctl enable --now lldpad`.
- The `dcbtool` PFC command enabled the PFC feature but did not explicitly enable PFC for priority 3. Added `pfcup:00010000`, matching the documented priority-3 bitmap format.
- The `mlnx_qos` PFC command is NVIDIA/Mellanox-specific, but the surrounding text implied it was generic. Updated the comment to identify it as an NVIDIA/Mellanox adapter command.
- The RoCE mode check used `/sys/class/infiniband/mlx5_0/ports/1/gid_attrs/types/0`, which reads one GID table entry type rather than the RDMA_CM default selected by `cma_roce_mode`. Replaced it with `cma_roce_mode -d mlx5_0 -p 1`.

## Review Notes
- The post uses Mellanox/NVIDIA device names and utilities such as `mlx5_0`, `mlnx_qos`, and `cma_roce_mode`; users with Broadcom, Intel, or other RoCE adapters need vendor-specific equivalents.
- ECN configuration for RoCE deployments usually requires switch-side QoS/ECN configuration as well as host settings. The post's host command is valid as a minimal host-side note, but a production guide should document the end-to-end QoS policy.
