# Validation Summary: How to Use Burp Suite for Web App Testing on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Burp Suite Community Edition
- Burp Suite Professional (headless / CLI mode, Burp Scanner, Burp Collaborator)
- Ubuntu (apt, OpenSSL, system CA trust store)
- Firefox and Chromium browser proxy configuration
- SwitchyOmega Chrome extension
- Common web vulnerability classes (SQL injection, XSS, directory traversal) and test payloads

## Sources Consulted
- PortSwigger — Download Burp Suite Community Edition: https://portswigger.net/burp/communitydownload
- PortSwigger — Launching Burp Suite from the command line: https://portswigger.net/burp/documentation/desktop/troubleshooting/launch-from-command-line
- PortSwigger — Installing Burp's CA certificate: https://portswigger.net/burp/documentation/desktop/external-browser-config/certificate
- PortSwigger — Hotkey settings: https://portswigger.net/burp/documentation/desktop/settings/ui/hotkeys
- PortSwigger — Deploying a private Burp Collaborator server: https://portswigger.net/burp/documentation/collaborator/server/private
- PortSwigger — Burp Suite Releases: https://portswigger.net/burp/releases
- Mozilla Firefox CommandLineOptions: https://wiki.mozilla.org/Firefox/CommandLineOptions
- Chromium command-line switches reference (peter.sh/experiments/chromium-command-line-switches)

## Issues Found

1. **Firefox `--proxy-server` flag (incorrect)** — The post showed `firefox --proxy-server="127.0.0.1:8080"`. This flag is Chromium/Chrome-only; Firefox does not support it. Replaced the example with a Chromium-only block and added a note explaining how to set the Firefox proxy (Settings / FoxyProxy / `http_proxy` env var).

2. **Java install instructions (misleading)** — The post claimed "Burp Suite requires Java 17+" and instructed users to `apt install default-jre`. The official native installer bundles its own private JRE, so no separate Java install is needed. The standalone JAR currently requires Java 21+, not 17+. Reworded the section to clarify that the installer is self-contained and only the JAR path needs Java 21+, and updated the apt package to `openjdk-21-jre`.

3. **Download URL (unreliable)** — The `wget` command pointed at a versionless `portswigger-cdn.net` URL. PortSwigger's CDN downloads normally require a `version=` parameter and are produced by the official releases page. Replaced the brittle direct CDN URL with a reference to `https://portswigger.net/burp/releases/community/latest` and a `chmod`/run sequence that uses a wildcard, so the example doesn't rot.

4. **Passive scanner in Community Edition (incorrect)** — The post said Community users could enable a passive scanner under "Proxy > Options > Perform passive scanning". Burp Scanner (active and passive) is exclusive to Burp Suite Professional in current versions; there is no such option in Community. Rewrote the section to state this clearly and point Pro users at **Dashboard > New scan** / **New live task**.

5. **Ctrl+D keyboard shortcut for Drop (incorrect)** — Drop has no default hotkey in current Burp Suite (Ctrl+D is the text-editor "delete line" binding). Removed the bogus shortcut and added a note that users can assign one under **Settings > User interface > Hotkeys**.

6. **`--collaborator-server-location` CLI flag (incorrect)** — This flag is not part of Burp's documented CLI. The real Collaborator-related flags (`--collaborator-server`, `--collaborator-config`) are for *running* a private Collaborator server, not for pointing a client scan at one. Removed the bad flag from the headless example and added a sentence explaining that client-side Collaborator config is set in **Settings > Project > Collaborator** and persisted via the project/config file.

7. **CA certificate URL (minor)** — The post mentioned both `http://burpsuite` and `http://burp`. Only `http://burpsuite` is documented by PortSwigger; trimmed the alternate.

## Review Notes
- The Burp Suite scan-configuration JSON example is heavily abbreviated. The real schema is much larger and the exact key names (e.g. `thorough_audit`, `audit_checks: ["active"]`) are illustrative rather than copy-pasteable. Left it in place as a representative example since the post frames it as "a minimal scan configuration", but readers should generate a real config from the Burp UI (Settings > Save / Export configuration) rather than hand-writing one.
- The SQL injection, XSS, and directory traversal payloads are standard, well-known test vectors and accurate.
- The post is framed as a defensive/penetration-testing tutorial — intended use against authorized targets is implicit; an explicit "only test systems you have permission to test" note would strengthen it but is not a technical correctness issue.
- The `update-ca-certificates --fresh` cleanup command is correct on Ubuntu.
- Burp menu paths ("Proxy > Options" vs "Proxy > Proxy settings") legitimately shift between releases, and the post already acknowledges this — left as-is.
