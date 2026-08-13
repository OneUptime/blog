# Validation Summary: Build OpenSM Redundancy Around One Elected Master

## Status

validated

## Post Type

Operational guide for configuring and testing InfiniBand Subnet Manager redundancy.

## Technologies Covered

- InfiniBand subnet management and the Subnet Manager state machine
- OpenSM command-line options and `opensm.conf`
- OpenSM master/standby election and controlled handover
- rdma-core diagnostic tools (`ibstat` and `sminfo`)
- Linux InfiniBand sysfs attributes
- NVIDIA UFM and NVIDIA SM configuration behavior

## Sources Consulted

- [OpenSM `opensm(8)` manual](https://github.com/linux-rdma/opensm/blob/master/man/opensm.8.in)
- [OpenSM priority and port-GUID comparison implementation](https://github.com/linux-rdma/opensm/blob/8fe74e778470b9c9357506c6c153cada7dfa934d/include/opensm/osm_sm.h#L691-L708)
- [OpenSM generated multiple-SM configuration fields](https://github.com/linux-rdma/opensm/blob/8fe74e778470b9c9357506c6c153cada7dfa934d/opensm/osm_subnet.c#L2748-L2766)
- [OpenSM master handover implementation](https://github.com/linux-rdma/opensm/blob/8fe74e778470b9c9357506c6c153cada7dfa934d/opensm/osm_state_mgr.c#L1492-L1506)
- [rdma-core `sminfo(8)` manual](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/sminfo.8.in.rst)
- [rdma-core `sminfo` implementation](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/sminfo.c)
- [rdma-core `ibstat(8)` manual](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibstat.8.in.rst)
- [Linux stable InfiniBand sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)
- [NVIDIA UFM 6.24.2 Subnet Manager default properties](https://docs.nvidia.com/networking/display/ufmenterpriseumv6242/ufm-subnet-manager-default-properties)
- [NVIDIA UFM 6.24.2 optional configurations](https://docs.nvidia.com/networking/display/ufmenterpriseumv6242/optional-configurations)
- [NVIDIA UFM 6.24.2 SM Configuration REST API](https://docs.nvidia.com/networking/display/ufmenterpriserestapiv6242/sm-configuration-rest-api)
- [NVIDIA SM documentation](https://docs.nvidia.com/doca/sdk/nvidia-sm/index.html)
- [NVIDIA InfiniBand security guidance](https://networking-docs.nvidia.com/nvidiainfinibandsecurityoverviewandguidelines/security-in-infiniband)

## Issues Found

- Qualified the master/standby description as healthy steady-state behavior because `Discovering` and `NotActive` are also valid SM states during transitions or failure.
- Made the equal-priority election rule explicit: OpenSM prefers the numerically lower SM port GUID when priorities match.
- Clarified that `sm_priority` must be configured separately for each OpenSM instance and split the example into two distinct `opensm.conf` excerpts. Putting both values in one apparent file would leave only one effective setting.
- Corrected the description of vendor-managed configuration. Current UFM documentation supports documented changes to `opensm.conf` and an SM-configuration REST API, so it is not accurate to say UFM universally owns an untouchable generated configuration.
- Corrected the `honor_guid2lid_file` discussion. Upstream OpenSM supports the setting, but UFM 6.24.x explicitly marks it as not applicable to UFM SM.
- Tightened the UFM allowlist semantics: it operates on approved SM port GUIDs, an omitted standby is ignored during handover, `(null)` disables the feature, and the special value `0` disallows every other SM.
- Corrected the targetless `sminfo` explanation. With no destination argument, it queries the SM whose LID is recorded for the selected local port; it does not query an attribute belonging to the local port itself.
- Documented current upstream OpenSM's preemptive priority-driven handover while retaining the warning to test product- and version-specific failback timing.
- Reworded the forced-state warning to refer to an SMInfo Set operation. The `--state` option alone supplies a field value; `sminfo` performs a Set only when invoked with the required nonzero modifier.
- Updated the version-pinned UFM properties link from 6.24.1 to 6.24.2.

## Review Notes

The documented commands and paths are valid: `ibstat -p` reports port GUIDs, bare `ibstat` reports logical and physical port state, `sminfo -C mlx5_0 -P 1` selects the stated local CA and port, and the `sm_lid` and `state` sysfs files are part of the stable Linux InfiniBand ABI. The sysfs `state` file reports logical states such as `ACTIVE`; physical `LinkUp` state is reported separately by `phys_state` and is also shown by `ibstat`. All external documentation links in the corrected post returned successfully during review.
