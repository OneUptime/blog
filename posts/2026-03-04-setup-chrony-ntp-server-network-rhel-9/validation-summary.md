# Validation Summary: How to Set Up a chrony NTP Server for Your Network on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- chrony / chronyd
- Network Time Protocol (NTP)
- firewalld
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring basic system settings": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_basic_system_settings/index
- chrony 4.7 chrony.conf(5) manual: https://chrony-project.org/doc/4.7/chrony.conf.html
- chrony 4.7 chronyc(1) manual: https://chrony-project.org/doc/4.7/chronyc.html
- firewalld service documentation: https://firewalld.org/documentation/service/options.html
- RFC 5905, Network Time Protocol Version 4: https://www.rfc-editor.org/rfc/rfc5905

## Issues Found
- The redundant server section recommended symmetric `peer` associations for production. chrony documents `peer` as valid, but notes that symmetric mode is less secure and recommends two separate client/server associations when two hosts should synchronize with each other. I changed the examples from `peer` to reciprocal `server ... iburst` entries and updated the related text and diagram label.
- The rate limiting example used `ratelimit interval 1 burst 16` while describing an average of 1 request per second. chrony's `interval` value is expressed as a power of 2 seconds, so `interval 1` means 2 seconds. I changed the directive to `ratelimit interval 0 burst 16` to match the explanation.

## Review Notes
- The `allow`, `deny`, `local stratum`, `keyfile`, `server ... key`, `makestep`, `rtcsync`, `log`, and `pool ... maxsources` examples match chrony configuration syntax.
- The `chronyc sources`, `chronyc tracking`, and `chronyc clients` commands are valid. The `clients` command reports clients recorded in chrony's client log.
- The firewall commands are appropriate for opening the standard NTP service, which uses UDP port 123.
