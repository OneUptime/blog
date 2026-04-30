# Validation Summary: How to Configure IDS/IPS Sensor Placement for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 network security monitoring
- IDS/IPS sensor placement
- Suricata
- Zeek
- Wazuh
- `tcpdump`
- `iptables` / `ip6tables`
- IPv6 transition mechanisms: Teredo, 6in4, ISATAP

## Sources Consulted
- Suricata IPS/NFQUEUE documentation: https://docs.suricata.io/en/suricata-8.0.4/ips/setting-up-ipsinline-for-linux.html
- Suricata quickstart and `af-packet` guidance: https://docs.suricata.io/en/suricata-7.0.3/quickstart.html
- Suricata `suricata.yaml` / decoder documentation: https://docs.suricata.io/en/suricata-6.0.19/configuration/suricata-yaml.html
- Suricata EVE/stats reference for tunnel decoders: https://docs.suricata.io/en/suricata-8.0.2/appendix/eve-index.html
- Zeek quickstart / ZeekControl usage: https://docs.zeek.org/en/stable/quickstart/
- Wazuh Linux agent deployment: https://documentation.wazuh.com/current/installation-guide/wazuh-agent/wazuh-agent-package-linux.html
- Wazuh `agent-auth` reference: https://documentation.wazuh.com/current/user-manual/reference/tools/agent-auth.html
- Wazuh manager `auth` IPv6 option: https://documentation.wazuh.com/current/user-manual/reference/ossec-conf/auth.html
- RFC 4380, Teredo: https://datatracker.ietf.org/doc/rfc4380/
- RFC 5214, ISATAP: https://datatracker.ietf.org/doc/rfc5214/
- RFC 6296, IPv6-to-IPv6 Network Prefix Translation (NPTv6): https://datatracker.ietf.org/doc/rfc6296/
- `pcap-filter(7)` reference: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `iptables-extensions(8)` reference: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local CLI help/output checked: `ss --help`, `iptables -h`, `ip6tables -h`, `tcpdump -d`

## Issues Found
- The introduction said IPv6 "eliminates NAT". I changed this to say IPv6 typically does not rely on NAT for address conservation, because IPv6 translation mechanisms such as NPTv6 still exist and the original wording was too absolute.
- The tunnel inspection section treated ISATAP as `udp port 41`. I changed the 6in4 and ISATAP examples to `ip proto 41` because both mechanisms ride over IPv4 protocol 41, while Teredo uses UDP port 3544.
- The tunnel blocking example used `ip6tables` and only logged traffic. I changed it to `iptables` LOG and DROP rules for UDP/3544 and protocol 41 because Teredo, 6in4, and ISATAP are encapsulated in IPv4 at the border, and the original example did not actually block anything.
- The Suricata Teredo note overstated decoder behavior. I changed it to reflect Suricata's documented behavior: Teredo decoding is enabled by default, but the decoder can misidentify some non-Teredo UDP traffic.
- The Wazuh enrollment example used an invalid manager value (`2001:db8::wazuh-manager`). I changed it to a valid IPv6 literal, switched `apt` to `apt-get` to match Wazuh's documented installation flow, and noted the repository / IPv6 manager prerequisites.
- The ASCII architecture diagram labeled Sensor 3 as east-west while the section and conclusion described DMZ inline placement. I aligned the diagram label with the rest of the article.

## Review Notes
- `agent-auth` is still a valid Wazuh tool, but Wazuh documentation notes that automatic enrollment during installation is the default workflow since Wazuh 4.0.
- The post uses `iptables` / `ip6tables` examples, which are still valid on current Linux systems, including the nftables-backed xtables compatibility layer. Teams using native `nft` syntax may want equivalent examples in a future revision.
