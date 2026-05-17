# Validation Summary: How to Use reprepro for Managing Local Repositories on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- reprepro (Debian/Ubuntu APT repository manager)
- GnuPG (gpg, gpg-agent) for repository signing
- APT / dpkg / dpkg-deb
- Nginx (HTTP serving)
- Ubuntu 22.04 (jammy) and 24.04 (noble)
- cron (scheduled mirror updates)

## Sources Consulted
- reprepro(1) man page (Debian bookworm): https://manpages.debian.org/bookworm/reprepro/reprepro.1.en.html
- reprepro manual.html: https://salsa.debian.org/brlink/reprepro/-/raw/master/docs/manual.html
- Debian control file format (RFC822-style paragraphs)
- GnuPG manual: `gpg --batch --gen-key`, unattended key generation directives (`%no-protection`, `%commit`)
- Ubuntu archive structure (security.ubuntu.com, jammy-security suite)
- APT secure repository configuration (`signed-by` keyring option)

## Issues Found

1. **Blank line inside the jammy distribution paragraph** (`conf/distributions`). The original file had an empty line between `Description:` and `SignWith:` within the jammy block. Since reprepro uses Debian control-file format where blank lines separate paragraphs, this would split the jammy distribution into two malformed paragraphs. Removed the blank line so the jammy distribution is a single contiguous paragraph.

2. **Incorrect `listfilter` formula for component**. The original used `reprepro listfilter jammy 'Component (== main)'`. `Component` is not a package control field, so this formula matches nothing (the special pseudo-field is `$Component`, available since reprepro 3.11.1). Replaced with the simpler, version-portable form `reprepro -b /var/www/repo -C main list jammy`.

3. **FilterList file format reversed**. The `packages-to-mirror.list` file used `install <packagename>` order. Per the reprepro man page, each list file line must be `<packagename> <action>` (the same format as `dpkg --get-selections`). Reordered all entries (e.g., `openssl install`) and added a clarifying comment.

4. **Misleading comment on `ask-passphrase`**. The comment said "Ask before overwriting packages", but `ask-passphrase` controls whether reprepro prompts for the GPG signing key passphrase. Updated the comment to accurately describe the option.

5. **Broken/irrelevant echo command in "Signing failures" troubleshooting**. The original had `echo "Acquire::gpgv::Options "--ignore-time-conflict";" | sudo tee ...` which (a) has nested unescaped double quotes that mis-parse in bash, and (b) addresses Release-file time skew, not signing failures. Removed the line and added a brief note pointing users toward `ask-passphrase` instead, which is the actual remedy for passphrase-related signing failures.

## Review Notes

- The `libssl1.1` package referenced in the mirror filter list is from Ubuntu 20.04 (focal); it is not present in jammy (22.04, which has `libssl3`) or noble (24.04). The example is illustrative only — readers mirroring jammy/noble should adjust the list to current package names. Left as-is since the post's intent is to show the FilterList mechanism rather than recommend a specific package set.
- `Expire-Date: 0` creates a non-expiring GPG key. Many organizations prefer setting an expiry and rotating; this is a security trade-off the post could mention but is not technically incorrect.
- `sudo chown -R $USER:$USER /var/www/repo` requires `$USER` to be exported into the sudo environment (default on Ubuntu's sudo configuration via `env_keep`). Works as written on stock Ubuntu.
- The nginx `location ~ \.deb$` block sets a `types` directive but is otherwise pass-through; serving works fine without it because nginx will fall back to the top-level `try_files`. Harmless.
- `gpg --batch --gen-key` is the older spelling; modern GnuPG also accepts `--generate-key`. Both work, so no change needed.
