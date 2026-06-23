# Validation Summary: How to Install and Configure Jenkins for CI/CD on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Linux
- Jenkins
- Jenkins Pipeline
- Jenkins plugins
- Java / OpenJDK
- Git and GitHub webhooks
- Docker
- Kubernetes deployment commands
- Nginx reverse proxy
- Prometheus monitoring
- Bash backup and restore scripts

## Sources Consulted
- Jenkins Linux installation documentation: https://www.jenkins.io/doc/book/installing/linux/
- Jenkins Java support policy: https://www.jenkins.io/doc/book/platform-information/support-policy-java/
- Jenkins 2026 Linux repository signing key announcement: https://www.jenkins.io/blog/2025/12/23/repository-signing-keys-changing/
- Jenkins systemd service documentation: https://www.jenkins.io/doc/book/system-administration/systemd-services/
- Jenkins Pipeline syntax reference: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Docker Pipeline documentation: https://www.jenkins.io/doc/book/pipeline/docker/
- Jenkins credentials documentation: https://www.jenkins.io/doc/book/using/using-credentials/
- Jenkins Nginx reverse proxy documentation: https://www.jenkins.io/doc/book/system-administration/reverse-proxy-configuration-with-jenkins/reverse-proxy-configuration-nginx/
- Jenkins Coverage Plugin Pipeline step reference: https://www.jenkins.io/doc/pipeline/steps/coverage/
- Jenkins Role Strategy plugin documentation: https://plugins.jenkins.io/role-strategy/
- Jenkins Configuration as Code role strategy example: https://github.com/jenkinsci/configuration-as-code-plugin/blob/master/demos/role-strategy-auth/README.md
- Ubuntu Java package availability reference: https://ubuntu.com/developers/docs/reference/availability/java/
- NodeSource Node.js binary distribution documentation: https://github.com/nodesource/distributions/blob/master/DEV_README.md

## Issues Found
- Jenkins Java prerequisites and install commands were outdated for current Jenkins releases. Updated the guide from Java 11/17 and OpenJDK 17 to Java 21/25 support and OpenJDK 21 install/configuration commands.
- Jenkins apt repository setup used the old 2023 signing key path. Updated it to create `/etc/apt/keyrings` and use the 2026 Jenkins repository signing key.
- Systemd-era Jenkins service troubleshooting used old `/etc/default/jenkins` and `HTTP_PORT` edits. Replaced those examples with `systemctl edit jenkins` overrides for port, Java home, and heap settings.
- A scripted Pipeline example used the deprecated `publishCoverage` step and mismatched LCOV detection with a Cobertura adapter. Replaced it with the current `recordCoverage` step using the LCOV parser.
- Git SSH setup assumed `/var/lib/jenkins/.ssh` already existed and disabled host key checking. Added directory creation and changed host key handling to `StrictHostKeyChecking accept-new`.
- Docker agent examples used Java 17 Maven images and a Docker-in-Docker image while mounting the host Docker socket. Updated Maven images to Java 21 and changed the Docker build agent to `docker:24-cli`.
- Nginx WebSocket proxy headers forced `Connection: upgrade` on every request. Added the standard `$connection_upgrade` map and used it in the proxy header.
- Security and architecture wording still used "master" for Jenkins. Updated those references to "controller".
- The backup script's `*.xml` item would glob in the caller's current directory rather than `JENKINS_HOME`. Changed the script to `cd` into `JENKINS_HOME` before creating the archive.
- The Configuration as Code comment incorrectly described the role strategy example as matrix-based security. Corrected it to role-based security.

## Review Notes
- The examples are broadly correct but assume the named Jenkins plugins are installed where plugin-specific Pipeline steps are used.
- Some snippets are illustrative and still require project-specific configuration such as credentials IDs, Kubernetes contexts, GitHub tokens, SonarQube servers, Slack configuration, and deployment targets.
