# Validation Summary: How to Run Jenkins in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jenkins
- Jenkins official container image
- Jenkins plugin CLI
- Jenkins Configuration as Code
- Podman
- Container volumes and port publishing
- Jenkins Remote Access API

## Sources Consulted
- Jenkins official Docker image documentation: https://github.com/jenkinsci/docker
- Jenkins Configuration as Code plugin documentation: https://plugins.jenkins.io/configuration-as-code
- Jenkins Remote Access API documentation: https://www.jenkins.io/doc/book/using/remote-access-api/
- Jenkins CSRF protection documentation: https://www.jenkins.io/doc/book/security/csrf-protection/
- Podman run documentation: https://docs.podman.io/en/v4.3/markdown/podman-run.1.html

## Issues Found
- The run examples used the short image name `jenkins/jenkins:lts` after pulling `docker.io/jenkins/jenkins:lts`. I changed the Podman examples to use the fully qualified image name to avoid short-name resolution prompts or ambiguity.
- The plugin installation section referred to the old install-plugins script wording. I changed it to Jenkins plugin CLI, which matches the current official Jenkins image workflow using `jenkins-plugin-cli`.
- The custom Jenkins image copied `plugins.txt` without setting ownership. I changed the copy instruction to `COPY --chown=jenkins:jenkins`, matching official Jenkins image examples.
- The JCasC example ran `jenkins/jenkins:lts` without installing the Configuration as Code plugin. I added `configuration-as-code` to the plugin list and changed the JCasC run command to use the custom image.
- The JCasC example mounted the configuration under `/var/jenkins_home` while also mounting a named volume at `/var/jenkins_home`. I changed the JCasC config mount to `/tmp/jenkins.yaml` and pointed `CASC_JENKINS_CONFIG` there to avoid hidden or conflicting nested mounts.
- The management section used unauthenticated `curl` commands for Jenkins API operations. I changed them to use HTTP Basic authentication with a Jenkins API token, which is the recommended approach for scripted clients and avoids CSRF crumb requirements for POST requests.
- The cleanup command omitted the `jenkins-limited` container created earlier. I added it to the removal command.
- The post described Podman execution as rootless unconditionally. I changed the wording to say Jenkins can run in a rootless container and that Podman's rootless execution mode adds the security boundary.

## Review Notes
- Podman was not installed in the local environment, so CLI behavior was verified against official Podman documentation rather than local `podman --help` output.
- The examples reuse the same `jenkins-data` volume across several alternative container runs. That is acceptable as tutorial shorthand, but in production only one Jenkins controller should actively use a given Jenkins home volume at a time.
