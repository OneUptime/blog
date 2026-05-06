# Validation Summary: How to Compare Bonding vs Teaming on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- Linux bonding driver
- Network teaming (`teamd` / `libteam`)
- NetworkManager (`nmcli`)
- Netplan
- Link aggregation and redundancy

## Sources Consulted
- Linux kernel bonding documentation: https://docs.kernel.org/6.17/networking/bonding.html
- NetworkManager `nmcli` reference: https://www.networkmanager.dev/docs/api/latest/nmcli.html
- NetworkManager settings reference: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- NetworkManager `nmcli` examples: https://networkmanager.dev/docs/api/latest/nmcli-examples.html
- Red Hat Enterprise Linux 8, configuring a network bond: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/configuring-network-bonding_configuring-and-managing-networking
- Red Hat Enterprise Linux 8, configuring a NIC team: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/configuring-network-teaming_configuring-and-managing-networking
- Red Hat Enterprise Linux 9.2 release notes, deprecated functionality: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.2_release_notes/deprecated-functionality
- Red Hat Enterprise Linux 10, networking changes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/considerations_in_adopting_rhel_10/networking
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/

## Issues Found
- The post described teaming as generally current on RHEL/CentOS. I corrected this to reflect current Red Hat guidance: teaming is deprecated in RHEL 9 and removed in RHEL 10, while bonding is the recommended replacement.
- The `nmcli` teaming example used older `team-slave` style configuration and inline raw JSON. I updated it to current documented `nmcli` properties: `team.runner`, `team.link-watchers`, and Ethernet port profiles attached with `controller`.
- The bonding example used `master` in the port creation commands. I updated the example to current `controller` syntax used in current NetworkManager documentation and added an activation command.
- The comparison table claimed teaming supported ICMP monitoring and described runners as “pluggable”. I corrected this to the documented runner/link-watcher model: supported link watchers are `ethtool`, `arp_ping`, and `nsna_ping`, and runners are built-in teamd runner types rather than pluggable modules.
- The “Available Teaming Runners” section omitted documented runner types. I added `broadcast` and `random`, which are listed in current Red Hat and NetworkManager documentation.
- The code fences were labeled `json` while containing `//` comments, which is invalid JSON. I changed those annotated snippets to `jsonc` so the examples no longer misrepresent the format.
- The NS/NA example used `ff02::1` as the target host. I replaced it with a documented style of specific IPv6 target host example.
- The “When to Choose Teaming” and conclusion sections implied teaming was a current preferred RHEL option. I revised them to frame teaming as mainly relevant for legacy or compatibility-driven deployments.

## Review Notes
- Bonding remains the safer recommendation for new Linux deployments because it is broadly supported and still documented as the replacement path by Red Hat.
- Teaming can still matter in existing environments that already depend on `teamd` or its runner/link-watcher behavior, especially on older RHEL releases where it is still available.
