# Validation Summary: How to Make Audit Rules Immutable on RHEL for Tamper Resistance

## Status
validated

## Post Type
Technical tutorial / hardening guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux Audit subsystem
- auditd
- auditctl
- augenrules
- Audit rule configuration under `/etc/audit/rules.d/`

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- `auditctl(8)` Linux Audit userspace manual page: https://man7.org/linux/man-pages/man8/auditctl.8.html
- `augenrules(8)` Linux Audit userspace manual page: https://man7.org/linux/man-pages/man8/augenrules.8.html

## Issues Found
- The post said files in `/etc/audit/rules.d/` are loaded in alphabetical order. Red Hat documentation and the `augenrules(8)` manual specify natural sort order, so the wording was corrected.
- The post used `sudo cat /etc/audit/rules.d/*.rules` as a preview of what `augenrules` will produce. This does not accurately describe `augenrules` behavior because `augenrules` uses natural sort order and emits the last processed `-e` directive as the last line of the generated file. The preview command and explanation were updated.
- The post said rules after an early `-e 2` would fail to load. With `augenrules`, the last processed `-e` directive is emitted at the end of `/etc/audit/audit.rules`, so this was adjusted to recommend placing `-e 2` only in the final rules file.

## Review Notes
The main guidance is technically correct for RHEL 9: `-e 2` locks audit configuration, `auditctl -s` reports `enabled 2`, persistent rules use `auditctl` syntax under `/etc/audit/rules.d/`, and `augenrules --load` is the documented way to compile and load those rules. The example still uses legacy watch rules (`-w`), which remain valid, although Red Hat notes newer audit configurations may prefer syscall-style rules for some use cases.
