# Validation Summary: How to Disable Learning on a VXLAN Interface

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Linux VXLAN interfaces
- `iproute2` (`ip link`, `bridge fdb`)
- Linux bridge / bridge-slave learning
- EVPN with FRR
- Static VXLAN FDB entries

## Sources Consulted
- Linux kernel VXLAN documentation: https://docs.kernel.org/networking/vxlan.html
- Linux kernel bridge documentation: https://docs.kernel.org/networking/bridge.html
- FRR EVPN documentation: https://docs.frrouting.org/en/stable-10.5/evpn.html
- Local `iproute2` CLI/manpage verification: `ip link help vxlan`, `bridge fdb help`, `man 8 ip-link`, `man 8 bridge`
- Linux kernel selftest for VXLAN bridge behavior: `/usr/src/linux-hwe-6.17-headers-6.17.0-22/tools/testing/selftests/net/forwarding/vxlan_bridge_1d.sh`
- Linux kernel selftest for VXLAN FDB validation behavior: `/usr/src/linux-hwe-6.17-headers-6.17.0-22/tools/testing/selftests/drivers/net/mlxsw/vxlan_fdb_veto.sh`

## Issues Found
- The post said `nolearning` could not be changed on an existing interface and required interface recreation. I corrected this to the supported `ip link set dev vxlan10 type vxlan nolearning` workflow.
- The post treated `nolearning` as if it disabled all MAC learning in an EVPN bridge setup. I clarified that `nolearning` disables VXLAN-device VTEP learning, while bridged EVPN deployments also disable bridge-port MAC learning separately with `ip link set dev vxlan10 type bridge_slave learning off`, per FRR guidance.
- The `/sys` verification example used an invalid placeholder path. I removed the bogus command and clarified that `ip -d link show` is the correct check.
- The flood-list example used `bridge fdb add` for multiple all-zero entries. I changed the second entry to `bridge fdb append`, which is the current Linux pattern for additional default flood entries on VXLAN devices.
- The manual FDB examples were updated to use `static` entries, matching current `bridge fdb` semantics for explicit VXLAN forwarding entries.
- The FRR EVPN snippet was incomplete as written because the neighbor was activated without being defined. I added the required `neighbor ... remote-as ...` line and clarified that a complete FRR EVPN deployment still needs the usual Linux/VNI/VRF configuration.
- The validation step `bridge fdb show dev vxlan10 | grep -v permanent` was unreliable. I replaced it with `bridge fdb show ... dynamic`, which directly checks for learned dynamic entries.

## Review Notes
- `nolearning` by itself does not suppress BUM or unknown-unicast flooding. Traffic that misses the VXLAN FDB is still handled by the default flood mechanism if one is configured.
- The FRR section remains an address-family fragment, not a full end-to-end EVPN deployment recipe. That is acceptable for this post’s scope, but readers still need the broader bridge/VNI/VRF configuration from FRR’s EVPN documentation.
