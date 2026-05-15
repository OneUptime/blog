# Validation Summary: How to Secure BIND DNS with TSIG Keys for Zone Transfers on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- BIND 9
- TSIG
- DNS zone transfers
- `named.conf`
- `tsig-keygen`
- `dig`
- `rndc`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring zone transfers among BIND DNS servers": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/managing_networking_infrastructure_services/assembly_configuring-zones-on-a-bind-dns-server_assembly_setting-up-and-configuring-a-bind-dns-server
- BIND 9 Administrator Reference Manual, TSIG setup and key usage: https://bind9.readthedocs.io/en/v9.16.21/advanced.html#tsig
- BIND 9 Configuration Reference, `key`, `server`, `allow-transfer`, `also-notify`, and `masters`/`primaries` syntax: https://bind9.readthedocs.io/en/v9.20.2/reference.html
- BIND 9 manual pages for `dig -k`: https://bind9.readthedocs.io/en/v9.20.0/manpages.html
- RFC 8945, Secret Key Transaction Authentication for DNS (TSIG): https://www.rfc-editor.org/rfc/rfc8945

## Issues Found
- The post described TSIG as encrypting DNS communications. TSIG authenticates DNS transactions and provides integrity protection, but it does not encrypt zone data. Updated the description and explanation to remove the encryption claim and explicitly state that zone data is not encrypted.
- The introduction mentioned source IP spoofing as a primary reason an attacker could pull zone data. Since BIND zone transfers normally use TCP and successful IP spoofing is not the main practical concern in that setup, updated the wording to focus on access to the network or an allowed host.
- The conclusion said TSIG eliminates the risk of unauthorized zone transfers. Updated this to "greatly reduces" because TSIG depends on protecting the shared secret and does not remove every operational risk.

## Review Notes
- The commands and BIND configuration snippets are valid for the documented use case. Red Hat's RHEL 9 documentation still shows `masters` and `type slave`, while newer BIND documentation also recognizes current `primary`/`secondary` terminology and notes that `masters` remains accepted as a synonym for `primaries`.
- The secondary example uses a `server` statement to sign requests sent to the primary, which is valid. Red Hat's documentation commonly shows the key directly in the `masters` block instead; either approach can authenticate zone transfer requests to the primary.
