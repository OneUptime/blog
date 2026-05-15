# Validation Summary: How to Write Firewalld Rich Rules for Fine-Grained Access Control on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- firewalld
- firewall-cmd
- firewalld rich rules
- nftables
- journald kernel logs

## Sources Consulted
- firewalld rich language manual: https://firewalld.org/documentation/man-pages/firewalld.richlanguage
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd
- Red Hat Enterprise Linux 9 Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/

## Issues Found
- Corrected the rich-rule syntax summary to use CLI rich-language syntax for negated source and destination matches (`not`) instead of XML-style `invert="true"`.
- Added `priority` and action-specific options to the syntax summary, including `reject type`, action `limit`, and `mark set`, so it matches the documented rich-language grammar more closely.
- Clarified the SSH rate-limiting example. A limit on an `accept` action only limits matches for that action; a broader SSH allow rule in the same zone could still allow traffic.
- Added `priority="32767"` to catch-all drop examples. Default-priority rich `drop` and `reject` rules are placed before default-priority `accept` rules, so a catch-all drop without a positive priority can shadow the allow rules it is meant to follow.
- Reworded the default reject comment because firewalld documents it as the default firewalld reject type rather than a specific ICMP unreachable type.
- Replaced `nft list ruleset | grep -A5 "rich"` with `nft list table inet firewalld`; generated nftables rules are not guaranteed to include the literal string `rich`.

## Review Notes
- Local runtime validation with `firewall-cmd` was not possible because firewalld is not installed in this workspace. The review relied on official firewalld and Red Hat documentation.
- The post is now technically valid for RHEL 9/firewalld rich-rule usage, but users should still validate permanent firewalld configuration with `firewall-cmd --check-config` and test from hosts that actually match the allowed and blocked source addresses.
