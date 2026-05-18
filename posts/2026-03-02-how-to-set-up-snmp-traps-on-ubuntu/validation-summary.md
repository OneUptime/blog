# Validation Summary: How to Set Up SNMP Traps on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Net-SNMP (`snmptrapd`, `snmpd`, `snmptrap`, `snmpget`, `net-snmp-create-v3-user`)
- SNMPv1, SNMPv2c, SNMPv3 (traps and informs)
- Ubuntu packaging (`snmpd`, `snmptrapd`, `snmp`, `snmp-mibs-downloader`, `snmptt`, `libsnmp-perl`)
- systemd unit overrides
- SNMPTT (SNMP Trap Translator) with MySQL backend
- Cisco IOS snmp-server CLI

## Sources Consulted
- Net-SNMP `snmptrapd.conf` manpage — http://www.net-snmp.org/docs/man/snmptrapd.conf.html
- Net-SNMP `snmpd.conf` manpage — http://www.net-snmp.org/docs/man/snmpd.conf.html
- Net-SNMP `snmptrap` manpage — http://www.net-snmp.org/docs/man/snmptrap.html
- Net-SNMP `net-snmp-create-v3-user` manpage — https://manpages.ubuntu.com/manpages/jammy/man1/net-snmp-create-v3-user.1.html
- SNMPTT documentation — https://snmptt.org/docs/snmptt.shtml
- Ubuntu 24.04 package metadata: `snmpd 5.9.4+dfsg-1.1ubuntu3.2`, `snmptrapd 5.9.4+dfsg-1.1ubuntu3.2`, `snmptt 1.5-1`, `snmp-mibs-downloader 1.6` (verified via local `apt-cache show`)
- Debian `snmptt` package file list (confirms `/etc/snmp/snmptt.ini`)

## Issues Found

1. **`snmptrapd` packaging claim was wrong.** The post said "snmptrapd is part of the snmpd package on Ubuntu" and only installed `snmpd snmp snmp-mibs-downloader`. On current Ubuntu (24.04, net-snmp 5.9.4), `snmptrapd` is shipped as its own package and must be installed explicitly. Fixed the `apt install` line to include `snmptrapd` and rewrote the accompanying comment.

2. **Nonexistent default-handler binary.** The basic config listed `traphandle default /usr/sbin/snmptrapd-default-handler`. No such binary ships with net-snmp or the snmpd/snmptrapd packages; this line would just produce errors. Removed it (the misleading "# Log traps to syslog" comment was already covered by the existing `logOption s`).

3. **SNMPv3 user creation procedure was wrong.** The post called `net-snmp-create-v3-user` and claimed it "adds to `/var/lib/snmp/snmptrapd.conf` automatically." That utility writes to `/var/lib/snmp/snmpd.conf` (i.e., the **agent's** persistent state), not the trap daemon's, so the resulting user is not usable by `snmptrapd`. Replaced the procedure with the documented approach: stop `snmptrapd`, append a `createUser` line to `/var/lib/snmp/snmptrapd.conf`, then restart so the daemon hashes the keys.

4. **`snmptrap -v 3` mislabeled as inform.** The SNMPv3 test command was commented "Send a test SNMPv3 inform" but used `snmptrap` without `-Ci`, which actually sends a TRAP-PDU. Added `-Ci` and a short note that informs are preferable for v3 (engine-ID discovery works automatically). This also avoids the v3-trap engine-ID requirement that would otherwise have made the example fail against a fresh receiver.

5. **`forward ... -c <community>` syntax invalid.** The `snmptrapd.conf` `forward` directive's documented syntax is `forward OID|default DESTINATION`; it does not accept a `-c` flag. Removed that example and added a one-line note that to rewrite credentials you call `snmptrap` from a `traphandle` script instead.

6. **`trapsink`/`informsink` mislabeled as SNMPv3.** In the snmpd.conf example, `trapsink 10.0.0.100 trapuser` was shown under "Or for SNMPv3." Per the snmpd.conf manpage, `trapsink` is SNMPv1, `trap2sink` is SNMPv2c traps, `informsink` is SNMPv2c informs, and `trapsess` is the only directive that supports SNMPv3. Replaced with a correct `trapsess` example (including `-e` engine ID) and added a follow-up paragraph explaining the engine-ID requirement and the inform alternative.

7. **`snmptt.ini` path.** The post pointed to `/etc/snmptt.ini`. The Debian/Ubuntu `snmptt` package installs the config at `/etc/snmp/snmptt.ini`. Corrected the path with a parenthetical noting it is the distro-packaged location.

## Review Notes

- The trap handler script's comment says "Second line: IP address of sender." snmptrapd actually writes the full transport string on that line (e.g., `UDP: [127.0.0.1]:36123->[127.0.0.1]:162`), not just an IP. The script still works because it stores the line verbatim, so I left it. A future revision could parse the IP out of that string for cleaner logging.
- The basic `snmptrap -v 2c` example uses `t 0` (TimeTicks) for the `.1.3.6.1.2.1.1.3.0` varbind, which is syntactically valid but slightly unusual since snmptrapd already prepends sysUpTime; harmless and left as-is.
- The Cisco IOS `snmp-server enable traps` invocation enables all available trap categories on the device; on production gear operators usually scope this (e.g., `snmp-server enable traps bgp`). Not wrong, just broad.
- `linkUpDownNotifications yes` is correct for snmpd.conf but only triggers if snmpd is also monitoring those interfaces; on minimal default configs you may need `iquerySecName` set up for it to actually emit. Out of scope of the post.
