# Validation Summary: How to Use SELinux Deny Rules Introduced in RHEL 9.4

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9.4
- SELinux
- SELinux Common Intermediate Language (CIL)
- SELinux policy modules
- `semodule`, `sesearch`, `sestatus`, and `ausearch`

## Sources Consulted
- Red Hat Enterprise Linux 9.4 Release Notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.4_release_notes/overview
- Red Hat Enterprise Linux 9.4 Release Notes, Security new features: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.4_release_notes/new-features
- Red Hat Enterprise Linux 9 Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- SELinuxProject CIL Access Vector Rules documentation: https://github.com/SELinuxProject/selinux/blob/main/secilc/docs/cil_access_vector_rules.md
- Red Hat Developer, "How SELinux deny rules improve system security": https://developers.redhat.com/articles/2025/06/04/how-selinux-deny-rules-improve-system-security
- SETools `sesearch` manual page: https://manpages.debian.org/unstable/setools/sesearch.1.en.html

## Issues Found
- The post incorrectly referred to "RHEL.4" instead of "RHEL 9.4". Updated the title, description, headings, prerequisites, and wrap-up to use the correct version name.
- The post described deny rules as runtime rules evaluated during every access check. Updated the explanation to match upstream CIL documentation: `deny` rules remove access rights from matching `allow` rules before `neverallow` checking, so the loaded policy lacks those allow permissions.
- The post overstated deny rules as "ironclad", "un-overridable", and absolute "no matter what" controls. Reworded those claims to clarify that deny rules affect SELinux allow permissions while the deny module remains installed and SELinux is enforcing.
- The prerequisites omitted `setools-console`, which provides `sesearch` on RHEL. Added it to the install command.
- The verification command used `sesearch --deny`, but `sesearch` is normally used to inspect the effective policy rules. Replaced it with a check for whether a matching allow rule remains in the effective policy.
- The Mermaid diagram implied a deny-rule lookup during each access request. Updated it to show deny rules removing matching allow permissions when policy modules are loaded.

## Review Notes
The CIL examples are syntactically consistent with the upstream CIL access-vector rule format. I could not run `semodule` or `sesearch` locally because those tools are not installed in this workspace, so command validation was based on official and upstream documentation.
