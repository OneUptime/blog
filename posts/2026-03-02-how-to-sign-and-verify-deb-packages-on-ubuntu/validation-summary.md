# Validation Summary: How to Sign and Verify .deb Packages on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GPG (GNU Privacy Guard)
- Debian package format (.deb)
- APT (Advanced Package Tool)
- dpkg-buildpackage / debsign / dpkg-sig
- dpkg-scanpackages / apt-ftparchive
- Ubuntu repository signing (Release / InRelease / Release.gpg)
- `/etc/apt/keyrings/` with `signed-by=` (Ubuntu 22.04+)
- Keyservers (keyserver.ubuntu.com, keys.openpgp.org)

## Sources Consulted
- Debian Wiki: SecureApt — https://wiki.debian.org/SecureApt
- Debian Repository Format — https://wiki.debian.org/DebianRepository/Format
- Ubuntu Manual: apt-secure(8) — https://manpages.ubuntu.com/manpages/jammy/en/man8/apt-secure.8.html
- Debian Manual: debsign(1) — https://manpages.debian.org/bookworm/devscripts/debsign.1.en.html
- Debian Manual: dpkg-buildpackage(1) — https://manpages.debian.org/bookworm/dpkg-dev/dpkg-buildpackage.1.en.html
- Debian Manual: dpkg-sig(1) — https://manpages.debian.org/bookworm/dpkg-sig/dpkg-sig.1.en.html
- Debian Manual: apt-ftparchive(1) — https://manpages.debian.org/bookworm/apt-utils/apt-ftparchive.1.en.html
- GnuPG Manual — https://www.gnupg.org/documentation/manuals/gnupg/
- Ubuntu Discourse: deprecation of apt-key — https://discourse.ubuntu.com/t/apt-key-deprecation/
- keys.openpgp.org docs — https://keys.openpgp.org/about

## Issues Found
- **`sudo` with shell redirect to `/etc/apt/keyrings/`**: In the "Debugging Signature Errors" section, the command `sudo gpg --export MISSINGKEYID > /etc/apt/keyrings/myrepo.gpg` would fail because the `>` redirect runs under the unprivileged user's shell, not under sudo. Since `/etc/apt/keyrings/` is owned by root, the write to the file would be denied. Replaced with `sudo gpg --export MISSINGKEYID | sudo tee /etc/apt/keyrings/myrepo.gpg > /dev/null`, which is the standard idiom for writing to root-owned paths.

## Review Notes
- `dpkg-sig` is in Ubuntu's `universe` component; users on minimal/server installs may need `add-apt-repository universe` first. The post does not mention this, but `universe` is enabled by default on Ubuntu Desktop and current Ubuntu Server installs.
- `apt-key` is deprecated and was removed entirely from Debian/Ubuntu (no longer ships in Ubuntu 22.04+). The post explicitly notes this with "deprecated but still works on older systems", which is accurate framing.
- The comment "Check if a package's repository has a valid signature" next to `apt-cache policy` is slightly imprecise: `apt-cache policy` shows the package's source repository/priority, not signature validity. Repository signature verification happens during `apt update`. This is contextually understandable and was left as-is to avoid restructuring.
- The comment "Check the signature on downloaded packages in apt's cache" before running `dpkg-sig --verify` on cached `.deb`s is technically misleading because standard packages from Ubuntu/PPA repositories are not signed with `dpkg-sig` — they rely on repository-level signing. The verification would only succeed for self-signed packages produced via the workflow earlier in the post. Left as-is since the post is consistent about advocating `dpkg-sig` for direct distribution.
- The `GPG_KEY_ID=$(... | grep sec | awk ...)` one-liner assumes a single secret key; with multiple secret keys it would produce a multi-line value. Fine as an instructive example.
- `keys.openpgp.org` strips third-party signatures and requires email verification before publishing identity (UID) info. The post recommends it as "preferred modern keyserver" without that caveat; acceptable as introductory guidance.
- The `cat > dists/stable/Release << 'EOF'` header + `apt-ftparchive release . >> Release` append pattern is a standard, working approach for building a Release file by hand.
- All other commands (`gpg --full-generate-key`, `debsign -k`, `dpkg-sig --sign builder`, `dpkg-scanpackages`, `gpg --clearsign --output InRelease`, `gpg --detach-sign --armor --output Release.gpg`, `gpg --dearmor`, `signed-by=` in sources.list, `gpg --show-keys`, `gpg --gen-revoke`) verified against current documentation.
