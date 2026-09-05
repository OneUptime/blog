# Validation Summary: How to Restore Console Access When CloudStack System VMs Are Running but Unreachable

## Status
validated

## Post Type
Technical troubleshooting guide with Linux commands and CloudStack API examples.

## Technologies Covered
- Apache CloudStack and CloudMonkey
- Console Proxy VMs, noVNC, WebSockets, and VNC
- KVM, QEMU, and libvirt
- Linux networking, SSH, iptables, and systemd
- DNS, TLS certificates, and reverse proxies

## Sources Consulted
- CloudStack System VM administration, console endpoints, SSL, diagnostics, and access: https://docs.cloudstack.apache.org/en/latest/adminguide/systemvm.html
- CloudStack KVM installation and firewall requirements: https://docs.cloudstack.apache.org/en/latest/installguide/hypervisor/kvm.html
- CloudStack API index: https://cloudstack.apache.org/api/
- CloudStack 4.22 listSystemVms: https://cloudstack.apache.org/api/apidocs-4.22/apis/listSystemVms.html
- CloudStack 4.22 listVirtualMachines: https://cloudstack.apache.org/api/apidocs-4.22/apis/listVirtualMachines.html
- CloudStack 4.22 createConsoleEndpoint: https://cloudstack.apache.org/api/apidocs-4.22/apis/createConsoleEndpoint.html
- Apache implementation confirming synchronous BaseCmd and introduction in 4.18: https://github.com/apache/cloudstack/blob/main/api/src/main/java/org/apache/cloudstack/api/command/user/consoleproxy/CreateConsoleEndpointCmd.java
- Official CloudMonkey repository and CLI usage: https://github.com/apache/cloudstack-cloudmonkey
- libvirt virsh command reference: https://libvirt.org/manpages/virsh.html
- libvirt QEMU driver: https://libvirt.org/drvqemu.html
- libvirt graphics XML: https://libvirt.org/formatdomain.html#graphical-framebuffers
- libvirt daemon architecture: https://libvirt.org/daemons.html
- libvirt QEMU driver configuration defaults: https://raw.githubusercontent.com/libvirt/libvirt/master/src/qemu/qemu.conf.in
- curl options and TLS verification: https://curl.se/docs/manpage.html
- Debian packaged command manuals:
  - https://manpages.debian.org/bookworm/manpages/getent.1.en.html
  - https://manpages.debian.org/bookworm/iproute2/ip.8.en.html
  - https://manpages.debian.org/bookworm/iproute2/ss.8.en.html
  - https://manpages.debian.org/bookworm/iptables/iptables-save.8.en.html
  - https://manpages.debian.org/bookworm/netcat-openbsd/nc.1.en.html
  - https://manpages.debian.org/bookworm/systemd/journalctl.1.en.html

## Issues Found
1. **Endpoint API described as read-only inventory and associated with an async event.** Reworded the introduction to distinguish inventory from endpoint generation and replaced the async-event instruction with management-log correlation. The API uses synchronous BaseCmd and has no async job ID. Added its 4.18 minimum version.
2. **Conditional API parameter omitted.** Added the requirement to supply `token` when extra console security validation is enabled. The original invocation remains valid for the ordinary flow.
3. **HTTPS probe could be mistaken for a complete console-path test.** Clarified that the shown HEAD request targets port 443 and does not perform a WebSocket upgrade. Readers must follow the actual endpoint scheme/port and verify the WebSocket in the browser.
4. **Only monolithic libvirt logs covered.** Added `virtqemud` to the journal query so it also covers modular QEMU daemon deployments. Repeated `-u` options select either unit's entries.
5. **VNC listen configuration and repair were incomplete.** Clarified that domain graphics settings can specify the listen address instead of inheriting the QEMU driver default. Explained that restarting the appropriate libvirt daemon does not reconfigure a running QEMU listener; an affected guest may need a CloudStack-managed stop/start and subsequent live configuration verification.

## Review Notes
- Confirmed the two-leg console model, guest-network independence, endpoint response fields, SSL port-selection conditions, System VM SSH access, diagnostics bundle, and recreation requirement for changed boot settings.
- Confirmed CloudMonkey API argument names, virsh inspection commands, Linux networking flags, curl flags, and the targeted netcat TCP check. Placeholder names and addresses require substitution in the deployment.
- The cited latest administration/install documentation resolved to 4.23 during review; explicit API checks used the published 4.22 reference. The post now identifies the endpoint API minimum version. Operators should use documentation matching their installed release and System VM template.
- The official load-balancing examples include legacy port mappings. The generated WebSocket options and actual TLS termination design must determine the deployed mapping; a successful frontend HEAD request alone is insufficient.
- All five links in the post resolved to relevant official resources. Some additional manual/source lookups initially failed; successful alternate official or distribution references are listed above.
- Shell blocks were checked with Bash syntax validation. JSON parsing and diff whitespace checks passed. No live CloudStack, CPVM, hypervisor, certificate replacement, guest restart, or migration was exercised; validation is based on documentation and source inspection, not a deployment integration test.
