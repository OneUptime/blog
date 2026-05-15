# Validation Summary: How to Create Custom fapolicyd Trust Rules on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- fapolicyd
- fapolicyd trust database
- fapolicyd rule files
- fagenrules
- systemd journal

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Blocking and allowing applications by using fapolicyd": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- fapolicyd-cli(8) man page mirror: https://www.mankier.com/8/fapolicyd-cli
- fapolicyd.rules(5) man page mirror: https://www.mankier.com/5/fapolicyd.rules
- fapolicyd.trust(5) man page mirror: https://www.mankier.com/5/fapolicyd.trust
- fagenrules(8) man page mirror: https://www.mankier.com/8/fagenrules

## Issues Found
- The opening claim said any binary not in the trust database will be blocked. This was too broad because fapolicyd decisions are made from the active rules and object trust state. I changed it to say binaries not allowed by active rules or the trust database can be blocked.
- The custom SHA-256 rule placed `sha256hash` on the subject side and combined it with `path` on the object side. fapolicyd rule syntax separates subject and object with `:`, and file hashes are object attributes. I changed the example to match the Red Hat-documented form using a trusted bash subject and a `sha256hash` object condition.
- The rule-loading step restarted fapolicyd without compiling the component files in `/etc/fapolicyd/rules.d/`. I changed it to run `fagenrules --check`, `fagenrules --load`, and `fapolicyd-cli --reload-rules`.
- The verification command used `fapolicyd-cli --check-path /opt/myapp/bin/myapp`, but `--check-path` checks the `PATH` environment against the trust database, not an arbitrary file path. I replaced it with executing the target binary and added `fapolicyd-cli --check-trustdb` for trust database mismatch checks.

## Review Notes
The trust-file examples, `fapolicyd-cli --file add`, directory trust addition, manual trust-file format, `fapolicyd-cli --update`, `fapolicyd-cli --list`, and journal inspection commands are consistent with the referenced documentation. Red Hat recommends using `fapolicyd.trust` or `trust.d/` for basic trust additions because it is better for performance than custom allow rules.
