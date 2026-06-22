# Validation Summary: How to Configure AppArmor Security Profiles

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AppArmor
- Linux Security Modules
- Ubuntu and Debian AppArmor tooling
- AppArmor profile syntax and abstractions
- Docker AppArmor profiles
- Bash monitoring commands

## Sources Consulted
- AppArmor profile quick reference: https://apparmor.net/reference/profiles-quick-reference/
- Ubuntu apparmor.d(5) manpage: https://manpages.ubuntu.com/manpages/trusty/man5/apparmor.d.5.html
- Local AppArmor 4.0.1 apparmor.d(5), apparmor_parser(8), and aa-status(8) manpages
- Ubuntu aa-genprof(8) manpage: https://manpages.ubuntu.com/manpages/noble/man8/aa-genprof.8.html
- Ubuntu aa-logprof(8) manpage: https://manpages.ubuntu.com/manpages/focal/man8/aa-logprof.8.html
- AppArmor aa-enforce documentation: https://apparmor.net/man/3.0/aa-enforce/
- Debian aa-disable(8) manpage: https://manpages.debian.org/unstable/apparmor-utils/aa-disable.8.en.html
- Docker AppArmor security profiles documentation: https://docs.docker.com/engine/security/apparmor/

## Issues Found
- The introduction said AppArmor makes sure a web server cannot read SSH keys or a database cannot execute shell commands. That is only true when appropriate profiles are loaded and enforcing, so the statement was changed to specify a correctly loaded AppArmor profile in enforce mode.
- The post described `apparmor_parser -p` as "check syntax without loading." The official parser help and manpage define `-p` as preprocessing and dumping the flattened profile. The command was changed to `apparmor_parser -Q`, which compiles the profile while skipping kernel loading.

## Review Notes
- The AppArmor profile examples use valid current profile grammar, including capability rules, network rules, file permissions, deny rules, includes, directed profile transitions, and container profile flags.
- Docker AppArmor usage matches Docker's documented `--security-opt apparmor=...` behavior. Docker's documentation commonly loads custom container profiles with `apparmor_parser -r -W`; the post's `apparmor_parser -a` and `-r` examples are still valid general AppArmor parser operations.
- Debian support for some AppArmor mediation features can vary by kernel and packaging, so production users should verify loaded features and parser warnings on their target distribution.
