# Validation Summary: How to Implement Security Testing with Burp Suite

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Burp Suite Community and Professional
- Burp Proxy
- Burp Repeater
- Burp Intruder
- Burp Scanner
- Burp Sequencer
- Burp extensions and BApp Store
- OWASP ZAP GitHub Action
- GitHub Actions
- Docker Compose
- Web application security testing
- SQL injection, XSS, access control, and JWT testing

## Sources Consulted
- PortSwigger Burp Suite download and installation: https://portswigger.net/burp/documentation/desktop/getting-started/download-and-install
- PortSwigger proxy listener configuration: https://portswigger.net/burp/documentation/desktop/external-browser-config/check-listener
- PortSwigger Firefox proxy configuration: https://portswigger.net/burp/documentation/desktop/external-browser-config/browser-config-firefox
- PortSwigger CA certificate installation: https://portswigger.net/burp/documentation/desktop/external-browser-config/certificate
- PortSwigger Proxy intercept documentation: https://portswigger.net/burp/documentation/desktop/tools/proxy/intercept-messages
- PortSwigger Repeater documentation: https://portswigger.net/burp/documentation/desktop/tools/repeater/http-messages
- PortSwigger Intruder attack types: https://portswigger.net/burp/documentation/desktop/tools/intruder/configure-attack/attack-types
- PortSwigger Burp Scanner scan configuration documentation: https://portswigger.net/burp/documentation/desktop/running-scans/configuring-scans
- PortSwigger Burp Scanner audit settings: https://portswigger.net/burp/documentation/scanner/scan-configurations/audit-settings
- PortSwigger scan results and issues documentation: https://portswigger.net/burp/documentation/desktop/running-scans/results/issues
- PortSwigger Sequencer documentation: https://portswigger.net/burp/documentation/desktop/tools/sequencer/getting-started
- PortSwigger BApp Store extension installation: https://portswigger.net/burp/documentation/desktop/extend-burp/extensions/installing/bapp-store
- PortSwigger report generation documentation: https://portswigger.net/burp/documentation/desktop/getting-started/generate-reports
- PortSwigger Web Security Academy SQL injection cheat sheet: https://portswigger.net/web-security/sql-injection/cheat-sheet
- PortSwigger Web Security Academy XSS documentation: https://portswigger.net/web-security/cross-site-scripting
- PortSwigger Web Security Academy access control documentation: https://portswigger.net/web-security/access-control
- PortSwigger Web Security Academy JWT attacks documentation: https://portswigger.net/web-security/jwt
- PortSwigger Burp Suite DAST CI/CD documentation: https://portswigger.net/burp/documentation/dast/user-guide/ci-cd
- ZAP baseline GitHub Action README: https://github.com/zaproxy/action-baseline

## Issues Found
- Updated the proxy listener navigation from `Proxy > Options` to `Settings > Tools > Proxy`, matching the current Burp Suite UI.
- Updated the Firefox proxy checkbox wording to `Use this proxy server for all protocols`, matching current PortSwigger Firefox setup documentation.
- Changed the Burp CA certificate URL from `http://burp` to `http://burpsuite`, matching current PortSwigger documentation.
- Updated the intercept toggle label from `Intercept is off` to `Intercept off`, matching the current Burp Proxy documentation.
- URL-encoded SQL injection payloads that contained spaces or semicolons in HTTP request targets so the examples are valid HTTP request lines.
- Replaced the unsupported hand-written Burp scan configuration JSON with accurate guidance to create scan configurations in Burp's Scan configuration tab and export generated JSON when needed.
- Updated scan result review guidance from `Target > Issues` to `Dashboard > All issues`, matching current Burp scan result documentation.
- Updated BApp Store navigation from `Extender > BApp Store` to `Extensions > BApp Store`, matching current Burp extension documentation.
- Updated the GitHub Actions example from `zaproxy/action-baseline@v0.10.0` to `v0.15.0`, the current release shown by the official action README.
- Updated `actions/checkout` from `v4` to `v5`, matching the current ZAP action README example.
- Replaced the separate upload-artifact step with the ZAP action's documented `artifact_name` input, because the ZAP action manages scan artifact upload itself.
- Updated the Docker Compose invocation from `docker-compose` to `docker compose`, matching the current Compose plugin command style.

## Review Notes
The post remains a high-level tutorial rather than a complete penetration testing methodology. The payload examples are intentionally illustrative and should be used only with written authorization and in scoped test environments.
