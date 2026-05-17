# Validation Summary: How to Write AppArmor Profiles for Custom Applications on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AppArmor (Mandatory Access Control framework)
- Ubuntu / Linux
- apparmor_parser
- apparmor-utils (aa-complain, aa-enforce, aa-logprof)
- libapparmor (aa_change_hat API)
- Linux capabilities
- systemd / journalctl (for log inspection)

## Sources Consulted
- AppArmor `apparmor.d(5)` man page (Ubuntu): https://manpages.ubuntu.com/manpages/jammy/en/man5/apparmor.d.5.html
- AppArmor `apparmor_parser(8)` man page (Ubuntu): https://manpages.ubuntu.com/manpages/jammy/en/man8/apparmor_parser.8.html
- AppArmor upstream abstractions: https://gitlab.com/apparmor/apparmor/-/tree/master/profiles/apparmor.d/abstractions
- AppArmor tunables (`@{HOME}` definition): `/etc/apparmor.d/tunables/home`
- aa-complain, aa-enforce, aa-logprof man pages (apparmor-utils package)

## Issues Found

1. **Misleading network rule comment** — The example `network inet tcp,` was annotated as "Allow only outbound TCP over IPv4". This is incorrect: a coarse-grained `network inet tcp,` rule grants creation and use of IPv4 TCP sockets in both directions (connect, bind, listen, accept, send, receive). Fixed the comment to read "Allow TCP sockets over IPv4."

2. **Non-existent `gnome` abstraction** — The post listed `#include <abstractions/gnome>` as an example for desktop applications. There is no standard `gnome` abstraction in upstream AppArmor or the Ubuntu apparmor package. Replaced with `#include <abstractions/dbus-session-strict>` (a real, commonly-used abstraction) and updated the comment to describe D-Bus usage.

3. **Incorrect `apparmor_parser -p` description** — The post used `apparmor_parser -p` as a syntax checker. `-p` / `--preprocess` dumps the preprocessed profile to stdout and is not the canonical syntax/compile check. Replaced with `apparmor_parser -Q`, which compiles the profile fully but skips loading into the kernel — the correct flag for "parse and check without loading".

## Review Notes

- The `m` (mmap) permission is technically "mmap with PROT_EXEC" rather than generic mmap; read-only memory maps are covered by `r`. The simplified table description is acceptable for a tutorial but readers should be aware of this nuance when debugging.
- Signal rules use space separators in set lists (e.g., `set=(hup term)`). The parser accepts this form, though documentation often uses comma separators (`set=(hup, term)`). Either works in current AppArmor versions.
- The `aa_change_hat()` API call requires a magic token argument in practice (`aa_change_hat(const char *subprofile, unsigned long magic_token)`); the post only mentions the function name, which is appropriate for an overview but readers implementing hats should consult the libapparmor docs.
- The hat (`^worker { ... }`) workflow described is correct, but in modern profiles, AppArmor "children" (subprofiles defined with `profile name { ... }`) and `Cx`/`Px` transitions are often preferred over hats for new code. Hats remain valid and supported.
- The workflow of starting in complain mode → running `aa-logprof` → tightening → switching to enforce mode is the industry-standard, well-documented approach.
