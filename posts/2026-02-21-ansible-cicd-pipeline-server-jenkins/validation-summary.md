# Validation Summary: How to Use Ansible to Set Up a CI/CD Pipeline Server (Jenkins)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Jenkins
- Jenkins CLI
- Groovy init hooks
- Ubuntu/Debian APT repositories
- systemd
- Nginx reverse proxy configuration
- XML job configuration

## Sources Consulted
- Jenkins Linux installation documentation: https://www.jenkins.io/doc/book/installing/linux/
- Jenkins Java 21 upgrade documentation: https://www.jenkins.io/doc/book/platform-information/upgrade-java-to-21/
- Jenkins system properties documentation: https://www.jenkins.io/doc/book/managing/system-properties/
- Jenkins CLI documentation: https://www.jenkins.io/doc/book/managing/cli/
- Jenkins plugin management documentation: https://www.jenkins.io/doc/book/managing/plugins/
- Jenkins Nginx reverse proxy documentation: https://www.jenkins.io/doc/book/system-administration/reverse-proxy-configuration-with-jenkins/reverse-proxy-configuration-nginx/
- Jenkins Remote Access API documentation: https://www.jenkins.io/doc/book/using/remote-access-api/
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible Vault documentation: https://docs.ansible.com/ansible/6/user_guide/vault.html
- W3C XML 1.0 Recommendation: https://www.w3.org/TR/xml/

## Issues Found
- The post targeted Ubuntu 22.04 with OpenJDK 17, but current Jenkins Linux documentation uses Ubuntu 24.04 and requires Java 21 or later for the current package install path. Updated the prerequisite and package list to Ubuntu 24.04 and `openjdk-21-jre`.
- The Jenkins APT repository setup used the deprecated `apt_key` pattern and the expired 2023-era key URL. Replaced it with `/etc/apt/keyrings/jenkins-keyring.asc`, the Jenkins 2026 signing key, and an APT source entry with `signed-by`.
- The playbook wrote Jenkins options to `/etc/default/jenkins`, which is not the recommended systemd override path for current Jenkins packages. Replaced it with a systemd drop-in under `/etc/systemd/system/jenkins.service.d/override.conf` and added a daemon-reload handler.
- The original flow tried to use the initial setup password for plugin installation and later security configuration. Reworked the sequence to prevent service autostart, create a Jenkins init hook before first startup, disable the setup wizard with the documented system property, and authenticate the CLI with the configured admin account.
- The security configuration used `/scriptText` after startup, which is brittle because Jenkins POST endpoints may require crumbs and the initial setup wizard can restrict access. Replaced it with a first-start Groovy init hook and removed the hook after startup.
- The seed job XML placed a comment before the XML declaration, which makes the declaration invalid. Moved the XML declaration to the beginning of the document.
- The Nginx reverse proxy snippet was missing Jenkins-recommended HTTP/1.1 and request buffering settings for modern Jenkins traffic, referenced a `restart nginx` handler that was not defined, and did not enable the site. Added those settings, the handler, and a symlink task.
- The verification example referenced `jenkins_info.json.hudson_version`, which is not the documented way to read the Jenkins version. Updated it to use the lower-case `x_jenkins` response header returned by Ansible's `uri` module.
- The post claimed it created pipeline jobs even though it only included a seed job XML template. Adjusted the description and intro wording to refer to a pipeline job template.

## Review Notes
The plugin list and CLI command are plausible for an online Jenkins controller, but production environments may prefer a pinned plugin catalog or Jenkins Configuration as Code for stronger repeatability. The Nginx snippet assumes certificates already exist at the Let's Encrypt paths shown.
