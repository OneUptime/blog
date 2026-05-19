# Validation Summary: How to Choose Between AppArmor and SELinux on Ubuntu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ubuntu
- AppArmor
- SELinux
- Linux Security Modules
- Mandatory access control
- Linux command-line tools

## Sources Consulted
- Ubuntu Server documentation: AppArmor: https://ubuntu.com/server/docs/how-to/security/apparmor/
- Ubuntu Security documentation: Privilege restriction: https://documentation.ubuntu.com/security/security-features/privilege-restriction/
- Ubuntu manpage: aa-genprof: https://manpages.ubuntu.com/manpages/jammy/man8/aa-genprof.8.html
- Local AppArmor 4.0.1 manpages and command help for `aa-status`, `apparmor_status`, and `apparmor.d`
- Red Hat Enterprise Linux SELinux User's and Administrator's Guide: SELinux contexts and targeted policy: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html-single/selinux_users_and_administrators_guide/selinux_users_and_administrators_guide

## Issues Found
- The post said an AppArmor profile can prevent network connections to unexpected destinations. Standard AppArmor network rules primarily mediate socket families/types/protocols, so this was changed to "cannot create unexpected network sockets."
- The command `sudo aa-status --profiled` was described as listing loaded profiles, but current `aa-status` treats `--profiled` as a legacy count option. It was changed to `sudo aa-status --show=profiles`.
- The SELinux description said labels are assigned to every process, file, port, and socket. This was narrowed to processes, files, and other system resources such as ports to match the SELinux documentation more closely.
- The targeted policy coverage claim said it covers essentially all standard system services and the comparison table called coverage "Complete." This was softened to broad coverage for targeted services, because targeted policy confines targeted domains while untargeted processes run unconfined.
- The relabeling claim said changing policy or moving files requires relabeling. This was corrected to explain that relabeling is sometimes required when file context policy changes or when moved files keep labels that are wrong for the new location.
- The final paragraph used "complaint-only mode"; this was corrected to "complain mode," the AppArmor term.

## Review Notes
The example AppArmor profile is illustrative rather than a complete production nginx profile. A real deployment would normally need additional rules for executable transitions, includes/abstractions, runtime directories, log rotation behavior, and distribution-specific nginx paths.
