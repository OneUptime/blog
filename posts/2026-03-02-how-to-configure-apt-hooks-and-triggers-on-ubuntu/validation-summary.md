# Validation Summary: How to Configure APT Hooks and Triggers on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- APT configuration
- apt-get
- dpkg / dpkg-deb
- Bash scripting
- curl webhooks
- util-linux flock

## Sources Consulted
- Ubuntu/Debian `apt.conf(5)` local man page for APT configuration syntax, hook names, hook ordering, `DPkg::Pre-Install-Pkgs`, `DPkg::{Pre,Post}-Invoke`, and `APT::Update::{Pre,Post}-Invoke`: https://manpages.ubuntu.com/manpages/noble/en/man5/apt.conf.5.html
- Ubuntu `apt-get(8)` man page for `--simulate`, `--just-print`, and `--reinstall`: https://manpages.ubuntu.com/manpages/noble/en/man8/apt-get.8.html
- `apt-config(8)` local man page and `apt-config dump` for configuration parsing behavior: https://manpages.ubuntu.com/manpages/noble/en/man8/apt-config.8.html
- `dpkg-deb --help` / `dpkg-deb(1)` for reading package control fields from `.deb` files: https://manpages.ubuntu.com/manpages/noble/en/man1/dpkg-deb.1.html
- `flock(1)` local man page for non-blocking command locks in shell scripts: https://man7.org/linux/man-pages/man1/flock.1.html

## Issues Found
- The post title and description referred to "dpkg triggers", but the article covers APT hooks and APT's dpkg invocation hooks, not Debian package maintainer triggers. Changed the title and description to refer to APT hooks only.
- The hook type list described generic APT pre/post hooks as if they ran for all APT operations. Updated the list and surrounding text to distinguish `APT::Update::*` hooks from `DPkg::*` hooks.
- The post used `APT::Get::Pre-Invoke` and claimed APT exposes planned package actions through `APT_PACKAGE_*` environment variables. Replaced this with `DPkg::Pre-Install-Pkgs` and a script that reads the `.deb` filenames APT passes on stdin, then uses `dpkg-deb -f` to inspect package names.
- The `DPkg::Pre-Install-Pkgs` section claimed the default stdin format was `operation package version` and covered removals. Corrected it to the documented default format: one `.deb` filename per line for packages APT is going to install, with a note that newer protocol versions provide richer action data.
- The Slack webhook example built JSON by interpolating raw shell text, which can break when update text contains newlines or quotes. Changed it to generate JSON with Python's `json` module.
- The configuration-management lock example removed its lock as soon as the hook script exited, so it did not protect the background `ansible-pull` run. Replaced it with `flock -n` around the background command.
- The audit hook inserted raw caller text into JSON, which could produce invalid JSON. Added a small JSON escaping helper using Python's `json` module.

## Review Notes
Validated representative APT configuration snippets with `apt-config`, and checked the edited shell scripts with `bash -n`. The examples remain illustrative; production hooks should also account for log rotation, webhook secret storage, and exact security-update detection requirements for the target Ubuntu release.
