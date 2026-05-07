# Validation Summary: How to Configure Apache mod_rpaf to Pass Real Client IPv4 Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server
- `mod_rpaf`
- `mod_remoteip`
- `mod_status`
- `mod_authz_core`
- Debian/Ubuntu package management (`apt`, `a2enmod`)
- CentOS/RHEL package management (`yum`)
- PHP

## Sources Consulted
- Apache `mod_remoteip` documentation: https://httpd.apache.org/docs/current/en/mod/mod_remoteip.html
- Apache `mod_authz_core` documentation: https://httpd.apache.org/docs/2.4/mod/mod_authz_core.html
- Apache `mod_status` documentation: https://httpd.apache.org/docs/current/mod/mod_status.html
- Apache `mod_log_config` documentation: https://httpd.apache.org/docs/current/en/mod/mod_log_config.html
- Debian package details for `libapache2-mod-rpaf`: https://packages.debian.org/bookworm/libapache2-mod-rpaf
- Debian package file list for `libapache2-mod-rpaf`: https://packages.debian.org/trixie/armhf/libapache2-mod-rpaf/filelist
- Debian source `README` for `libapache2-mod-rpaf`: https://sources.debian.org/src/libapache2-mod-rpaf/0.6-14/README
- Debian source `httpd-rpaf.conf-template`: https://sources.debian.org/src/libapache2-mod-rpaf/0.6-14/httpd-rpaf.conf-template
- `gnif/mod_rpaf` project README: https://github.com/gnif/mod_rpaf
- `gnif/mod_rpaf` `Makefile`: https://github.com/gnif/mod_rpaf/blob/stable/Makefile

## Issues Found
- The Debian/Ubuntu section installed the distro package `libapache2-mod-rpaf`, but the configuration block used the newer underscore directive names from the separate `gnif/mod_rpaf` fork. I changed the Debian/Ubuntu configuration example to the packaged directive names: `RPAFenable`, `RPAFproxy_ips`, `RPAFheader`, and `RPAFsethostname`.
- The original Debian/Ubuntu config path used `/etc/apache2/conf-available/rpaf.conf` plus `a2enconf rpaf`. The Debian package already ships `/etc/apache2/mods-available/rpaf.conf`, so the original instructions risked duplicating or conflicting with the packaged module config. I changed the path to `/etc/apache2/mods-available/rpaf.conf` and removed the `a2enconf rpaf` step.
- The original trusted-proxy example used CIDR ranges in the Debian/Ubuntu config block. The packaged Debian/Ubuntu `mod_rpaf` documentation shows exact proxy IPs, not CIDR notation, so I replaced the example with explicit proxy IP addresses.
- The original `RPAF_SetHostName` explanation incorrectly said it controlled whether the rightmost or leftmost `X-Forwarded-For` address was used. In the documented `mod_rpaf` implementations consulted, that directive controls hostname/vhost handling, not IP-selection order. I corrected the comment and made the setting explicitly optional.
- The CentOS/RHEL source-install snippet omitted required tooling for the shown commands (`git` and `make`), hard-coded the module path, and did not restart `httpd` after loading the module. I added the missing packages, changed the `LoadModule` example to use `apxs -q LIBEXECDIR`, and added the restart step.
- The Apache 2.4 access-control example combined `Require ip` and `Require valid-user` in one section without an authorization container. Apache 2.4 treats multiple `Require` lines in the same section as an implicit `<RequireAny>`, which would authorize on either condition instead of both. I wrapped the directives in `<RequireAll>` and completed the Basic Auth example with `AuthBasicProvider` and `AuthUserFile`.
- The temporary `mod_status` verification snippet lacked access restriction. I added `Require local` so the example does not expose the status handler broadly.
- The `mod_remoteip` alternative example trusted an entire private subnet. I narrowed the example to explicit proxy IPs to match the rest of the post's security guidance.

## Review Notes
- `mod_remoteip` remains the preferred built-in option on Apache 2.4+ and is the better long-term choice for new deployments.
- `mod_rpaf` is still technically relevant because Debian and Ubuntu continue to package it, but the distro package uses legacy directive names while the `gnif/mod_rpaf` fork uses newer underscore-style directives. Mixing those two syntaxes is the main compatibility risk for this topic.
