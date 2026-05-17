# Validation Summary: How to Use pbuilder for Clean Package Builds on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- pbuilder (Debian package builder, version 0.231 on Ubuntu 24.04)
- cowbuilder (copy-on-write pbuilder variant)
- pdebuild (pbuilder wrapper)
- debootstrap
- dpkg-buildpackage / devscripts
- Ubuntu release codenames (focal, jammy, noble)
- APT keyring management (`/etc/apt/keyrings/` + `signed-by=`)

## Sources Consulted
- `pbuilder(8)` man page (extracted from `pbuilder_0.231build1_all.deb`, Ubuntu Noble) — authoritative source for hook prefix semantics
- `pbuilderrc(5)` man page — confirmed valid configuration variables
- `pdebuild(1)` man page — confirmed invocation conventions
- Example `pbuilderrc` shipped at `/usr/share/doc/pbuilder/examples/pbuilderrc`
- Example hook scripts shipped at `/usr/share/doc/pbuilder/examples/`
- `cowbuilder(8)` Debian manpage: https://manpages.debian.org/bookworm/cowbuilder/cowbuilder.8.en.html
- Debian Wiki — `DebianRepository/UseThirdParty` for `apt-key` deprecation guidance

## Issues Found

1. **`sudo pdebuild` is incorrect.** `pdebuild` is designed to be run as the regular user; it internally elevates the `pbuilder` invocation via `PBUILDERROOTCMD` (default `sudo -E`). Running it under `sudo` would cause `dpkg-buildpackage -S` to run as root, which is wrong. Removed `sudo` from both `pdebuild` examples and added a clarifying comment.

2. **Hook naming convention table was incorrect (A and E descriptions).** Per `pbuilder(8)`:
   - `A` hooks run *inside the chroot, after build-deps are satisfied, just before build starts* — the post had described this as "before unpacking base tarball" which is wrong.
   - `E` hooks run *during `pbuilder create`/`update` after apt-get work finishes* — the post had described this as "after installing build-deps, before build", which is actually what `A` hooks do.
   - `D` and `B` descriptions were already correct.
   Rewrote the hook table with the correct descriptions for D, A, B, C, E, F, matching the man page.

3. **`cat > /etc/cron.weekly/pbuilder-update` would fail without sudo.** Shell redirection happens in the current (non-root) shell, so `sudo` on a later line cannot rescue it. Changed to `sudo tee /etc/cron.weekly/pbuilder-update > /dev/null << 'EOF'`.

4. **`LOGFILE=""` is not a documented `pbuilderrc` variable.** The actual logging-related variables are `PKGNAME_LOGFILE` and `PKGNAME_LOGFILE_EXTENSION` (or use the `--logfile` CLI flag). Removed the bogus line rather than guessing what the author intended.

5. **`apt-key adv ... --recv-keys` is deprecated** on Ubuntu 22.04+ and effectively removed on 24.04 (Noble), which is the post's headline distribution. Updated the D-hook example to fetch the key into `/etc/apt/keyrings/example-ppa.gpg` with `gpg --no-default-keyring` and reference it via `[signed-by=...]` in a `sources.list.d` entry — the current recommended pattern.

## Review Notes
- All `pbuilder` / `cowbuilder` / `dpkg-buildpackage` flags used in the post (`--distribution`, `--mirror`, `--components`, `--debootstrapopts`, `--basetgz`, `--buildresult`, `--preserve-buildplace`, `--basepath`, `-S`, `-sa`, `-us`, `-uc`) are valid and current.
- Configuration variables `DISTRIBUTION`, `MIRRORSITE`, `COMPONENTS`, `APTCACHE`, `HOOKDIR`, `EXTRAPACKAGES`, `BUILDRESULT` are all documented `pbuilderrc(5)` variables.
- Ubuntu codenames `focal` (20.04), `jammy` (22.04), `noble` (24.04) are correct. Note that `focal` is approaching end of standard support in April 2025; the post may want to drop it from the multi-distro example after that date, but it is still valid at time of review.
- `--debootstrapopts "--include=gnupg"` is correct syntax; the inner `--include=` is passed to `debootstrap`.
- The example hook number `D05` is fine — pbuilder hooks are executed in lexical sort order by filename, so any two-digit prefix works.
