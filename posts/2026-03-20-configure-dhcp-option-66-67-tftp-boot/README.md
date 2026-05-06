# How to Configure DHCP Option 66 and Option 67 for TFTP Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, TFTP, PXE Boot, Option 66, Option 67, Sysadmin

Description: DHCP option 66 delivers the TFTP server hostname or IP and option 67 delivers the boot filename to network-booting clients, together enabling PXE and VoIP phone provisioning workflows.

## What Are Options 66 and 67?

| Option | RFC | Purpose | Data Type |
|--------|-----|---------|-----------|
| 66 | RFC 2132 | TFTP server name/IP | String |
| 67 | RFC 2132 | Bootfile name | String |

These options inform DHCP clients where to find their boot file and what file to load. Many PXE clients also rely on the BOOTP `next-server`/`siaddr` and `file` header fields, so administrators often set both the DHCP options and the BOOTP fields for compatibility.

## ISC dhcpd Configuration

```text
# /etc/dhcp/dhcpd.conf

# For BIOS PXE boot

subnet 10.0.0.0 netmask 255.255.255.0 {
    range 10.0.0.100 10.0.0.200;
    option routers 10.0.0.1;

    # Option 66: TFTP server address
    option tftp-server-name "10.0.0.10";

    # Option 67: Boot filename
    option bootfile-name "pxelinux.0";

    # Also set BOOTP next-server and filename for compatibility
    next-server 10.0.0.10;
    filename "pxelinux.0";
}

# Differentiate UEFI vs BIOS using the PXE vendor-class prefix
class "UEFI-64" {
    match if substring(option vendor-class-identifier, 0, 20) = "PXEClient:Arch:00007"
          or substring(option vendor-class-identifier, 0, 20) = "PXEClient:Arch:00009";
    option bootfile-name "shimx64.efi";     # Example UEFI boot file
    filename "shimx64.efi";
    option tftp-server-name "10.0.0.10";
}

class "BIOS" {
    match if substring(option vendor-class-identifier, 0, 20) = "PXEClient:Arch:00000";
    option bootfile-name "pxelinux.0";
    filename "pxelinux.0";                  # BIOS boot file
    option tftp-server-name "10.0.0.10";
}
```

## dnsmasq Configuration

```text
# /etc/dnsmasq.conf

# Enable TFTP server built into dnsmasq
enable-tftp
tftp-root=/var/lib/tftpboot

# Send DHCP options 66 and 67 explicitly
dhcp-option-force=66,"10.0.0.10"
dhcp-option-force=67,"pxelinux.0"

# Also set BOOTP next-server and filename for PXE compatibility
dhcp-boot=tag:!efi-x86_64,pxelinux.0,,10.0.0.10

# UEFI support with multiple tags
dhcp-match=set:efi-x86_64,option:client-arch,7
dhcp-match=set:efi-x86_64,option:client-arch,9
dhcp-option-force=tag:efi-x86_64,67,"shimx64.efi"
dhcp-boot=tag:efi-x86_64,shimx64.efi,,10.0.0.10
```

## For VoIP Phones (Generic)

```text
# Phones needing firmware from TFTP
subnet 10.0.30.0 netmask 255.255.255.0 {
    range 10.0.30.10 10.0.30.250;
    option routers 10.0.30.1;
    option tftp-server-name "10.0.0.100";   # Option 66
    option bootfile-name "phone_config.xml"; # Option 67
    next-server 10.0.0.100;                 # BOOTP next-server
    filename "phone_config.xml";            # BOOTP boot file
    default-lease-time 3600;
}
```

## Testing Option 66 and 67 Delivery

```bash
# Check which options a client received
# Method 1: verbose dhclient (useful for troubleshooting, but packet capture is more reliable)
sudo dhclient -v eth0 2>&1 | grep -Ei "dhcp|tftp|boot"

# Method 2: tshark
tshark -i eth0 -Y "dhcp.option.type == 66 || dhcp.option.type == 67" \
    -T fields -e dhcp.option.tftp_server_name \
               -e dhcp.option.bootfile_name
```

## Key Takeaways

- Option 66 (string) and `next-server`/`siaddr` often serve the same purpose but are carried differently; set both when you need broad PXE compatibility.
- Option 67 and the BOOTP `filename` field likewise overlap; setting both helps clients that expect one form or the other.
- dnsmasq has a built-in TFTP server (`enable-tftp`) that simplifies PXE setups.
- For UEFI boot, match the PXE architecture and serve an appropriate `.efi` loader such as `shimx64.efi`; for BIOS, serve `pxelinux.0`.
