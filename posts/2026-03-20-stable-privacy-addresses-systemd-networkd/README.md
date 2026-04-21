# How to Configure Stable Privacy Addresses on systemd-networkd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, systemd-networkd, Privacy, RFC7217, Linux, Networking

Description: Configure RFC 7217 stable privacy IPv6 addresses using systemd-networkd to prevent cross-network device tracking on Linux servers and desktops.

## Introduction

systemd-networkd is the network management daemon included with systemd, widely used on servers and minimal Linux installations. It has native support for RFC 7217-style stable SLAAC interface identifiers via the `[IPv6AcceptRA]` `Token=prefixstable` setting. The `IPv6PrivacyExtensions` directive is separate: it controls temporary RFC 4941 addresses.

## Understanding the IPv6PrivacyExtensions Directive

systemd-networkd's `[Network]` section supports these values for `IPv6PrivacyExtensions`, which controls temporary addresses:

| Value | Behavior |
|---|---|
| `no` | Do not generate RFC 4941 temporary addresses |
| `prefer-public` | Generate temporary addresses but prefer the public, non-temporary address |
| `yes` | Generate temporary addresses and prefer them |
| `kernel` | Leave the kernel `use_tempaddr` sysctl setting in place |

For RFC 7217-style stable privacy with systemd-networkd, set `Token=prefixstable` in the `[IPv6AcceptRA]` section. Keep `IPv6PrivacyExtensions=no` if you want stable opaque addresses without temporary addresses.

## Configuring a Network File

Create or edit a `.network` file for your interface in `/etc/systemd/network/`:

```ini
# /etc/systemd/network/10-eth0.network

# Configure eth0 with stable privacy IPv6 address generation

[Match]
Name=eth0

[Network]
DHCP=ipv4
IPv6AcceptRA=yes

# Disable RFC 4941 temporary addresses and use stable-privacy link-local IIDs
IPv6PrivacyExtensions=no
IPv6LinkLocalAddressGenerationMode=stable-privacy

[IPv6AcceptRA]
# Use RFC 7217 stable opaque IIDs for SLAAC prefixes received in RAs
Token=prefixstable
```

No `addr_gen_mode` sysctl is needed for SLAAC prefixes handled by systemd-networkd. When `IPv6AcceptRA=yes` is used, systemd-networkd uses its own Router Advertisement client, so the RA token controls the SLAAC interface identifier.

## Using systemd-networkd for Full RFC 7217 Support

The cleanest approach keeps the temporary-address policy explicit and configures the Router Advertisement token in the network file:

```ini
# /etc/systemd/network/10-eth0.network

[Match]
Name=eth0

[Network]
DHCP=ipv4
IPv6AcceptRA=yes
IPv6PrivacyExtensions=no
IPv6LinkLocalAddressGenerationMode=stable-privacy

[IPv6AcceptRA]
Token=prefixstable
```

The `kernel` value for `IPv6PrivacyExtensions` only leaves the kernel's RFC 4941 `use_tempaddr` setting unchanged; it does not select RFC 7217 address generation for systemd-networkd's userspace RA client.

## Restarting systemd-networkd

After making changes to `.network` files, restart the daemon:

```bash
# Restart systemd-networkd to apply network file changes
sudo systemctl restart systemd-networkd

# Verify the daemon is healthy
sudo systemctl status systemd-networkd
```

## Verifying the Stable Address

Check that the IPv6 address is opaque (not EUI-64 based) and stable:

```bash
# Display IPv6 addresses for eth0
ip -6 addr show eth0

# Note down the IID (last 64 bits of the address)
# Reboot and verify the same IID appears on the same network
# A SLAAC address may still be marked "dynamic"; it should not be marked "temporary"
```

For a quick comparison, compute what the EUI-64 address would look like:

```bash
# Get the MAC address of eth0
MAC=$(cat /sys/class/net/eth0/address)
echo "MAC: $MAC"
IFS=: read -r o1 o2 o3 o4 o5 o6 <<EOF
$MAC
EOF
printf 'Modified EUI-64 IID: %02x%s:%sff:fe%s:%s%s\n' "$((0x$o1 ^ 0x02))" "$o2" "$o3" "$o4" "$o5" "$o6"
# If your stable SLAAC IID differs from this value and remains stable on the same prefix,
# stable-privacy address generation is working correctly
```

## Configuring Multiple Interfaces

Apply the settings to all interfaces using a wildcard match:

```ini
# /etc/systemd/network/10-all-eth.network

[Match]
Name=en*

[Network]
DHCP=ipv4
IPv6AcceptRA=yes
IPv6PrivacyExtensions=no
IPv6LinkLocalAddressGenerationMode=stable-privacy

[IPv6AcceptRA]
Token=prefixstable
```

## Viewing networkctl Status

Use `networkctl` to confirm the configuration is applied:

```bash
# Show detailed status for eth0
networkctl status eth0

# Look for the matched "Network File" and "IPv6 Address Generation Mode: stable-privacy"
```

## Conclusion

systemd-networkd provides straightforward support for RFC 7217 stable privacy addresses through its `.network` file directives. This approach is ideal for servers and headless Linux systems managed without NetworkManager. The resulting addresses are opaque, stable per network, and do not expose the hardware MAC address.
