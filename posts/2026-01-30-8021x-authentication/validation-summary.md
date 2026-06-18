# Validation Summary: How to Implement 802.1X Authentication

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- IEEE 802.1X port-based network access control
- RADIUS and FreeRADIUS 3.x
- EAP, EAP-TLS, PEAP, EAP-TTLS, EAP-FAST, and MSCHAPv2
- Active Directory, LDAP, Samba winbind, and ntlm_auth
- Cisco IOS/XE switch 802.1X and MAB configuration
- HPE/Aruba and Juniper switch 802.1X configuration
- Linux wpa_supplicant
- Windows Wired AutoConfig and netsh LAN profiles
- macOS configuration profiles and MDM
- Dynamic VLAN assignment and MAC Authentication Bypass
- MySQL-backed FreeRADIUS data and replication

## Sources Consulted
- RFC 3580: IEEE 802.1X RADIUS Usage Guidelines: https://datatracker.ietf.org/doc/html/rfc3580
- FreeRADIUS rlm_files documentation: https://networkradius.com/doc/current/raddb/mods-available/files.html
- FreeRADIUS users file and mods-config documentation: https://www.freeradius.org/documentation/freeradius-server/4.0.0/reference/raddb/mods-config/index.html
- FreeRADIUS LDAP module documentation: https://networkradius.com/doc/current/raddb/mods-available/ldap.html
- FreeRADIUS SQL module documentation: https://networkradius.com/doc/current/raddb/mods-available/sql.html
- wpa_supplicant example configuration documentation: https://android.googlesource.com/platform/external/wpa_supplicant_8/+/refs/tags/android-6.0.1_r73/wpa_supplicant/wpa_supplicant.conf
- Microsoft netsh LAN documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-lan
- Microsoft wired PEAP profile sample: https://learn.microsoft.com/en-us/windows/win32/nativewifi/peap-profile-sample
- Apple 802.1X First Active Ethernet payload documentation: https://developer.apple.com/documentation/devicemanagement/8021xfirstactiveethernet
- Cisco Catalyst 802.1X configuration documentation: https://www.cisco.com/en/US/docs/switches/lan/catalyst3850/software/release/3.2_0_se/multibook/configuration_guide/b_consolidated_config_guide_3850_chapter_0111000.html
- Juniper Junos 802.1X authenticator documentation: https://www.juniper.net/documentation/us/en/software/junos/user-access/topics/task/interfaces-configuring-the-authenticator.html
- MySQL replication user documentation: https://dev.mysql.com/doc/refman/8.2/en/replication-howto-repuser.html

## Issues Found
- The post pointed FreeRADIUS 3.x local users to `/etc/freeradius/3.0/users`. Updated references to `/etc/freeradius/3.0/mods-config/files/authorize`, which is the FreeRADIUS 3 default files-module authorization file.
- The Active Directory section implied LDAP/Kerberos configuration was sufficient for AD-backed PEAP/MSCHAPv2 authentication. Clarified that LDAP is for lookup/group authorization and that PEAP/MSCHAPv2 requires the FreeRADIUS MSCHAP path with AD integration such as winbind/ntlm_auth.
- The FreeRADIUS AD virtual server example forced `Auth-Type := ldap`, which is not correct for PEAP/MSCHAPv2 and is only suitable for LDAP bind/PAP-style authentication. Removed that forced authentication block and kept the example focused on LDAP lookup and group-based VLAN authorization.
- The LDAP group checks used `&LDAP-Group`; updated them to the conventional FreeRADIUS `LDAP-Group == ...` check form.
- The Windows wired profile XML only declared the PEAP EAP method and omitted the PEAP/MSCHAPv2 configuration block. Added the PEAP `Config` block and aligned namespaces with Microsoft's wired PEAP sample.
- The macOS section used `/usr/libexec/8021xd` as if it created an 802.1X configuration. Replaced that with System Settings/MDM guidance and added required configuration profile payload metadata.
- The macOS profile combined PEAP type 25 with `TTLSInnerAuthentication`, which applies to TTLS, not PEAP. Removed the mismatched key.
- The SQL-backed MAB example returned nonstandard columns from `authorize_check_query`. Updated the query to return FreeRADIUS SQL check-item columns and added a reply query that returns the VLAN tunnel attributes.
- The MySQL replication example used `GRANT ... IDENTIFIED BY`, which is outdated for current MySQL account management. Split it into `CREATE USER` followed by `GRANT REPLICATION SLAVE`.

## Review Notes
The vendor switch examples are syntax-family examples and still need adaptation to exact switch OS releases and platform capabilities. The Let's Encrypt certificate example is plausible, but production EAP deployments should test client trust behavior and private-key access carefully because 802.1X clients often enforce server name and trust-chain policies strictly.
