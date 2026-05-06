# Validation Summary: How to Configure HAProxy Stick Tables for IPv6 Clients

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- IPv6
- HAProxy stick tables
- HAProxy Runtime API / admin socket

## Sources Consulted
- HAProxy 3.2 Configuration Manual: https://docs.haproxy.org/3.2/configuration.html
- HAProxy 2.8 Configuration Manual: https://docs.haproxy.org/2.8/configuration.html
- HAProxy 2.4 Management Guide: https://docs.haproxy.org/2.4/management.html
- HAProxy stick tables tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/stick-tables/
- RFC 8981, Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6: https://www.rfc-editor.org/rfc/rfc8981

## Issues Found
- The `/64` section incorrectly said HAProxy does not natively support prefix tracking. I replaced that note with a native `ipmask(32,64)` stick-table example and kept the cookie-based alternative, because HAProxy documents `ipmask(<mask4>,[<mask6>])` for masked lookups and storage.
- The `bytes_in_rate(60s)` example was labeled as `1MB/s`, but HAProxy documents `bytes_in_rate(<period>)` as bytes per configured period, not bytes per second. I changed the example to `bytes_in_rate(1s)` so the `1000000` threshold matches the stated `1MB/s`.

## Review Notes
The remaining stick-table, tracking, ACL, and runtime socket examples are consistent with the current HAProxy manuals. The post's note about IPv6 privacy extensions affecting per-address tracking is consistent with RFC 8981.
