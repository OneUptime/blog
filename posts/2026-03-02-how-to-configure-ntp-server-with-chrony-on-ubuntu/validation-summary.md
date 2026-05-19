# Validation Summary: How to Configure NTP Server with chrony on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- chrony / chronyd / chronyc
- Network Time Protocol (NTP)
- DNS SRV records
- UFW and iptables firewall rules
- logrotate

## Sources Consulted
- Ubuntu Server documentation: How to serve the Network Time Protocol with Chrony - https://ubuntu.com/server/docs/how-to/networking/serve-ntp-with-chrony/
- Ubuntu Server documentation: About time synchronisation - https://ubuntu.com/server/docs/explanation/networking/about-time-synchronisation/
- chrony chrony.conf(5) manual, version 4.7 - https://chrony-project.org/doc/4.7/chrony.conf.html
- chrony chronyc(1) manual, version 4.7 - https://chrony-project.org/doc/4.7/chronyc.html
- chrony FAQ: ntpdate mode / chronyd -q and -Q - https://chrony-project.org/faq.html
- Cloudflare Time Services NTP documentation - https://developers.cloudflare.com/time-services/ntp/
- Google Public NTP FAQ and Leap Smear documentation - https://developers.google.com/time/faq and https://developers.google.com/time/smear
- RFC 4085: Embedding Globally-Routable Internet Addresses Considered Harmful - https://www.rfc-editor.org/rfc/rfc4085
- RFC 5905: Network Time Protocol Version 4 - https://www.rfc-editor.org/rfc/rfc5905

## Issues Found
- The server configuration mixed `time.google.com` with `pool.ntp.org` and `time.cloudflare.com`. Google Public NTP uses leap smearing while Cloudflare documents that it does not, and Cloudflare warns against mixing smeared and non-smeared time sources. Removed `time.google.com` from the active example and added a note not to mix leap-second policies.
- The server access-control example used `deny all` after `allow` rules and then tried to allow localhost. chrony's `deny all` has broad overriding behavior, and hosts are denied by default unless allowed. Removed the explicit `deny all` and localhost NTP `allow` lines from the server example.
- The firewall example opened TCP port 123 with iptables. NTP uses UDP port 123 for this configuration. Removed the TCP rule.
- The verification examples used `ntpdate`, which is deprecated, and treated `chronyc -h` as an NTP query test. Replaced the `ntpdate` check with `chronyd -Q 'server ... iburst'` and clarified that remote `chronyc` monitoring requires `cmdallow` and UDP port 323.
- The access-control explanation incorrectly implied that `allow` is for monitoring-only queries and that clients can send clock modifications to the server. Rewrote that block to distinguish NTP client access (`allow`) from chronyc monitoring access (`cmdallow`) and from full chronyc control.
- The monitoring section said chrony does not track client connections like ntpd by default. chrony normally logs client accesses and exposes them through `chronyc clients` unless disabled. Replaced the comment with the correct command.
- The DNS section implied ordinary chrony clients could use the shown SRV records directly as a server address. Clarified that SRV records are for SRV-aware clients and that chrony should use explicit server hostnames or A/AAAA records.

## Review Notes
- The tutorial remains technically valid as a practical Ubuntu chrony NTP-server guide after the fixes.
- `local stratum 10` is valid, but in future revisions it would be worth explaining the operational risk of serving local time when upstream synchronization is lost.
