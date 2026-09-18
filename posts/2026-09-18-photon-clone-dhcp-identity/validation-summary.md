# Validation Summary: How to Stop a Cloned Photon OS VM from Reusing Its DHCP Identity

## Status
validated

## Post Type
Technical troubleshooting and VM template preparation guide.

## Technologies Covered
- Photon OS and VMware vSphere VM cloning.
- systemd machine IDs, systemd-networkd, and networkctl.
- DHCP client identifiers, DUIDs, and IAIDs.
- Linux iproute2 and Bash commands.
- cloud-init, NoCloud instance metadata, and SSH host keys.

## Sources Consulted
- [Photon OS 5 cloning guidance](https://vmware.github.io/photon/docs-v5/administration-guide/managing-network-configuration/clearing-the-machine-id-of-a-cloned-instance-for-dhcp/): machine-ID-derived DHCP identity and clearing the file.
- [Photon OS predictable interface names](https://vmware.github.io/photon/docs-v5/administration-guide/managing-network-configuration/using-predictable-network-interface-names/): alternatives to eth0 naming.
- [systemd machine-id manual source, v252](https://github.com/systemd/systemd/blob/v252/man/machine-id.xml): boot initialization, D-Bus fallback, symlinks, and empty-file semantics.
- [systemd.network manual source, v252](https://github.com/systemd/systemd/blob/v252/man/systemd.network.xml): network configuration paths, ClientIdentifier, DUIDRawData, and IAID.
- [networkd.conf manual source, v252](https://github.com/systemd/systemd/blob/v252/man/networkd.conf.xml) and [configuration precedence documentation](https://github.com/systemd/systemd/blob/v252/man/standard-conf.xml): DUID generation, overrides, and drop-in locations.
- [networkctl manual source, v252](https://github.com/systemd/systemd/blob/v252/man/networkctl.xml): status command and interface selection.
- [systemd halt/poweroff manual source, v252](https://github.com/systemd/systemd/blob/v252/man/halt.xml): normal system shutdown commands.
- [iproute2 ip manual source](https://github.com/iproute2/iproute2/blob/main/man/man8/ip.8): brief link and address output.
- [RFC 4361](https://www.rfc-editor.org/rfc/rfc4361.html): DHCPv4 client identifiers incorporating IAID and DUID.
- [cloud-init 24.2 NoCloud documentation source](https://github.com/canonical/cloud-init/blob/24.2/doc/rtd/reference/datasources/nocloud.rst) and [current NoCloud reference](https://docs.cloud-init.io/en/latest/reference/datasources/nocloud.html): instance metadata and instance-ID-based first-boot detection.
- [cloud-init CLI reference](https://docs.cloud-init.io/en/latest/reference/cli.html): clean, per-subcommand help, cleanup effects, and machine-ID handling.
- [cloud-init SSH module reference](https://docs.cloud-init.io/en/latest/reference/modules.html#ssh): per-instance host-key deletion and generation.

## Issues Found
1. The diagnostic command assumed the interface was named eth0. Added an instruction to substitute the actual name reported by ip -br link, because Photon supports other interface naming policies.
2. The identifier search covered only /etc configuration. Expanded it to include runtime and vendor network files and networkd drop-ins under /run, /usr/lib, and /usr/local/lib. These are documented configuration sources and can contain an explicit identity override missed by the original search. The expansion uses Bash brace syntax, consistent with the code block's language.

## Review Notes
- Confirmed the central diagnosis: different MAC addresses can coexist with shared DHCP identity, and a duplicated machine ID can produce the same default networkd DUID. DHCPv4 client identity may include both IAID and DUID, so matching machine IDs alone does not establish an active lease collision.
- The empty-file preparation, immediate shutdown, D-Bus fallback check, and independently booted clone verification are technically sound. Truncation does not replace the running system's cached identity; reboot is necessary.
- An empty machine-id permits identity initialization but does not trigger systemd's ConditionFirstBoot semantics. This is separate from cloud-init instance detection, as the post explains. Current cloud-init clean --machine-id uses an uninitialized marker; the article appropriately tells readers to consult their installed version's help.
- The expanded grep is an inspection aid, not a parser of effective configuration: it can display comments and overridden settings. Configuration precedence and the generating customization process still need to be considered.
- The linked Photon page was accessible. The linked freedesktop manual returned HTTP 403 and the cloud-init 24.2 page returned HTTP 429 during this review; equivalent official repository documentation was consulted. These responses alone do not establish broken links, so the original links were retained.
- All three Bash code blocks passed bash -n syntax validation, and validation.json was parsed successfully. No Photon VM, vSphere environment, or DHCP server was available for end-to-end execution; identity-changing and shutdown commands were not executed on the review host.
- Changes were limited to the two diagnostic corrections and the requested validation artifacts; the post's structure and core procedure were preserved.
