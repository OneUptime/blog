# Validation Summary: How to Use firewalld as an Alternative to UFW on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- firewalld
- firewall-cmd
- UFW
- systemd
- Linux firewall zones, services, ports, rich rules, XML service/zone definitions, logging, and panic mode

## Sources Consulted
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld predefined zones documentation: https://firewalld.org/documentation/zone/predefined-zones.html
- firewalld rich language manual: https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html
- firewalld zone file manual: https://firewalld.org/documentation/man-pages/firewalld.zone.html
- firewalld service file manual: https://firewalld.org/documentation/man-pages/firewalld.service.html
- firewalld direct interface manual: https://firewalld.org/documentation/man-pages/firewalld.direct.html
- firewalld configuration directories documentation: https://firewalld.org/documentation/configuration/directories.html
- Ubuntu Server firewall documentation: https://ubuntu.com/server/docs/how-to/security/firewalls/
- Local UFW manual/help output from `man ufw` and `ufw --help`

## Issues Found
- The zone model explanation said each network interface is assigned to a zone. firewalld can bind connections, interfaces, or sources to zones, and unassigned interfaces use the default zone. Updated the wording to match firewalld's documented model.
- The predefined zone list omitted `dmz` and `work`, which are part of firewalld's documented predefined zones. Added both entries.
- The interface assignment example used `--permanent` while the comment described a runtime assignment. Removed `--permanent` from the runtime example and left the separate permanent example intact.
- The direct rules section did not mention that firewalld's direct interface is deprecated and superseded by policies. Updated the heading and introduction to mark direct rules as deprecated and last-resort usage.

## Review Notes
The remaining commands and XML snippets were consistent with official firewalld documentation and Ubuntu/UFW documentation. Direct rules remain syntactically valid, but new configurations should prefer services, ports, rich rules, or policies because the direct interface is deprecated.
