# Validation Summary: How to Install Google Chrome on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Google Chrome (stable, beta, unstable channels) on Ubuntu Linux
- APT package manager and Debian repository configuration
- GPG signing keys and `signed-by=` APT keyring trust
- Wayland / X11 / Ozone platform selection in Chrome
- Chrome managed policies (`/etc/opt/chrome/policies/managed/`)
- NSS (Network Security Services) certificate store on Linux

## Sources Consulted
- Google Linux package signing keys page: https://www.google.com/linuxrepositories/
- Chromium project — Linux certificate management docs: https://chromium.googlesource.com/chromium/src/+/HEAD/docs/linux/cert_management.md
- Chrome Enterprise policy reference (general): https://chromeenterprise.google/policies/
- Known Chrome command-line flags (`--ozone-platform`, `--use-gl`, `--enable-features=VaapiVideoDecoder`, `--profile-directory`, `--no-sandbox`)
- Standard `apt`, `dpkg`, `wget`, `curl`, `gpg`, `certutil` man pages

## Issues Found

1. **Dangerous overwrite of `/etc/environment` and incorrect env-var claim.** The original snippet
   ```bash
   echo 'CHROMIUM_FLAGS="--ozone-platform=wayland"' | sudo tee /etc/environment
   ```
   used `tee` without `-a`, which would replace the entire `/etc/environment` file (a destructive change to system PATH/LANG settings). Additionally, `CHROMIUM_FLAGS` is the convention used by the Chromium browser via its Debian wrapper scripts — it is **not** read by the `google-chrome` launcher, so even if appended correctly the flag would not take effect. Replaced the snippet with a pointer to the `chrome://flags/#ozone-platform-hint` toggle, which is the supported in-browser equivalent of `--ozone-platform=wayland` and complements the `.desktop`-file approach already shown above.

2. **Incorrect claim that Chrome uses the system certificate store on Linux.** The original troubleshooting section stated "Chrome uses the system certificate store on Linux" and instructed users to install a corporate CA via `update-ca-certificates`. Per the Chromium project's own documentation, Chrome on Linux uses NSS (`~/.pki/nssdb`), not `/etc/ssl/certs`, so `update-ca-certificates` alone will not make the CA trusted by Chrome. Replaced with the correct `certutil`-based workflow against `$HOME/.pki/nssdb` (after installing `libnss3-tools`), plus a brief note about system-wide deployment via configuration management or p11-kit.

## Review Notes

- The post's `SafeBrowsingEnabled` managed-policy key still works but has been **deprecated** since Chrome 83 in favour of `SafeBrowsingProtectionLevel`. Left as-is because the key still functions and the post is not introducing it as new guidance.
- `apt-transport-https` has been a transitional/empty package on Ubuntu since 18.04 (functionality folded into `apt` itself). Installing it is harmless, so left unchanged.
- The "Expected output" for `/etc/apt/sources.list.d/google-chrome.list` matches what the modern `.deb` installer writes (with `signed-by=` and `arch=amd64`), though older installs may have used a slightly different format with the legacy `apt-key` keyring. Acceptable as written.
- `google-chrome --no-sandbox` is suggested as a troubleshooting step; this disables the sandbox and should be treated as a temporary diagnostic only. The post does not currently flag this security caveat, but the command itself is technically correct.
- The Chrome `.deb` installer actually places its key at `/etc/apt/trusted.gpg.d/google-chrome.gpg` (not `google.gpg`) in current versions. The post's manual instructions use `google.gpg`, which works but doesn't match what the official installer creates — left as-is since it's internally consistent within the manual-install snippet.
