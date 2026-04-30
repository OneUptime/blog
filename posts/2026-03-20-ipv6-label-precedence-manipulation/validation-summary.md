# Validation Summary: How to Manipulate IPv6 Label and Precedence Values

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv6 address selection on Linux
- RFC 6724 policy concepts
- `iproute2` `ip addrlabel`
- glibc `gai.conf`
- systemd
- Python `socket`
- Bash

## Sources Consulted
- RFC 6724: Default Address Selection for Internet Protocol Version 6 (IPv6) - https://www.rfc-editor.org/rfc/rfc6724
- `ip-addrlabel(8)` iproute2 man page - https://manpages.debian.org/testing/iproute2/ip-addrlabel.8.en.html
- `gai.conf(5)` glibc man page - https://man.archlinux.org/man/gai.conf.5.en
- Linux kernel `net/ipv6/addrlabel.c` default table reference - https://codebrowser.dev/linux/linux/net/ipv6/addrlabel.c.html
- Local system references used to confirm current Linux behavior: `ip addrlabel list`, `man gai.conf`, `man ip-addrlabel`, `/etc/gai.conf`, `glibc 2.39`

## Issues Found
- The post listed RFC-style default label values as if they were Linux defaults. Linux kernel defaults differ, including `fc00::/7` as label `5` and additional entries such as `::/96`, `fec0::/10`, and `2001:10::/28`. I updated the default-label example to match Linux kernel behavior.
- The example prefix `2001:db8:cdn::/48` was not valid IPv6 because `cdn` is not hexadecimal. I replaced it with the valid documentation prefix `2001:db8:cd0::/48` everywhere it appeared.
- After correcting the Linux default table, the custom destination label still used `13`, which would not match Linux's default ULA label. I changed that example to use label `5` so the stated ULA-matching behavior is correct on Linux.
- The post said `ip addrlabel flush` restores defaults. The `ip-addrlabel(8)` documentation states that `flush` does not restore any default settings. I corrected the explanation and replaced the systemd example's `flush` usage with explicit `add` and `del` commands for the custom prefixes.
- The `gai.conf` example only duplicated part of the label and precedence tables. Because any `label` or `precedence` line disables the built-in defaults, that would unintentionally alter other policy entries. I expanded the example to include the full default tables before the custom precedence override.
- Several claims were too absolute for RFC 6724 behavior, such as implying labels "force" a source choice, precedence makes a prefix "always" first, or ULA sources should never be selected for global destinations. I rewrote those lines to describe preference behavior accurately.
- The Bash test script used invalid parameter expansion `${dest:<30}`. I replaced it with a valid `printf` format string.

## Review Notes
- `gai.conf` affects glibc `getaddrinfo()` destination sorting. Applications that do not use `getaddrinfo()` or that implement their own address-selection logic may not follow these rules exactly.
- The examples use documentation prefixes from `2001:db8::/32`, so the connection tests are illustrative and depend on the host having suitable routing and source addresses configured.
