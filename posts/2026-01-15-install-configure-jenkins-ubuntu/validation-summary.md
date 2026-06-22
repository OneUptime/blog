# Validation Summary: How to Install and Configure Jenkins on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (installation and configuration walkthrough)

## Technologies Covered
- Jenkins (CI/CD automation server)
- Ubuntu / Debian (apt packaging, systemd)
- Java (OpenJDK 17 / 21)
- Declarative Pipeline (Groovy / Jenkinsfile)
- Docker and Kubernetes build agents
- Nginx reverse proxy / TLS
- GitHub and generic webhooks

## Sources Consulted
- Jenkins — Installing Jenkins on Linux: https://www.jenkins.io/doc/book/installing/linux/
- Jenkins — Managing systemd services: https://www.jenkins.io/doc/book/system-administration/systemd-services/
- Jenkins — Java support policy: https://www.jenkins.io/doc/book/platform-information/support-policy-java/
- Jenkins package repository (live key check): https://pkg.jenkins.io/debian-stable/ (verified `jenkins.io-2023.key` vs `jenkins.io-2026.key` fingerprints and expiry)
- Jenkins Pipeline syntax reference: https://www.jenkins.io/doc/book/pipeline/syntax/

## Issues Found
1. **Expired/outdated GPG signing key.** The post fetched `https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key`. A live check showed the 2023 key (fingerprint `63667EE7…5975CA`) **expired on 2026-03-26**, and the `debian-stable` repo is now signed with the 2025/2026 key (`5E386EAD…ABFC68`, valid to 2028-12-21). Using the expired key breaks `apt` verification. Changed the URL to `jenkins.io-2026.key`, matching the current official installation docs.

2. **Java 11 listed as supported.** Prerequisites stated "Java 11 or 17". Per the Jenkins Java support policy, Java 11 support was dropped (Java 17/21 became the minimum around LTS 2.479.1, Oct 2024); current releases support Java 17, 21, or 25. Changed to "Java 17 or 21". (The install step already uses OpenJDK 17, which remains supported, so it was left unchanged.)

3. **HTTPS configuration via `/etc/default/jenkins`.** The post configured HTTPS by editing `/etc/default/jenkins` with `JENKINS_ARGS`. Modern Jenkins Debian/Ubuntu packages (since ~2.335) run under systemd and no longer use `/etc/default/jenkins`. Replaced with the correct `systemctl edit jenkins` drop-in (`override.conf`) using `JENKINS_PORT`, `JENKINS_HTTPS_PORT`, `JENKINS_HTTPS_KEYSTORE`, and `JENKINS_HTTPS_KEYSTORE_PASSWORD` environment variables, followed by a service restart.

4. **Memory/heap configuration via `/etc/default/jenkins` with wrong variable.** The troubleshooting section edited `/etc/default/jenkins` and set `JAVA_ARGS`. The file is obsolete and the systemd unit reads `JAVA_OPTS`, not `JAVA_ARGS`. Replaced with a `systemctl edit jenkins` override setting `Environment="JAVA_OPTS=-Xmx2048m"`.

## Review Notes
- The Declarative Pipeline / Jenkinsfile examples (stages, `parallel`, `when { branch }`, `environment`, `options`, `post`, `withCredentials`, `sshagent`, Docker/Kubernetes agents, `GenericTrigger`) are syntactically valid against current Pipeline syntax.
- The apt repository line, `systemctl` service commands, initial-admin-password path (`/var/lib/jenkins/secrets/initialAdminPassword`), JENKINS_HOME backup layout, keytool usage, and Nginx reverse-proxy config are all correct.
- Minor (not changed): the log path `sudo tail -f /var/log/jenkins/jenkins.log` may not exist on systemd-based installs, where output goes to the journal — the post already provides `journalctl -u jenkins -f` as the alternative immediately below it, so the section remains usable.
- Minor (not changed): the official docs now place the keyring under `/etc/apt/keyrings/` rather than `/usr/share/keyrings/`; the post's path still works, so it was left as-is.
- The Cobertura plugin is effectively superseded by the Coverage plugin for new setups, but it is still functional and not incorrect.
