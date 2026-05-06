# How to Use brctl vs ip link for Bridge Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Bridge, Brctl, Ip link, Linux, Networking, Bridge Management, Comparison

Description: Learn the differences between brctl and ip link/bridge for Linux bridge management, including equivalent commands for creating bridges, adding ports, and inspecting bridge state.

---

`brctl` (from the `bridge-utils` package) is the traditional bridge management tool. `ip link` and `bridge` (from `iproute2`) are the modern replacements with more features and consistent syntax.

## Command Equivalents

| Task | brctl | ip link / bridge |
|------|-------|-----------------|
| Create bridge | `brctl addbr br0` | `ip link add br0 type bridge` |
| Delete bridge | `brctl delbr br0` | `ip link del br0` |
| Add port | `brctl addif br0 eth0` | `ip link set eth0 master br0` |
| Remove port | `brctl delif br0 eth0` | `ip link set eth0 nomaster` |
| Show bridges | `brctl show` | `ip link show type bridge` |
| Show STP | `brctl showstp br0` | `ip -d link show dev br0` |
| Show FDB | `brctl showmacs br0` | `bridge fdb show br br0` |
| Set priority | `brctl setbridgeprio br0 4096` | `ip link set br0 type bridge priority 4096` |
| Set port cost | `brctl setpathcost br0 eth0 10` | `bridge link set dev eth0 cost 10` |
| Set ageing | `brctl setageing br0 60` | `ip link set br0 type bridge ageing_time 60` |
| Enable STP | `brctl stp br0 on` | `ip link set br0 type bridge stp_state 1` |

## Creating a Bridge

```bash
# brctl (legacy)

brctl addbr br0
brctl addif br0 eth0
ip link set br0 up

# ip link (modern)
ip link add br0 type bridge
ip link set eth0 master br0
ip link set br0 up
```

## Showing Bridge Status

```bash
# brctl
brctl show
# Output:
# bridge name  bridge id           STP enabled  interfaces
# br0          8000.aabbccddeeff   yes          eth0

# ip/bridge
ip link show type bridge
# 7: br0: <BROADCAST,MULTICAST> mtu 1500 ...

bridge link show
# 2: eth0 master br0 state forwarding priority 32 cost 4

ip -d link show dev br0
# Shows bridge-specific options such as stp_state and ageing_time
```

## Showing FDB (MAC Table)

```bash
# brctl
brctl showmacs br0
# port no  mac addr          is local?  ageing timer
# 1        aa:bb:cc:dd:ee:01 no         12.58
# 1        aa:bb:cc:dd:ee:02 yes        0.00

# bridge (more detail)
bridge fdb show br br0
# aa:bb:cc:dd:ee:01 dev eth0 master br0
# aa:bb:cc:dd:ee:02 dev br0 master br0 permanent
```

## VLAN Operations (ip/bridge only)

```bash
# brctl has NO VLAN support; use bridge command
bridge vlan show
bridge vlan add dev eth0 vid 10
bridge vlan del dev eth0 vid 10
```

## Which to Use?

```text
Use ip link / bridge (iproute2) for:
  - New configurations (modern, actively maintained)
  - VLAN filtering features
  - JSON output (-j flag for scripting)
  - Consistent with rest of iproute2 toolchain

Use brctl for:
  - Legacy scripts or environments that still ship bridge-utils
  - Reading documentation that uses brctl syntax
```

## Key Takeaways

- `brctl` and `ip link/bridge` manage the same kernel bridge subsystem; either can be used.
- `brctl` is deprecated upstream; `ip link` and `bridge` are the current standard.
- VLAN filtering features are only available via the `bridge` command - `brctl` has no VLAN support.
- Use `bridge -j fdb show br br0` for JSON output compatible with monitoring pipelines.
