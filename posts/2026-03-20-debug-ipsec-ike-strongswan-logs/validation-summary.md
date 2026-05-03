# Validation Summary: How to Debug IPsec IKE Negotiation with strongSwan Logs

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- strongSwan (IPsec VPN daemon)
- IKEv2 / IPsec protocol
- Linux (systemd, journalctl)
- charon daemon and stroke interface
- strongswan.conf configuration syntax

## Sources Consulted
- strongSwan official logger configuration documentation: https://docs.strongswan.org/docs/latest/config/logging.html
- strongSwan 5.9 logging docs: https://docs.strongswan.org/docs/5.9/config/logging.html
- strongSwan source repository: https://github.com/strongswan/strongswan

## Issues Found

### 1. Deprecated filelog section name syntax
The original configuration used the legacy pre-5.7.0 syntax where the file path was used directly as the section name:

```
filelog {
    /var/log/charon.log {
        ...
    }
}
```

This syntax is broken on strongSwan 5.7.0 and later because section names cannot contain dots or colons (the `.log` extension contains a dot, which is interpreted as a nested-section separator by the new parser). On all currently supported strongSwan versions, the configuration would fail to parse correctly.

**Fix applied:** Switched to the modern syntax with an arbitrarily-named section and an explicit `path` setting:

```
filelog {
    charon {
        path = /var/log/charon.log
        ...
    }
}
```

This is the syntax recommended by the official strongSwan documentation.

## Review Notes
- The `esp` log subsystem description in the table ("ESP decryption issues") is slightly imprecise — per the official docs, `esp` covers `libipsec` library messages, which only matters for setups that use the userspace IPsec backend rather than kernel XFRM. For most Linux deployments using kernel IPsec, this group will be largely silent. The wording is acceptable as a hint but not strictly accurate.
- Verbosity level 4 (`private`) logs sensitive material including key material; this is appropriate to call out as "most verbose" as the post does, but readers should be cautioned not to share level 4 logs publicly. Worth noting in a future revision.
- The post uses the legacy `ipsec` / stroke command interface. Modern strongSwan deployments are increasingly migrating to `swanctl`/vici. The `ipsec` command set is still supported and shipped on most distributions, so the post remains accurate for current installations, but a future revision could mention the swanctl equivalents (`swanctl --log`, `swanctl --initiate --child <name>`, etc.).
- The illustrative log message snippets (e.g., "no IKE proposal found", "authentication failed, invalid certificate signature") are paraphrased rather than verbatim quotes from strongSwan source. The exact wording in the daemon may differ slightly across versions, but the strings shown are representative of what `grep`-style searches would match.
- The systemd unit name `strongswan` matches Debian/Ubuntu conventions; on some distributions (e.g., RHEL/Fedora variants) the unit may be `strongswan-swanctl` or `strongswan-starter`. Not a defect but a minor portability caveat.
