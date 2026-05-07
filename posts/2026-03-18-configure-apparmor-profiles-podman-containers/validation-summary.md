# Validation Summary: How to Configure AppArmor Profiles for Podman Containers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- AppArmor
- Linux containers
- Debian and Ubuntu Linux
- Container security profiles

## Sources Consulted
- Podman `podman run` official documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `podman container inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Ubuntu AppArmor profile syntax manpage: https://manpages.ubuntu.com/manpages/noble/man5/apparmor.d.5.html
- Ubuntu `apparmor_parser` manpage: https://manpages.ubuntu.com/manpages/noble/man8/apparmor_parser.8.html
- Ubuntu `aa-status` manpage: https://manpages.ubuntu.com/manpages/noble/man8/aa-status.8.html
- Ubuntu `aa-complain` manpage: https://manpages.ubuntu.com/manpages/noble/man8/aa-complain.8.html
- Local AppArmor parser help output and syntax validation with AppArmor parser 4.0.1.

## Issues Found
- The complain-mode section stated that violations are logged but not denied and tested explicit `deny` rules by accessing `/root` and `/etc/shadow`. Ubuntu's `aa-complain` documentation says explicit `deny` rules are still enforced in complain mode. I updated the explanation and command comments, and changed the complain-mode test to write to `/var/log/complain-test`, which exercises a missing allow rule rather than an explicit deny rule.

## Review Notes
- The custom profile parses successfully with `apparmor_parser -Q -K` on AppArmor parser 4.0.1.
- Podman was not installed in the local review environment, so Podman CLI behavior was verified against official Podman documentation rather than live command execution.
