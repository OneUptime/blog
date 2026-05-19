# Validation Summary: How to Install and Configure Jenkins on Ubuntu Server

## Status
validated

## Post Type
Tutorial / installation and configuration guide

## Technologies Covered
- Ubuntu Server 22.04 and 24.04
- Jenkins LTS
- OpenJDK / Java
- systemd
- Nginx reverse proxy
- Let's Encrypt / Certbot
- Jenkins CLI and Groovy administration scripts
- Jenkins Declarative Pipeline
- Jenkins credentials and security settings
- UFW

## Sources Consulted
- Jenkins Linux installation documentation: https://www.jenkins.io/doc/book/installing/linux/
- Jenkins Nginx reverse proxy documentation: https://www.jenkins.io/doc/book/system-administration/reverse-proxy-configuration-with-jenkins/reverse-proxy-configuration-nginx/
- Jenkins reverse proxy configuration guide: https://www.jenkins.io/doc/book/system-administration/reverse-proxy-configuration-with-jenkins/
- Jenkins Pipeline syntax reference: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkinsfile and environment variable documentation: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/
- Jenkins credentials binding Pipeline step documentation: https://www.jenkins.io/doc/pipeline/steps/credentials-binding/
- Jenkins CLI documentation: https://www.jenkins.io/doc/book/managing/cli/
- JenkinsLocationConfiguration Java API: https://javadoc.jenkins.io/jenkins/model/JenkinsLocationConfiguration.html
- Jenkins controller isolation documentation: https://www.jenkins.io/doc/book/security/controller-isolation/

## Issues Found
- The post said Jenkins LTS requires Java 17 or 21. Current Jenkins installation documentation specifies Java 21 or later, so the prerequisite and Java installation explanation were updated.
- The Jenkins apt repository setup used the older 2023 signing key path under `/usr/share/keyrings`. Current Jenkins documentation uses the 2026 key under `/etc/apt/keyrings`, so the key URL and `signed-by` path were updated.
- The port-change instructions still referenced `/etc/default/jenkins` and `HTTP_PORT`, which applies to older packaging. Current Debian/Ubuntu Jenkins packages use systemd overrides, so the instructions were narrowed to `systemctl edit jenkins` with `JENKINS_PORT`.
- The Nginx reverse proxy snippet set `Connection "upgrade"` unconditionally and omitted `proxy_request_buffering off`. The Jenkins Nginx docs use a `map` for WebSocket upgrade handling and disable proxy request buffering for CLI requests, so the snippet was corrected.
- The Groovy CLI example attempted to set the Jenkins URL through `Jenkins.getInstance().setRootUrl(...)`, which is not the current API for the root URL setting. It now uses `JenkinsLocationConfiguration.get().setUrl(...)`.
- The Pipeline Docker stages used Groovy-interpolated double-quoted shell strings for values supplied as environment variables and credentials. The shell blocks now use single-quoted Pipeline strings and shell expansion, matching Jenkins credential handling guidance and avoiding accidental secret interpolation by Groovy.
- The security hardening section referenced disabling Jenkins CLI over remoting and editing `/etc/default/jenkins`. Remoting-based CLI has been removed from modern Jenkins, so this was replaced with guidance to keep CLI defaults and use API tokens.
- The security hardening list referred to disabling "agent to master file access." Current Jenkins documentation describes Agent to Controller Access Control and says to keep it enabled, so the wording was updated.

## Review Notes
- The guide is technically relevant and useful after the corrections above.
- The sample Pipeline assumes the required Jenkins plugins are installed, including Pipeline, JUnit, Credentials Binding, and Workspace Cleanup.
- The `when { branch 'main' }` conditions are correct for Multibranch Pipeline or Pipeline from SCM jobs; they may not behave as expected for manually entered Pipeline scripts without branch metadata.
