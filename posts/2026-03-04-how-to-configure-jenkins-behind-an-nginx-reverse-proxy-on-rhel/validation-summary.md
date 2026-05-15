# Validation Summary: How to Configure Jenkins Behind an Nginx Reverse Proxy on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Jenkins
- Nginx
- systemd
- firewalld
- SELinux
- OpenSSL
- TLS
- WebSocket reverse proxying

## Sources Consulted
- Jenkins Linux installation documentation: https://www.jenkins.io/doc/book/installing/linux/
- Jenkins systemd service documentation: https://www.jenkins.io/doc/book/system-administration/systemd-services/
- Jenkins initial settings and networking command-line parameters: https://www.jenkins.io/doc/book/installing/initial-settings/
- Jenkins Nginx reverse proxy documentation: https://www.jenkins.io/doc/book/system-administration/reverse-proxy-configuration-with-jenkins/reverse-proxy-configuration-nginx/
- Jenkins Java support policy: https://www.jenkins.io/doc/book/platform-information/support-policy-java/
- Jenkins repository signing key announcement: https://www.jenkins.io/blog/2025/12/23/repository-signing-keys-changing/
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat Nginx reverse proxy documentation for SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx
- Local OpenSSL `req -help` output

## Issues Found
- The Jenkins installation commands used the older `redhat-stable` repository URL, the 2023 signing key, and Java 17. Updated them to the current official `rpm-stable` repository URL, the 2026 signing key, and Java 21 with `fontconfig`, matching current Jenkins RPM guidance and Java support requirements.
- The Jenkins localhost binding example used `JENKINS_LISTEN_ADDRESS`, which is not the documented Jenkins networking option. Changed it to pass the documented `--httpListenAddress=127.0.0.1` option through `JENKINS_OPTS` while keeping `JENKINS_PORT=8080`.
- The Nginx WebSocket proxy example did not use the recommended `map`-based `Connection` header handling and only applied upgrade headers in the `/wsagents` location. Added the `map` and applied `Upgrade` and `Connection` headers consistently.
- The Nginx HTTPS listener used `listen 443 ssl http2;`, which is deprecated in current Nginx. Updated it to `listen 443 ssl;` with `http2 on;`.
- The self-signed certificate command only set the certificate common name. Added a `subjectAltName` extension for `jenkins.example.com`, which modern TLS clients expect for hostname validation.
- The RHEL setup did not account for SELinux blocking Nginx upstream connections in enforcing mode. Added `setsebool -P httpd_can_network_connect 1`, as documented by Red Hat for Nginx reverse proxy traffic.
- The closing note attributed `proxy_request_buffering off` only to large file uploads. Updated the explanation to mention Jenkins HTTP CLI commands and streaming uploads, matching Jenkins reverse proxy guidance.

## Review Notes
The updated `http2 on;` directive follows current Nginx documentation and requires Nginx 1.25.1 or newer. Older RHEL Nginx module streams may still require the legacy `listen ... http2` syntax.
