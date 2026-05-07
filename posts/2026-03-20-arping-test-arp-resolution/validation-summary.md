# Validation Summary: How to Use arping to Test ARP Resolution

## Status
validated

## Post Type
Guide

## Technologies Covered
- ARP
- `arping`
- Linux networking
- Homebrew packaging

## Sources Consulted
- `arping(8)` from `iputils`: https://man7.org/linux/man-pages/man8/arping.8.html
- `iputils` upstream repository: https://github.com/iputils/iputils
- RFC 5227, "IPv4 Address Conflict Detection": https://www.rfc-editor.org/rfc/rfc5227
- Ubuntu package page for `iputils-arping`: https://packages.ubuntu.com/jammy/iputils-arping
- Homebrew formula page for `arping`: https://formulae.brew.sh/formula/arping
- Fedora `iputils` package page showing `arping` is provided by `iputils`: https://packages.fedoraproject.org/pkgs/iputils/iputils/fedora-43.html

## Issues Found
- The Ubuntu/Debian install command used `sudo apt install arping`, which installs a different `arping` implementation than the Linux `iputils` utility used in the post examples. I changed it to `sudo apt install iputils-arping` so the documented flags match the installed tool.
- The macOS install command was technically plausible, but Homebrew packages Thomas Habets' `arping`, which uses different CLI syntax than the Linux `iputils` examples in the post. I added a note to prevent readers from assuming the Linux flags apply unchanged on macOS.
- The options table listed `-t timeout` as a reply-timeout flag. In current `iputils` `arping`, the documented timeout/deadline flag is `-w deadline`, and `-t timeout` is not a valid option in this implementation. I corrected the table entry.

## Review Notes
- The Linux command examples, duplicate-address-detection behavior, and `-A`/`-U` explanations align with the current `iputils` `arping` documentation and RFC 5227 after the corrections above.
- The post is Linux-focused, and that scope matters because multiple `arping` implementations exist with different option sets.
