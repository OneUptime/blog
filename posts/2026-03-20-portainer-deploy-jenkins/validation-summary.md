# Validation Summary: How to Deploy Jenkins via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Jenkins
- Docker / Docker Compose
- Portainer
- Jenkins Pipeline (Declarative Pipeline / Groovy)
- Jenkins plugins and credentials

## Sources Consulted
- Jenkins: Installing Jenkins in Docker: https://www.jenkins.io/doc/book/installing/docker/
- Jenkins official Docker image README: https://github.com/jenkinsci/docker
- Jenkins Plugin Installation Manager Tool: https://github.com/jenkinsci/plugin-installation-manager-tool
- Jenkins: Using a Jenkinsfile: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/
- Jenkins: Using Docker with Pipeline: https://www.jenkins.io/doc/book/pipeline/docker/
- Jenkins Pipeline basic steps (`deleteDir`): https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/
- Portainer stack webhooks: https://docs.portainer.io/sts/user/docker/stacks/webhooks
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Blue Ocean plugin page: https://plugins.jenkins.io/blueocean/

## Issues Found
- The description said "Docker-in-Docker support", but the stack mounts the host Docker socket and host Docker CLI instead of running a Docker-in-Docker sidecar. I changed the wording to match the actual deployment pattern.
- The Compose snippet used the top-level `version: "3.8"` field, which Docker now marks as obsolete in the Compose Specification. I removed the field.
- The plugin installation section called `jenkins-plugin-cli` "Jenkins CLI" and omitted the extra copy step required when using the bundled plugin manager inside a running container. I updated the commands to copy the downloaded plugins into `/var/jenkins_home/plugins` and restart Jenkins.
- The example Jenkinsfile relied on an undeclared shared `dockerImage` variable across stages and used `cleanWs()`, which comes from the Workspace Cleanup plugin and was not installed anywhere in the post. I declared the image variable explicitly and replaced `cleanWs()` with built-in `deleteDir()`.
- The Portainer deployment example used the wrong webhook path pattern and implied a Portainer API token was the relevant credential. I changed the pipeline to use a Secret text credential for the Portainer stack webhook URL instead.
- The Portainer UI steps were inaccurate. I updated them to the documented flow: open the stack's **Editor** tab, enable **Create a stack webhook**, and copy the webhook URL.
- The post omitted an important Portainer limitation: stack webhooks require Portainer Business Edition and are only available on non-Edge environments. I added that note.
- The `50000` port comment implied it was always required. I clarified that it is for inbound agents and is optional.

## Review Notes
- Blue Ocean is still installable, but its plugin page says it will not receive further functionality updates and only receives selective fixes.
- Mounting `/var/run/docker.sock` gives the Jenkins container broad control over the host Docker daemon. The article's pattern is common, but it has significant security implications and should only be used on trusted hosts.
