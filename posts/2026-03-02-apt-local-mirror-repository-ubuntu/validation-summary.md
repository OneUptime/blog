# Validation Summary: How to Use APT with a Local Mirror Repository on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- APT and apt-get
- apt-cacher-ng
- Debian/Ubuntu APT source lists and deb822 `.sources` files
- nginx
- Ansible apt module
- netselect-apt

## Sources Consulted
- Ubuntu `sources.list(5)` manpage: https://manpages.ubuntu.com/manpages/noble/man5/sources.list.5.html
- Ubuntu `apt.conf(5)` manpage: https://manpages.ubuntu.com/manpages/noble/man5/apt.conf.5.html
- Ubuntu `apt-transport-http(1)` manpage: https://manpages.ubuntu.com/manpages/noble/man1/apt-transport-http.1.html
- Ubuntu `apt-transport-https(1)` manpage: https://manpages.ubuntu.com/manpages/noble/man1/apt-transport-https.1.html
- Ubuntu `apt-cacher-ng(8)` manpage: https://manpages.ubuntu.com/manpages/noble/man8/apt-cacher-ng.8.html
- Debian `netselect-apt(1)` manpage: https://manpages.debian.org/trixie/netselect-apt/netselect-apt.1.en.html
- Ubuntu Launchpad package page for `netselect-apt` in Jammy: https://launchpad.net/ubuntu/jammy/amd64/netselect-apt
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- nginx `ngx_http_autoindex_module` documentation: https://nginx.org/en/docs/http/ngx_http_autoindex_module.html
- nginx `ngx_http_headers_module` documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Local command verification with `apt-get --help`, `apt-cache policy`, `apt-cache show apt-cacher-ng`, `apt-cache madison`, `man apt.conf`, `man sources.list`, `man apt-transport-http`, and `man apt-transport-https`

## Issues Found
- The post described apt-cacher-ng as a transparent proxy and implied cached behavior for all package traffic. Changed this to "caching proxy" and clarified that normal caching applies to HTTP package downloads.
- The HTTPS proxy section implied apt-cacher-ng directly handles HTTPS repositories as cached traffic. Updated it to explain that HTTPS proxying tunnels encrypted traffic and is not cached unless apt-cacher-ng's HTTPS URL rewriting format is used.
- APT proxy configuration examples used uppercase `Acquire::HTTP` and `Acquire::HTTPS` scopes. Normalized them to the documented lowercase `Acquire::http` and `Acquire::https` scopes.
- The mirror selection section called `netselect-apt` an Ubuntu tool and used an Ubuntu release codename. Updated it to identify `netselect-apt` as Debian-specific for current releases and changed the example to use Debian `stable`.
- The multiple-URI fallback explanation overstated strict first-then-next behavior. Reworded it to match APT's source preference and fallback behavior.
- The verification section suggested checking `/var/log/apt/history.log` for update download URLs. Replaced it with checking the apt-cacher-ng access log, which is the relevant log for proxy verification.
- The `PassThroughPattern` examples were too broad or omitted the HTTPS CONNECT target port. Updated them to match host:port style HTTPS CONNECT targets, including a specific-domain example.

## Review Notes
The remaining examples are technically valid for the stated Ubuntu/Jammy-style repository layout, assuming the local mirror actually contains the listed suites and is signed by the Ubuntu archive key. For Ubuntu 24.04 and newer installs, `/etc/apt/sources.list.d/ubuntu.sources` is commonly used by default; Ubuntu 22.04 supports deb822 `.sources` files through APT, but not every third-party tool may handle deb822 equally well.
