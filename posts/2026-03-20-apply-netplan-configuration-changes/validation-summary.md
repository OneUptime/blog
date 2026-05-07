# Validation Summary: How to Apply Netplan Configuration Changes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Netplan
- Ubuntu/Debian package management (`dpkg-query`)
- `systemd-networkd` / `networkctl`
- NetworkManager
- Linux `ip` networking tools

## Sources Consulted
- Netplan CLI: https://netplan.readthedocs.io/en/latest/cli/
- `netplan apply`: https://netplan.readthedocs.io/en/latest/netplan-apply/
- `netplan try`: https://netplan.readthedocs.io/en/latest/netplan-try/
- `netplan generate`: https://netplan.readthedocs.io/en/latest/netplan-generate/
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- `netplan info`: https://netplan.readthedocs.io/en/stable/netplan-info/
- Netplan desktop integration / generated NetworkManager profiles: https://netplan.readthedocs.io/en/latest/netplan-everywhere/
- `networkctl` man page: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- `dpkg-query` man page: https://manpages.debian.org/bookworm/dpkg/dpkg-query.1.en.html
- Local CLI help and output checked in the review environment: `netplan --help`, `netplan apply --help`, `netplan try --help`, `netplan generate --help`, `networkctl reload --help`, `netplan info --json`, `dpkg-query -W netplan.io`

## Issues Found
- `netplan apply -d` was incorrect. I replaced it with supported `--debug` forms: `netplan apply --debug` and `netplan --debug apply`.
- `netplan --version` was incorrect for the current Netplan CLI. I replaced it with `dpkg-query -W netplan.io` to check the installed package version on Ubuntu/Debian systems.
- The post said Netplan processes only `/etc/netplan/` files alphabetically. I corrected this to Netplan’s documented merged configuration behavior across `/lib/netplan/`, `/etc/netplan/`, and `/run/netplan/`, with lexicographical ordering for different filenames.
- The post said you cannot work with a specific file at all. I clarified that `netplan apply` works on the merged configuration, and added `netplan try --config-file ./test.yaml` as the documented way to test an extra configuration file temporarily.
- The generated NetworkManager path was too broad (`/run/NetworkManager/`). I corrected it to `/run/NetworkManager/system-connections/` and clarified that the `ls /run/systemd/network/` example is specifically for `systemd-networkd` output.
- The `networkctl reload` explanation was incomplete. I corrected it to reload `.network` and `.netdev` files and noted that it does not regenerate backend configuration from Netplan YAML.
- The `netplan try` explanation was too absolute about rollback. I updated it to match the documented behavior and included the official caveat that rollback should be verified because known bugs exist.
- The renderer detection example assumed filenames like `01-*.yaml`. I replaced it with a directory-wide `grep` and clarified that Netplan defaults to `networkd` when no renderer is explicitly set.

## Review Notes
- The post is technically relevant and remains a valid guide after correction.
- `netplan info` is documented as a feature-discovery command; in the local review environment it did not print version information even with `--json`, so the version-check section was changed to use the package manager instead.
