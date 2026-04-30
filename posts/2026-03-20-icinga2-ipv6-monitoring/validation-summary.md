# Validation Summary: How to Configure Icinga2 for IPv6 Monitoring

## Status
validated

## Post Type
Guide

## Technologies Covered
- Icinga 2
- Icinga Template Library (ITL)
- Monitoring Plugins
- IPv6
- ICMP
- HTTP service checks
- SSH service checks

## Sources Consulted
- Icinga 2 Object Types: https://icinga.com/docs/icinga-2/2.10/doc/09-object-types/
- Icinga 2 Monitoring Basics: https://icinga.com/docs/icinga-2/latest/doc/03-monitoring-basics/
- Icinga 2 CLI Commands: https://icinga.com/docs/icinga-2/2.10/doc/11-cli-commands/
- Icinga 2 API: https://icinga.com/docs/icinga-2/latest/doc/12-icinga2-api/
- Icinga 2 ITL (current snapshot): https://icinga.com/docs/icinga-2/snapshot/doc/10-icinga-template-library/
- Icinga 2 CHANGELOG: https://icinga.com/docs/icinga-2/latest/CHANGELOG/
- Monitoring Plugins `check_ping`: https://www.monitoring-plugins.org/doc/man/check_ping.html
- Monitoring Plugins `check_curl`: https://www.monitoring-plugins.org/doc/man/check_curl.html
- Monitoring Plugins `check_http`: https://www.monitoring-plugins.org/doc/man/check_http.html
- Monitoring Plugins `check_ssh`: https://www.monitoring-plugins.org/doc/man/check_ssh.html

## Issues Found
- Step 1 implied that enabling or changing the API listener is part of IPv6 monitoring setup. I corrected this to clarify that host and service checks do not require a separate global IPv6 switch, and that `bind_host` defaults to `::` when omitted on IPv6-capable systems.
- The post redefined `hostalive6`, but `hostalive6` is already a built-in ITL CheckCommand. I removed the custom definition and switched the section to use the built-in commands documented by Icinga.
- The HTTP example used a custom `check_http`-based command. `check_http` is deprecated by Monitoring Plugins, and current Icinga 2 releases provide a built-in `curl` CheckCommand. I replaced the HTTP-over-IPv6 example with the built-in `curl` command and explicit IPv6 variables.
- The IPv6 ICMP service used `hostalive6`, which is the host-check variant. I changed the service check to `ping6`, which is the correct built-in service-oriented command.
- The SSH IPv6 example set `ssh_address` but did not explicitly force the IPv6 address family. I added `vars.ssh_ipv6 = true` to make the example consistent with the documented SSH command variables.
- The validation step tried to `curl` an Icinga Web 2 HTML page to confirm host objects. I replaced this with the documented Icinga 2 API object query endpoint, which is the correct interface for verifying configuration objects.

## Review Notes
- The corrected HTTP examples assume a recent Icinga 2 release that includes the built-in `curl` CheckCommand. The Icinga 2 changelog shows this command was added in the 2.14 line. Older environments may still only have the older `http` CheckCommand available.
- The API example still uses `root:icinga` as documentation-style sample credentials; real deployments often use a different password or a different API user.
