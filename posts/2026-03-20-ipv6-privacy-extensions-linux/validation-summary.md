# Validation Summary: How to Configure IPv6 Privacy Extensions on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv6 SLAAC
- IPv6 privacy extensions
- Linux `sysctl`
- NetworkManager
- systemd-networkd
- `iproute2`
- `curl`

## Sources Consulted
- RFC 8981, "Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6": https://www.rfc-editor.org/rfc/rfc8981
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- NetworkManager `nm-settings-nmcli(5)` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager `NetworkManager.conf(5)` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html
- `systemd.network(5)` reference: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- `curl` man page (`--write-out` / `local_ip`): https://curl.se/docs/manpage.html
- Local CLI help output for `ip address`, `ip route`, and `networkctl`

## Issues Found
- The introduction overstated the privacy guarantee by saying privacy extensions "prevent" tracking. RFC 8981 says they limit the window for address-based correlation, so the wording was changed to "makes it harder" to track a device based solely on its IPv6 address.
- The persistent sysctl examples set `temp_prefered_lft` and `temp_valid_lft` only under `net.ipv6.conf.all`. I added matching `net.ipv6.conf.default.*` entries so newly created interfaces inherit the same temporary-address lifetime settings, consistent with the rest of the article's global/default configuration pattern and NetworkManager's documented fallback behavior.
- The `systemd-networkd` example used invalid configuration keys and sections: `[IPv6]`, `Privacy=yes`, and `AddressGenerationMode=stable-privacy` are not the correct `systemd.network` settings for this use case. I replaced them with `IPv6PrivacyExtensions=yes` in `[Network]` and `Token=prefixstable` in `[IPv6AcceptRA]`, which match the documented systemd-networkd syntax.
- The `systemd-networkd` verification command used `networkctl status eth0 | grep -i "privacy\\|temporary"`, which is not a reliable way to confirm temporary IPv6 addresses. I changed it to `ip -6 addr show dev eth0`, which directly shows `temporary` and related address flags.
- The address-regeneration note after `ip -6 addr flush dev eth0 dynamic` implied the interface would immediately request new SLAAC addresses. I corrected the note to say the addresses are recreated after the next Router Advertisement or after reconnecting/reconfiguring the interface.
- The "Checking Which Address Is Used" section claimed `traceroute6` shows the chosen local source address. That is not generally true. I replaced it with `curl -6 --write-out 'source=%{local_ip}\\n' ...`, which uses curl's documented `local_ip` write-out variable to report the actual local address chosen for the connection.

## Review Notes
- The kernel sysctl name `temp_prefered_lft` is intentionally spelled that way in Linux; it is not a typo in the post.
- In NetworkManager, temporary privacy addresses (`ipv6.ip6-privacy`) are distinct from stable privacy addresses (`ipv6.addr-gen-mode=stable-privacy`). The post now keeps those concepts separate.
- `Token=prefixstable` in `systemd-networkd` is an optional stable-SLAAC setting and depends on systemd support for that option on the reader's distro.
