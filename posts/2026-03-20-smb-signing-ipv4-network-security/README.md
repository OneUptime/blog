# How to Configure SMB Signing for IPv4 Network Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Samba, SMB Signing, IPv4, Security, MITM Protection, Window, Configuration

Description: Learn how to configure SMB signing on Samba and Windows to prevent man-in-the-middle attacks on IPv4 SMB connections.

---

SMB signing adds a cryptographic signature to each SMB packet, allowing the receiver to verify the packet came from the authenticated sender and wasn't modified in transit. Without signing, attackers on the same IPv4 network can perform NTLM relay and man-in-the-middle attacks.

## SMB Signing Options

| Setting | Behavior |
|---------|----------|
| `disabled` | Do not offer signing where the implementation allows disabling it; reject the connection if the peer requires signing |
| `auto` / `desired` | Offer signing, but don't require it |
| `mandatory` / `required` | Require signing; reject unsigned connections |

## Configuring Samba Server Signing

```ini
# /etc/samba/smb.conf

[global]
    workgroup = MYORG
    server signing = mandatory     # Require signing on all SMB connections

    # Also set for the client portion of Samba (used when Samba connects to other servers)
    client signing = required
```

Acceptable values:
- `server signing`: `default`, `auto`, `mandatory`, `disabled`
- `client signing`: `default`, `desired`, `required`, `disabled`

For SMB2/3 server connections, Samba treats `server signing = disabled` as `auto` because SMB2 signing cannot be disabled by design. Use `mandatory` to require signing.

```bash
# Test the configuration

testparm

# Reload Samba
smbcontrol smbd reload-config
```

## Verifying Signing is Active

```bash
# Connect with smbclient and require signing for this test
smbclient //192.168.1.10/data -U user%password --client-protection=sign -c 'ls'

# This command fails if the negotiated connection cannot be signed.
# To inspect active Samba sessions on the server:
smbstatus --json

# Check each session's "signing" object for a cipher and a degree other than "none".
```

## Windows Server and Client Configuration

Group Policy settings for SMB signing:

```text
Computer Configuration → Windows Settings → Security Settings
→ Local Policies → Security Options:

# Server:
"Microsoft network server: Digitally sign communications (always)" = Enabled

# Client (workstation):
"Microsoft network client: Digitally sign communications (always)" = Enabled

# The "if client/server agrees" policies map to EnableSecuritySignature
# and only affect SMB1. SMB2+ signing is controlled by the "always" settings.
```

## PowerShell Settings (Windows)

```powershell
# Enable required SMB signing on Windows Server
Set-SmbServerConfiguration -RequireSecuritySignature $true -Force

# Enable required SMB signing on Windows client
Set-SmbClientConfiguration -RequireSecuritySignature $true -Force

# Check current signing requirement
Get-SmbServerConfiguration | Select-Object -Property RequireSecuritySignature
Get-SmbClientConfiguration | Select-Object -Property RequireSecuritySignature
```

## Performance Considerations

SMB signing adds workload-dependent cryptographic overhead. For high-performance file servers, consider:
- Enabling SMB 3.0/3.02, which uses AES-CMAC signing instead of SMB 2.0 HMAC-SHA256. SMB 3.1.1 peers may also negotiate newer signing algorithms such as AES-128-GMAC.
- Using modern CPUs with AES acceleration and validating throughput for your workload before enforcing signing broadly.

## Key Takeaways

- Set `server signing = mandatory` in `smb.conf` to require signed connections from all SMB clients.
- Signing helps prevent SMB relay and spoofing attacks on signed sessions; use Kerberos and hostnames where possible, because IP-based connections commonly use NTLM.
- SMB 3.x provides encryption in addition to signing - enable it for highly sensitive shares.
- Enabling `mandatory` signing will break connections from very old clients that don't support signing.
