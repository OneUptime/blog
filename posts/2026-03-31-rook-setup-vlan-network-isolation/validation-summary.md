# Validation Summary: How to Set Up VLAN-Based Network Isolation for Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (distributed storage)
- Rook (Ceph operator for Kubernetes)
- VLANs (IEEE 802.1Q)
- Cisco IOS switch configuration
- NetworkManager (nmcli)
- systemd-networkd
- iptables (DSCP/QoS marking)

## Sources Consulted
- Ceph documentation on network configuration: https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- systemd-networkd documentation (systemd.netdev and systemd.network man pages): https://www.freedesktop.org/software/systemd/man/systemd.netdev.html
- NetworkManager nmcli VLAN documentation: https://networkmanager.dev/docs/api/latest/
- Cisco IOS VLAN and trunk configuration reference
- iptables DSCP target documentation

## Issues Found

### 1. Missing parent interface configuration for systemd-networkd
**What was wrong:** The systemd-networkd section defined `.netdev` and `.network` files for the VLAN subinterfaces but omitted the parent interface's `.network` file. Without a `VLAN=` directive in the parent `eth0` network file, systemd-networkd will not associate the VLAN virtual devices with the physical interface, and the VLAN subinterfaces will not be created.

**What was changed:** Added a `00-eth0.network` file containing a `[Match]` section for `eth0` and a `[Network]` section with `VLAN=eth0.10`, `VLAN=eth0.20`, and `VLAN=eth0.30` entries.

**Why:** systemd-networkd requires the parent interface to explicitly declare its VLAN children via the `VLAN=` key in order to create and attach VLAN subinterfaces.

### 2. Incorrect Ceph config scope for network settings
**What was wrong:** The command `ceph config set mon public_network 10.0.1.0/24` sets the public network only for the `mon` daemon section. OSDs and other daemons (MDS, RGW) would not inherit this setting, meaning they might bind to the wrong interface.

**What was changed:** Changed `ceph config set mon public_network` to `ceph config set global public_network` and `ceph config set osd cluster_network` to `ceph config set global cluster_network` so all daemon types use the correct network ranges.

**Why:** The `public_network` setting is needed by all Ceph daemon types (monitors, OSDs, MDS, RGW). Setting it at the `global` scope ensures consistent network binding across the entire cluster. While `cluster_network` is primarily used by OSDs, setting it globally is the standard practice and avoids confusion.

## Review Notes
- The Cisco IOS `mtu 9000` command under the VLAN configuration section is platform-dependent. On some Cisco switch models (e.g., Catalyst 4500), per-VLAN MTU is supported, but on others (e.g., Catalyst 3750), jumbo frame MTU must be set system-wide with `system mtu jumbo 9000`. The post's example is valid but readers should verify support on their specific switch platform.
- The NetworkManager section correctly uses `802-3-ethernet.mtu` for setting MTU on VLAN connections, which is the appropriate property for wired/VLAN connection types.
- The Rook CephCluster YAML uses the correct `spec.network.addressRanges` API available in Rook v1.x with `provider: host`, which is the recommended approach for VLAN-based setups.
- The `ip link show | grep vlan` validation command will work since `ip link show` displays the VLAN protocol info (e.g., `vlan protocol 802.1Q`) for VLAN subinterfaces, though grepping for the specific interface names (e.g., `eth0.10`) would be more precise.
