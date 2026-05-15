# Validation Summary: How to Write a Custom SELinux Policy with sepolicy generate on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- SELinux
- `sepolicy generate`
- SELinux policy modules (`.te`, `.fc`, `.if`, `.pp`)
- SELinux policy management commands (`semodule`, `semanage`, `restorecon`, `ausearch`)
- SELinux reference policy macros

## Sources Consulted
- Red Hat Enterprise Linux 9 Using SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Customer Portal, Quick start to write a custom SELinux policy: https://access.redhat.com/articles/6999267
- `sepolicy-generate(8)` manual page: https://man7.org/linux/man-pages/man8/sepolicy-generate.8.html
- `sepolicy-network(8)` manual page: https://www.mankier.com/8/sepolicy-network
- `sepolicy-communicate(8)` manual page: https://www.mankier.com/8/sepolicy-communicate
- Current SELinux development tooling in a Fedora/RHEL-family container with `policycoreutils-devel` and `selinux-policy-devel`

## Issues Found
- The introduction described `audit2allow` as patching an existing policy and `sepolicy generate` as creating a complete policy module. Updated this to say `audit2allow` suggests rules from denials and `sepolicy generate` creates an initial policy module template, which matches Red Hat's documentation and the generated workflow.
- The post only mentioned `unconfined_t` as an unconfined process context. Added `unconfined_service_t`, which is the context shown in Red Hat's RHEL 9 custom daemon example for an unconfined systemd service.
- The `--confined_admin` example omitted the administered domain. Updated the example to include `-a apache`, matching current `sepolicy generate` usage for confined administrator roles with an existing admin domain.
- The manual `restorecon` example did not relabel every path introduced in the file-context example. Added `/var/run/myapp/` and `/var/lib/myapp/` so the manual installation steps cover the listed custom labels.

## Review Notes
The policy snippets were test-compiled with the SELinux development Makefile in a current Fedora/RHEL-family environment. The `sepolicy generate` examples were checked against current CLI help, and the `--confined_admin -n web_admin -a apache` form was run successfully. The generated policy workflow, file list, module build command, module install command, and `sepolicy network`, `sepolicy communicate`, and `sepolicy manpage` examples align with the consulted documentation.
