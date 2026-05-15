# Validation Summary: How to Create Custom SELinux Policy Modules Using audit2allow on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- SELinux
- audit2allow
- ausearch
- semodule
- semanage
- checkmodule
- semodule_package

## Sources Consulted
- Red Hat Enterprise Linux 9 Using SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- audit2allow man page: https://www.mankier.com/1/audit2allow
- ausearch man page: https://man7.org/linux/man-pages/man8/ausearch.8.html
- semodule man page: https://man7.org/linux/man-pages/man8/semodule.8.html
- checkmodule documentation: https://fedoraproject.org/wiki/SELinux/checkmodule

## Issues Found
- The prerequisites listed only `policycoreutils-python-utils` and `setools-console`, but later commands use `ausearch` and manual module compilation tools. Added `audit` for `ausearch` and `checkpolicy` for `checkmodule`.
- The time-filter example used `ausearch -ts "5 minutes ago"`, but the documented `ausearch` keywords do not include that natural-language expression. Changed the example to `-ts recent` and clarified that `recent` means the last 10 minutes.
- The custom-module listing example used `semodule -l | grep -v "^[a-z]"`, which would exclude lowercase custom module names such as `myapp_custom`. Replaced it with `semodule -lfull | grep -v "^100"` to list modules outside the default priority, matching Red Hat's documented approach for identifying local modules.

## Review Notes
The core workflow is technically sound: collect AVC denials with `ausearch`, generate TE output or a loadable module with `audit2allow`, review the generated rules, install with `semodule`, and use permissive domains cautiously to gather additional denials. Red Hat documentation recommends treating `audit2allow` as a later troubleshooting step after checking labeling, booleans, and other SELinux configuration.
