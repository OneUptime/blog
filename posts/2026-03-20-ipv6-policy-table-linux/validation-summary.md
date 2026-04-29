# Validation Summary: How to Configure the IPv6 Policy Table on Linux

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Linux IPv6 address selection
- glibc `getaddrinfo()` and `/etc/gai.conf`
- `iproute2` `ip addrlabel`
- `systemd-networkd`
- RFC 6724 IPv6 default address selection

## Sources Consulted
- RFC 6724: Default Address Selection for Internet Protocol Version 6 (IPv6) - https://www.rfc-editor.org/rfc/rfc6724
- `gai.conf(5)` Linux manual page - https://man7.org/linux/man-pages/man5/gai.conf.5.html
- `ip-addrlabel(8)` Linux manual page - https://man7.org/linux/man-pages/man8/ip-addrlabel.8.html
- `systemd.network(5)` official documentation - https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- Local system documentation used to confirm behavior on the review host: `man 5 gai.conf`, `man 8 ip-addrlabel`, `man 5 systemd.network`, `ip addrlabel list`, and the shipped `/etc/gai.conf` comments

## Issues Found
- The post said the kernel addrlabel table mainly affects "raw socket operations." I changed this to explain that it affects kernel source-address selection when the application does not bind a source address explicitly, which matches RFC 6724's split between destination sorting in `getaddrinfo()` and source selection in the network stack.
- The `strace` example did not actually validate `getaddrinfo()` ordering, because the example only called `getaddrinfo()` and never attempted a `connect()`. I replaced it with a Python snippet that prints the actual ordered results returned by `getaddrinfo()`.
- The `gai.conf` section omitted a critical glibc rule: once any `label` or `precedence` entry is present, the built-in defaults for that category are no longer used. I added that explanation and expanded the IPv4-preference example so it duplicates the full table instead of unintentionally dropping entries.
- The ULA example hard-coded label `13` as if it were the typical Linux kernel label. That value comes from the RFC 6724 policy table, but Linux kernel addrlabel defaults vary and only label equality matters. I reworked the example to use an explicit custom label `99` for `fd00::/8` in both the kernel addrlabel table and `/etc/gai.conf`.
- The prefix `2001:db8:cdn::/48` was not valid IPv6 syntax. I replaced it with the documentation prefix `2001:db8:100::/48`.
- The `ip addrlabel flush` section incorrectly said flushing restores defaults. I corrected it to state that `flush` removes the current table and does not restore default settings, matching `ip-addrlabel(8)`.
- The `systemd-networkd` persistence example used `[IPv6RoutePrefix]`, which is for Router Advertisement route announcements, not persistent kernel address labels. I replaced it with the documented `[IPv6AddressLabel]` section.
- The conclusion said `/etc/gai.conf` changes take effect immediately for new `getaddrinfo()` calls. I refined this to note that new processes see the change immediately, while long-running processes usually need a restart unless `reload yes` is enabled.

## Review Notes
- The post now uses an explicit RFC 6724-style `gai.conf` example rather than implying that these are the built-in Linux/glibc defaults. Actual shipped defaults vary by libc, kernel, and distro.
- `reload yes` in `gai.conf` exists, but the man page documents it as generally a bad idea for multithreaded applications.
- `[IPv6AddressLabel]` in `systemd-networkd` is version-dependent and is documented as added in systemd 234, so very old systems may need a different persistence mechanism.
