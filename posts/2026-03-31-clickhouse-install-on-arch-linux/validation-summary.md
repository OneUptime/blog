# Validation Summary: How to Install ClickHouse on Arch Linux

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- ClickHouse (self-managed OSS install)
- Arch Linux
- AUR (Arch User Repository)
- AUR helpers: paru, yay
- systemd (unit files, `systemctl enable --now`)
- pacman (`IgnorePkg` directive)
- sysctl / `vm.max_map_count`
- Linux user management (`useradd`)
- ClickHouse XML configuration

## Sources Consulted
- ClickHouse official install documentation: https://clickhouse.com/docs/install
- ClickHouse configuration reference: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse `vm.max_map_count` knowledge base article
- Arch Linux `useradd` / `pacman.conf` man pages (general knowledge)
- systemd.unit / systemd.service man pages (general knowledge)

## Issues Found
No technical issues found.

All technical elements check out:
- The `curl https://clickhouse.com/ | sh` one-liner is ClickHouse's official install script, which drops a `clickhouse` binary in the current working directory — the subsequent `mv` to `/usr/local/bin/` is correct.
- `useradd -r -s /sbin/nologin -d /var/lib/clickhouse clickhouse` correctly creates a system user; by default `useradd` creates a matching primary group, so the later `chown clickhouse:clickhouse` is valid.
- The systemd unit syntax is correct: `Type=simple`, `ExecStart=/usr/local/bin/clickhouse server --config-file=...`, and `LimitNOFILE=262144` are all valid. The `clickhouse` binary is a multi-call binary where `clickhouse server` and `clickhouse client` are correct subcommands.
- The XML configuration uses the modern `<clickhouse>` root element (the old `<yandex>` name has been deprecated since 2021/2022). Field names (`http_port`, `tcp_port`, `listen_host`, `path`, `tmp_path`, `logger`) are valid configuration parameters.
- `vm.max_map_count=262144` is the value recommended by ClickHouse's own KB article, applied via `/etc/sysctl.d/*.conf` (which is correct for Arch and systemd-based distros).
- `IgnorePkg = clickhouse` is valid `pacman.conf` syntax.
- The `paru -S` / `yay -S` commands use correct AUR helper syntax.

## Review Notes
- The "minimal" XML config omits `<users_config>`, `<default_profile>`, and a few other elements that are normally present in `config.xml`. ClickHouse will fall back to built-in defaults for most of these, but a truly production-ready server usually ships with the distribution's default `users.xml` / `config.d/` layout in addition to the minimal snippet shown. This is acceptable given the post explicitly calls the config "minimal."
- `LimitNOFILE=262144` is more conservative than the 500000 used in ClickHouse's own shipped systemd unit. It will work, but high-throughput deployments may want a higher value.
- The AUR ecosystem is volatile — package names and maintainership can change. The post assumes a package named `clickhouse`; readers should also be aware of related packages (`clickhouse-bin`, etc.) if the primary one is orphaned at time of reading. Not a factual error, just a long-term drift risk.
- `/sbin/nologin` vs `/usr/bin/nologin`: on modern Arch (with the usr-merge), both paths resolve to the same binary via symlinks, so the command works as written.
