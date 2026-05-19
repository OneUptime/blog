# Validation Summary: How to Install Chromium on Ubuntu

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ubuntu
- Chromium
- Snap / snapd
- APT and Debian packages
- Ungoogled Chromium
- VA-API hardware acceleration
- Playwright and Selenium ChromeDriver

## Sources Consulted
- Ubuntu blog: Chromium in Ubuntu deb-to-snap transition: https://ubuntu.com/blog/chromium-in-ubuntu-deb-to-snap-transition
- Ubuntu Wiki: DesktopTeam/ChromiumMaintenance: https://wiki.ubuntu.com/DesktopTeam/ChromiumMaintenance
- Debian package page for Chromium in Bookworm: https://packages.debian.org/en/bookworm/chromium
- Debian FTP master archive signing keys: https://ftp-master.debian.org/keys.html
- Snapcraft documentation: Manage updates: https://snapcraft.io/docs/how-to-guides/manage-snaps/manage-updates/
- Snap Store page for chromium-ffmpeg: https://snapcraft.io/chromium-ffmpeg
- Ubuntu Launchpad package page for chromium-codecs-ffmpeg-extra: https://launchpad.net/ubuntu/plucky/+package/chromium-codecs-ffmpeg-extra
- Chromium documentation: Run Chromium with flags: https://www.chromium.org/developers/how-tos/run-chromium-with-flags/
- Ungoogled Chromium Debian packaging repository: https://github.com/ungoogled-software/ungoogled-chromium-debian
- Ungoogled Chromium binaries project: https://ungoogled-software.github.io/ungoogled-chromium-binaries/
- Local Ubuntu 24.04 command/package checks: `apt-cache show`, `apt-cache policy`, `snap info`, `snap help`, and `xdg-settings --help`

## Issues Found
- The post said Ubuntu switched Chromium APT installs to Snap since Ubuntu 18.10. Ubuntu's transition announcement identifies Ubuntu 19.10 as the start, and Ubuntu's maintenance notes state Ubuntu 20.04 and later are Snap-only for Chromium, so the version history was corrected.
- The description said the post covered building from source, but the article does not provide source-build steps. The description was corrected to match the actual content.
- The Debian repository example only added `bookworm main`, while Debian's current Chromium package for Bookworm is published from security repositories. Added the `bookworm-security` source, the Debian 12 security signing key, and matching apt pin entries.
- The Debian-on-Ubuntu APT method was presented as a normal installation path. Added a warning that mixing Debian repositories into Ubuntu is unsupported and should be treated as an advanced workaround.
- The Widevine section incorrectly recommended `chromium-codecs-ffmpeg-extra` as a Widevine DRM installation method. Reframed the section as extra media codecs and clarified that those packages do not install Widevine.
- The persistent flags example used `~/.config/chromium-flags.conf`, which is not a general Ubuntu/Debian Chromium mechanism. Replaced it with local desktop launcher guidance and a Snap launcher example using `snap run chromium`.
- The ungoogled Chromium direct GitHub `.deb` URL pattern was not a reliable current installation command. Replaced it with the ungoogled-chromium binaries project URL and local `.deb` installation command.
- The Selenium section only listed `chromium-driver`, which is correct for Debian, but Ubuntu's Snap-backed package exposes the transitional package as `chromium-chromedriver`. Added the Ubuntu-specific package name.

## Review Notes
The Debian repository workaround remains inherently fragile because Debian and Ubuntu dependency sets can diverge. The post now warns about that risk, but a future revision could prefer a maintained Ubuntu PPA, Flatpak, or the default Snap path for most readers.
