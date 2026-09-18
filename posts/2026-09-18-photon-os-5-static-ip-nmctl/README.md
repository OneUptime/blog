# How to Set a Persistent Static IP, Gateway, and DNS on Photon OS 5 with nmctl

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, Networking, Linux

Description: Configure persistent Photon OS 5 networking with nmctl and verify DHCP state, routes, DNS, and reboot behavior.

---

Photon OS 5 uses `systemd-networkd` for network configuration, and `nmctl` provides an interface to it. Adding a static address is only one part of the change: DHCP can still install another address, gateway, and DNS server unless you deliberately change that behavior. Work from the VM console while changing the interface that carries your SSH session.

## Identify the active configuration

Capture the existing address, routes, and resolver state:

```bash
ip -br address
ip route
networkctl status eth0
resolvectl status
nmctl --version
nmctl --help
```

Replace `eth0` with the interface actually connected to your application port group. Record the **Network File** reported by `networkctl status`. Back up `/etc/systemd/network` and any network-generating configuration before editing it.

The [Photon nmctl reference](https://vmware.github.io/photon/docs-v5/command-line-reference/command-line-interfaces/photon-network-config-manager-cli/) confirms that the tool writes persistent configuration and documents the `dev`, `a`, `gw`, and `dns` argument forms. Older tutorials show different command names. Compare examples with the help output from the installed build rather than mixing generations of syntax.

If the command is missing, query the repository for `network-config-manager` and install the matching Photon package. Do not substitute NetworkManager's `nmcli`: it manages a different networking stack.

## Plan the complete IPv4 state

For this example, the intended configuration is:

| Setting | Example value |
| --- | --- |
| Interface | `eth0` |
| Address | `192.0.2.20/24` |
| Gateway | `192.0.2.1` |
| DNS servers | `192.0.2.53`, `192.0.2.54` |
| DHCPv4 | Disabled |

These documentation addresses must be replaced with real values. Reserve the address in your IP-management system and exclude it from any overlapping DHCP allocation pool. Verify that the gateway belongs to the directly connected subnet unless your network design explicitly uses an on-link route.

Current network-config-manager source includes a combined IPv4 operation, demonstrated in its [upstream tests](https://github.com/vmware-archive/network-config-manager/blob/main/tests/cmocka/set-network.c):

```bash
nmctl set-ipv4 dev eth0 dhcp no \
  a 192.0.2.20/24 gw 192.0.2.1 \
  dns 192.0.2.53,192.0.2.54
```

Use this only if the installed command help offers `set-ipv4` with these arguments. It sets the desired IPv4 configuration, including disabling DHCPv4, in one operation. It does not establish a complete IPv6 policy; configure IPv6 separately if your environment uses it.

## Use the documented individual operations when needed

Photon also documents these individual address, gateway, and resolver operations:

```bash
nmctl add-addr dev eth0 a 192.0.2.20/24
nmctl add-default-gw dev eth0 gw 192.0.2.1 onlink yes
nmctl add-dns dev eth0 dns 192.0.2.53 192.0.2.54
```

They add configuration and are not a substitute for disabling DHCP. If your installed build lacks the combined operation, inspect its supported DHCP command or edit the active `.network` file so its `[Network]` section contains `DHCP=no`. Retain the relevant `[Match]` section and review existing addresses, gateways, and DNS entries to remove stale values intentionally.

The [systemd.network documentation](https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html) explains file matching and route configuration. The first matching network file wins; adding another file with a later name can leave the previous DHCP configuration in control.

From the console, reload network configuration and reconfigure the interface when manual edits require it:

```bash
networkctl reload
networkctl reconfigure eth0
```

Allow existing connections to break. Reconnect using the new address after the interface reaches its expected state.

## Verify persistence and resolver ownership

Repeat `ip -br address`, `ip route`, `networkctl status eth0`, and `resolvectl status`. Check for an unexpected second default route or a remaining DHCP address. Test the gateway, then an external address, then an application hostname. Each test isolates a different failure domain.

Do not overwrite `/etc/resolv.conf` blindly. Determine whether it is managed by systemd-resolved and whether another provisioning system regenerates networking at boot. Photon documents [network generators](https://vmware.github.io/photon/docs-v5/administration-guide/managing-network-configuration/using-the-network-configuration-manager/) that can recreate networkd files from YAML or kernel arguments.

Reboot during the maintenance window and repeat the same checks. If settings revert, fix the configuration owner—cloud-init, a generator, or template customization—instead of repeatedly changing the generated output. Keep the backup until the new address, route, DNS, and remote management access all survive that reboot.
