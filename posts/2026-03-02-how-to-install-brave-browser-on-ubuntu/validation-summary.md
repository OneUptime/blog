# Validation Summary: How to Install Brave Browser on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Ubuntu
- Brave Browser
- APT repositories and Deb822 source files
- GPG keyrings
- Brave Shields and privacy settings
- Wayland/Ozone browser flags
- Tor private browsing in Brave
- Chromium/Brave VA-API hardware video acceleration

## Sources Consulted
- Brave official Linux installation documentation: https://brave.com/linux/
- Brave stable APT source file: https://brave-browser-apt-release.s3.brave.com/brave-browser.sources
- Brave beta APT source file: https://brave-browser-apt-beta.s3.brave.com/brave-browser.sources
- Brave nightly APT source file: https://brave-browser-apt-nightly.s3.brave.com/brave-browser.sources
- Brave Shields documentation: https://brave.com/shields/
- Brave browser features documentation: https://brave.com/features/
- Brave Safe Browsing help article: https://support.brave.app/hc/en-us/articles/15222663599629-Safe-Browsing-in-Brave
- Brave Google Sign-In privacy update: https://brave.com/privacy-updates/24-google-sign-in-permission/
- Brave package metadata and desktop launcher from the official APT repository
- Brave source tree Tor command-line test: https://github.com/brave/brave-core
- Chromium VA-API documentation: https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/vaapi.md

## Issues Found
- The APT setup examples used hand-written `.list` entries. Brave's current official Linux instructions use channel-specific Deb822 `.sources` files, so the stable, beta, nightly, and removal commands were updated.
- The introduction claimed Brave uses less memory than Chrome. That is not guaranteed, so it was narrowed to a resource-usage claim tied to blocking third-party ad and tracking scripts.
- The privacy settings section said blocking Google Sign-In prevents FLoC tracking. FLoC is obsolete and Brave's Google Sign-In handling is now permission-based, so the bullet was corrected.
- The Safe Browsing bullet implied full URLs are sent to Google. Brave's documentation says full URLs are not sent to Google and desktop requests are proxied, so the wording was corrected.
- The Wayland section suggested setting `BRAVE_FLAGS` in `/etc/environment`. The current Brave launcher does not read that variable, so the alternative was changed to launching Brave with the flag directly.
- The hardware video acceleration example used older VA-API flag guidance and checked only `brave://gpu` for `Video Decode: Hardware accelerated`. The example and verification instructions were updated to match current Chromium VA-API documentation.
- The comparison section described Brave's ad blocking as "at the network level." This was changed to "in the browser" to avoid overstating the implementation.

## Review Notes
Brave's built-in Tor mode is correctly described as not being a full Tor Browser replacement. Hardware video acceleration on Linux remains hardware-, driver-, codec-, and build-dependent; the post now reflects Chromium's caveat that VA-API on Linux may work only on certain configurations.
