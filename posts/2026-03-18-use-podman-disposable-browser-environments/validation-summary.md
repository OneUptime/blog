# Validation Summary: How to Use Podman for Disposable Browser Environments

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Podman
- Fedora container images
- Firefox
- Chromium
- X11
- Puppeteer
- Node.js
- TigerVNC
- Selenium Grid
- Bash
- Dockerfile / Containerfile syntax

## Sources Consulted
- Podman `podman-build` reference: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman `podman-machine` reference: https://docs.podman.io/en/v4.9.0/markdown/podman-machine.1.html
- Podman `podman-network-create` reference: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman-run` reference: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `--dns` option reference: https://docs.podman.io/en/v4.4/markdown/options/dns.html
- Puppeteer installation guide: https://pptr.dev/guides/installation
- Puppeteer headless mode guide: https://pptr.dev/guides/headless-modes
- Puppeteer `LaunchOptions` API: https://pptr.dev/api/puppeteer.launchoptions
- Puppeteer troubleshooting guide: https://pptr.dev/troubleshooting
- Node.js releases schedule: https://nodejs.org/en/about/previous-releases
- Node.js EOL policy: https://nodejs.org/en/about/eol
- Fedora current releases page: https://fedoraproject.org/wiki/Releases/ko
- Fedora Linux homepage: https://fedoraproject.org/en
- Fedora Linux 40 EOL announcement: https://lists.fedoraproject.org/archives/list/announce@lists.fedoraproject.org/2025/5/
- Fedora Chromium package overview: https://packages.fedoraproject.org/pkgs/chromium/chromium/
- Fedora Chromium file list for Fedora 43: https://packages.fedoraproject.org/pkgs/chromium/chromium/fedora-43.html
- Fedora Firefox package overview: https://packages.fedoraproject.org/pkgs/firefox/firefox/
- TigerVNC `vncpasswd` documentation: https://tigervnc.org/doc/vncpasswd.html
- `tigervncserver` man page: https://manpages.debian.org/bookworm/tigervnc-standalone-server/tigervncserver.1.en.html
- Dockerfile reference for `COPY --chown` and `COPY --chmod`: https://docs.docker.com/reference/builder
- Selenium Docker images documentation: https://github.com/SeleniumHQ/docker-selenium

## Issues Found
- The post used `fedora:40` in multiple examples even though Fedora Linux 40 reached end of life on 2025-05-13. I updated those examples to `fedora:43`, which Fedora lists as a current supported stable release.
- The macOS X11 section was misleading. Podman on macOS runs containers inside a Linux virtual machine via `podman machine`, so the Linux `/tmp/.X11-unix` bind-mount pattern shown in the post does not apply directly there. I replaced the incomplete macOS instructions with a correct Linux-host note.
- The Chromium GUI example mixed `--disable-dev-shm-usage` with `--shm-size=2g`. Those are competing approaches, so I removed `--disable-dev-shm-usage` from that entrypoint and corrected the explanation of shared-memory usage.
- The Chromium section used `--no-sandbox` without explaining the tradeoff. I added a brief warning that this disables Chromium's own sandbox and should only be kept when the container environment cannot provide a usable browser sandbox.
- The headless Puppeteer example would not run as written. The image never installed a Puppeteer package, the run section skipped the required image build step, and the script used the outdated `headless: 'new'` form. I updated the example to install `puppeteer-core`, switched the script to `require('puppeteer-core')`, changed `headless` to `true`, added the image build command, and made the container run the script by default.
- The headless example used `node:20-bookworm`, but Node.js 20 reached EOL on 2026-03-24. I updated it to `node:24-bookworm`, which is a current LTS release.
- The VNC image example had runtime problems. `COPY start-vnc.sh` did not guarantee the right ownership or execute permissions for the entrypoint script, so I changed it to `COPY --chown=browser:browser --chmod=755`.
- The VNC password path in the script was outdated. Current TigerVNC documentation uses `~/.config/tigervnc/passwd`, so I updated the script to write the password file there.
- The VNC server example exposed port `5901` but started `vncserver` without disabling localhost-only listening. I added `-localhost no` so the published container port matches the intended connection method.
- The network-isolation section incorrectly used `podman network create --internal` while describing outbound browsing. Podman documents that `--internal` networks do not get a default route and only resolve container names. I changed the example to a regular dedicated user-defined network and clarified when `--internal` or `--network none` should be used.
- The multi-session helper script did not carry forward Chromium's `--shm-size=2g` requirement. I added browser-specific extra arguments so the helper matches the earlier working Chromium example.

## Review Notes
- The Linux X11 examples are technically valid, but `xhost +local:` is broad. A future revision could tighten that to a more specific local-user rule.
- The VNC example now works as written, but it still exposes a password-protected service over plain VNC. For untrusted networks, tunneling over SSH or using TLS-capable security types would be safer.
- The Selenium Grid example is technically plausible against current docker-selenium docs, but it still uses `latest` tags. Pinning image tags would make the tutorial more reproducible over time.
