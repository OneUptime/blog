# Validation Summary: How to Configure Jenkins Agents with SSH on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Jenkins agents and nodes
- Jenkins SSH Build Agents plugin
- OpenSSH key authentication
- Red Hat build of OpenJDK
- Jenkins Declarative Pipeline
- Jenkins CLI

## Sources Consulted
- Jenkins Java Support Policy: https://www.jenkins.io/doc/book/platform-information/support-policy-java/
- Jenkins Managing Nodes documentation: https://www.jenkins.io/doc/book/managing/nodes/
- Jenkins SSH Build Agents plugin documentation: https://plugins.jenkins.io/ssh-slaves
- Jenkins Declarative Pipeline Syntax: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins CLI documentation: https://www.jenkins.io/doc/book/managing/cli/
- Jenkins CLI command API reference: https://javadoc.jenkins.io/archive/jenkins-2.440.3/hudson/cli/package-summary.html
- Red Hat build of OpenJDK 21 installation on RHEL: https://docs.redhat.com/en/documentation/red_hat_build_of_openjdk/21/html/installing_and_using_red_hat_build_of_openjdk_21_on_rhel/installing-openjdk-on-rhel_openjdk
- Local command help/version checks for OpenSSH `ssh`, `ssh-keygen`, and Linux `useradd`.

## Issues Found
- The post installed Java 17 and described it as required for the agent. Current Jenkins releases require Java 21 or Java 25 for Jenkins 2.555.1 LTS and newer, while older recent releases had different supported ranges. I changed the example to install `java-21-openjdk` and clarified that the Java version should be supported by the Jenkins controller.
- The controller-side SSH key generation assumed `/var/lib/jenkins/.ssh` already existed. `ssh-keygen -f /var/lib/jenkins/.ssh/id_ed25519` fails if that directory is missing. I added `sudo install -d -m 700 -o jenkins -g jenkins /var/lib/jenkins/.ssh` before generating the key.
- The Jenkins CLI section described `get-node` as a connectivity check. Jenkins `get-node` returns the node definition/configuration, while `wait-node-online` is the CLI command that waits for an agent to become online. I updated the comment and added a `wait-node-online rhel9-agent-01` example.

## Review Notes
The remaining commands and snippets are technically sound for a Jenkins SSH agent setup on RHEL when the Jenkins controller has the SSH Build Agents plugin installed and the selected Host Key Verification Strategy has a matching known_hosts entry. The pipeline labels assume corresponding Jenkins nodes have been configured with the shown labels.
