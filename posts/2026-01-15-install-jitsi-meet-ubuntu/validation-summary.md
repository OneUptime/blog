# Validation Summary: How to Install Jitsi Meet for Video Conferencing on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation & configuration guide

## Technologies Covered
- Jitsi Meet (video conferencing platform)
- Prosody (XMPP server)
- Jicofo (Jitsi Conference Focus)
- Jitsi Videobridge (JVB / SFU)
- Jibri (recording & live streaming)
- Ubuntu 22.04 / 24.04 LTS
- Nginx
- Let's Encrypt / certbot
- UFW firewall
- HAProxy (load balancing)
- OpenTelemetry Collector (otelcol-contrib)
- Prometheus, Grafana, Loki, Jaeger, Alertmanager (observability stack)
- Google Chrome / ChromeDriver (Chrome for Testing)

## Sources Consulted
- Jitsi self-hosting / quick install guide: https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-quickstart/
- Jitsi secure domain (authentication) docs: https://jitsi.github.io/handbook/docs/devops-guide/secure-domain/
- Jibri installation docs: https://jitsi.github.io/handbook/docs/devops-guide/jibri/
- Jitsi Videobridge configuration & metrics docs: https://github.com/jitsi/jitsi-videobridge
- ChromeDriver release process change (Chrome for Testing) announcement: https://groups.google.com/g/chromedriver-users/c/clpipqvOGjE
- Chrome for Testing version selection: https://developer.chrome.com/docs/chromedriver/downloads/version-selection
- Chrome for Testing availability dashboard: https://googlechromelabs.github.io/chrome-for-testing/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/

## Issues Found

1. **Fabricated "OHRM (Observability Human Resource Management)" technology.** The post repeatedly referenced a non-existent product called "OHRM / Observability Human Resource Management." No such observability tool exists ("OHRM" is the abbreviation of OrangeHRM, an unrelated HR application). This was the most serious issue. Fixes:
   - Removed the entire `### OHRM (Observability Human Resource Management) Setup` subsection under OpenTelemetry, which documented a fabricated `/etc/ohrm/config.yaml` for software that does not exist. The genuine, working equivalent (Prometheus/Grafana/Loki/Jaeger/Alertmanager) is already covered later in the post.
   - Renamed the `## OHRM Server Setup` section to `## Observability Stack Setup` and reworded its intro to accurately describe the Prometheus/Grafana/Loki/Jaeger stack it actually configures. The docker-compose, Prometheus, alerting, and Grafana content itself was valid and was kept.
   - Renamed the invented directory `/opt/ohrm` to `/opt/monitoring` and container names `ohrm-*` to `monitoring-*` throughout.
   - Changed the firewall comment `# Allow OHRM/OTEL traffic` to `# Allow OTLP traffic`.
   - Changed the troubleshooting comment `# Check for OHRM-related errors` to `# Check for errors in the Jicofo log`.

2. **Nonsense word "Oroplex."** The firewall section had `# Allow XMPP client connections (optional, for Oroplex users)`. "Oroplex" is not a real client or term. Changed to `(optional, for desktop XMPP clients)`.

3. **Fabricated CSS class names / variables.** The custom CSS used `--ohrm-*` variables and `.ohrm-header`, `.ohrm-button-primary`, `.ohrm-welcome-page`, `.ohrm-filmstrip`, `.ohrm-toolbar` selectors that do not exist in Jitsi Meet. Renamed the variables to `--brand-*` and the selectors to neutral/illustrative names (`.header`, `.button-primary`, `.welcome-page`, `.filmstrip`, `.toolbox-content`) so they no longer imply a fictional product.

4. **Outdated ChromeDriver installation (Jibri section).** The post used `https://chromedriver.storage.googleapis.com/LATEST_RELEASE` and `chromedriver_linux64.zip`. That endpoint stopped being updated after Chrome 114; for Chrome 115+ ChromeDriver is distributed via Chrome for Testing. Updated the snippet to derive the installed Chrome version and download the matching `chromedriver-linux64.zip` from `https://storage.googleapis.com/chrome-for-testing-public/`, with an explanatory comment.

## Review Notes
- The Jitsi repository setup (GPG key at `download.jitsi.org/jitsi-key.gpg.key`, the `signed-by` apt source pointing at `https://download.jitsi.org stable/`), the `jitsi-meet` meta-package install flow, service names (`prosody`, `jicofo`, `jitsi-videobridge2`, `nginx`), Let's Encrypt script path (`/usr/share/jitsi-meet/scripts/install-letsencrypt-cert.sh`), and `prosodyctl` commands all match current official Jitsi documentation.
- The Prosody secure-domain config still includes a legacy `Component "jitsi-videobridge.meet.yourdomain.com"` with `component_secret`. Modern Jitsi connects the videobridge to a brewery MUC (`JvbBrewery`) as an XMPP client rather than as a Prosody component, which the post also documents in the scalability section. This legacy block is harmless but redundant; it was left in place as it is not strictly incorrect and removing it would touch a larger config block than necessary.
- The `jvb.conf` snippet includes an `otel { ... }` block for the videobridge. JVB primarily exposes metrics via the Prometheus/`colibri` stats endpoints; a dedicated `otel` configuration key is not part of JVB's documented reference config. It was left as-is (HOCON ignores unknown keys), but readers should rely on the Prometheus scrape approach shown elsewhere in the post for JVB metrics.
- `OPTIMAL_BROWSERS_ONLY` and a few other `interface_config.js` keys reflect older Jitsi UI configuration; recent Jitsi has migrated much of `interface_config.js` into `config.js`. These were left intact as they are still recognized and the post's intent is clear.
