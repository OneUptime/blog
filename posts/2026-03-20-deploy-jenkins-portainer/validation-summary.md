# Validation Summary: How to Deploy Jenkins via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jenkins (LTS, JDK 21 variant)
- Portainer (Stacks)
- Docker / Docker Compose
- Docker socket mount (Docker-out-of-Docker pattern)
- Jenkins Plugin Installation Manager (`jenkins-plugin-cli`)
- Jenkins declarative pipeline (Jenkinsfile, Groovy)
- Blue Ocean, Kubernetes, SSH agent and other Jenkins plugins

## Sources Consulted
- Docker Hub: `jenkins/jenkins` tags (https://hub.docker.com/r/jenkins/jenkins/tags) — confirmed `lts-jdk21` exists and is multi-arch
- Official Jenkins Docker repo: https://github.com/jenkinsci/docker (confirmed `curl` is installed in the controller image and verified the `JENKINS_HOME/secrets/initialAdminPassword` flow)
- Jenkins source: `SetupWizard.init()` behavior with `jenkins.install.runSetupWizard=false`
- Jenkins Plugin Installation Manager Tool: https://github.com/jenkinsci/plugin-installation-manager-tool (confirmed `--plugin-file` flag)
- Jenkins plugin index (https://plugins.jenkins.io) — verified plugin IDs: `blueocean`, `docker-plugin`, `git`, `pipeline-stage-view`, `credentials-binding`, `ssh-slaves`, `kubernetes`
- `ssh-agents-plugin` repo README — confirmed the plugin was renamed to "SSH Build Agents Plugin" but the plugin ID `ssh-slaves` is intentionally retained for compatibility
- Docker reference for `ENV` instruction syntax (legacy space form vs `KEY=VALUE`)

## Issues Found

1. **Contradictory setup-wizard configuration (broken instructions)** — The original first stack set `JAVA_OPTS=-Djenkins.install.runSetupWizard=false`, then the next section instructed users to read `/var/jenkins_home/secrets/initialAdminPassword` and paste it into the web UI. With the setup wizard disabled, Jenkins (a) does not generate `initialAdminPassword` (it is created by `SetupWizard.init()`) and (b) boots straight into the running state with no security realm, so there is no login prompt to paste a password into. **Fix:** removed the `JAVA_OPTS=-Djenkins.install.runSetupWizard=false` line from the basic stack so the setup wizard runs as the post's "Initial Setup" section assumes. The flag is intentionally kept in the custom-image Dockerfile section because that workflow is meant to be paired with JCasC / a Groovy init script (added a brief inline comment to that effect).

2. **Deprecated Dockerfile `ENV` syntax** — The Dockerfile used the legacy `ENV JAVA_OPTS -Djenkins.install.runSetupWizard=false` (space-separated) form, which is deprecated in modern Docker / BuildKit and is error-prone for values containing `=`. **Fix:** changed to `ENV JAVA_OPTS=-Djenkins.install.runSetupWizard=false`.

## Review Notes
- `jenkins/jenkins:lts-jdk21` is current and actively maintained; no version concerns.
- `curl` is included in the official `jenkins/jenkins` controller image, so the healthcheck `curl -s http://localhost:8080/login | grep -q Jenkins` works as written.
- `ssh-slaves` is still the correct plugin ID despite the human-readable name change to "SSH Build Agents Plugin"; no fix needed but worth knowing.
- Mounting the host's `/usr/bin/docker` binary into the container (as the stack does) only works when the host's Docker CLI is statically linked or when the container's glibc is compatible with the binary. A safer alternative is installing the `docker-ce-cli` package inside a custom image — out of scope for this post but a future improvement.
- The backup section uses `tar` against a live `/var/jenkins_home`, which can produce inconsistent snapshots for in-flight builds. For production, quiescing Jenkins or using a filesystem snapshot is preferable. Not technically wrong, just a caveat.
- Compose `version: "3.8"` is no longer required by Docker Compose v2 but remains valid and harmless.
