# Validation Summary: How to Set Up OnionShare on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation and usage guide

## Technologies Covered
- OnionShare (GUI and CLI)
- Tor / Onion services (v3)
- Ubuntu 22.04+
- Snap, Flatpak, APT/PPA package managers
- systemd (service definition for headless operation)

## Sources Consulted
- OnionShare official documentation: https://docs.onionshare.org/
- OnionShare CLI source (`cli/onionshare_cli/__init__.py`): https://github.com/onionshare/onionshare
- OnionShare features page: https://docs.onionshare.org/2.6/en/features.html
- OnionShare advanced usage docs: https://docs.onionshare.org/2.6/en/advanced.html
- OnionShare install docs: https://docs.onionshare.org/2.6/en/install.html
- Snapcraft listing: https://snapcraft.io/onionshare
- Flathub listing: https://flathub.org/apps/org.onionshare.OnionShare
- Micah Lee PPA: https://launchpad.net/~micahflee/+archive/ubuntu/ppa

## Issues Found

1. **Invalid CLI flag `--stop-after-first-download`** — This flag does not exist in the OnionShare CLI source. Auto-stop after files have been sent is the default behavior in share mode; the relevant flag is `--no-autostop-sharing`, which *disables* the auto-stop. Updated the CLI example to use `--no-autostop-sharing` with a corrected comment that reflects the default-stop behavior.

2. **Outdated `.onion` URL format `http://abc123def456.onion/password`** — Since OnionShare migrated to v3 onion services with client authentication (around v2.3, ~2020-2021), the URL no longer contains an in-path slug or password. The address is just `http://<address>.onion` and a separate private key is provided that must be entered in Tor Browser when prompted. Updated the share-mode walkthrough accordingly.

3. **Receive-mode GUI step said "Optionally set a password"** — The password UI was removed when OnionShare migrated to private-key-based client authentication. The modern equivalent is the "Public mode" toggle in advanced settings (CLI flag: `--public`), which disables the private key requirement. Updated step 2 of the receive walkthrough.

4. **Security Considerations referenced "password"** — Same root cause as #2 and #3. Updated to "private key" and rephrased the "stop after first download" bullet to reflect that it's the default behavior in modern OnionShare.

5. **"Official PPA" heading** — The micahflee PPA is not listed as an official install method in the OnionShare docs, although it is maintained by OnionShare's author Micah Lee. Renamed the heading to "Maintainer's PPA" and added a small clarification in the comment.

## Review Notes

- The systemd service example assumes OnionShare was installed via the PPA (binary at `/usr/bin/onionshare-cli`). If a reader installs via snap, the binary path differs (e.g., `/snap/bin/onionshare-cli`). This is not strictly wrong but worth being aware of.
- Chat mode is described as "end-to-end encrypted." Per OnionShare docs, this E2EE comes from Tor onion service encryption, not from an application-layer protocol like Signal/OMEMO. The post's wording aligns with how OnionShare's official docs describe it.
- The example `.onion` address `abc123def456.onion` is intentionally a short placeholder for readability — real v3 onion addresses are 56 characters. Left as-is since the post is clearly using it as a placeholder.
- Default receive directory `~/OnionShare` is confirmed correct in the OnionShare source.
