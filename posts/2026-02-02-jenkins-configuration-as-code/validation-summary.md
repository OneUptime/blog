# Validation Summary: How to Use Jenkins Configuration as Code

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jenkins (LTS) and Jenkins Configuration as Code (JCasC) plugin
- Docker (custom Jenkins image, `jenkins-plugin-cli`)
- Kubernetes (Jenkins Helm chart, kubernetes-plugin pod templates)
- YAML configuration / variable interpolation
- Job DSL plugin (`folder`, `multibranchPipelineJob`, `pipelineJob`)
- LDAP / Matrix / Role Strategy authorization
- Credentials plugin (username/password, SSH, secret text/file, AWS, Vault AppRole)
- HashiCorp Vault plugin
- Jenkins CLI / REST API (`reload-jcasc-configuration`, `/configuration-as-code/reload`, `/export`)
- Jenkins declarative pipelines (Jenkinsfile)
- Kubernetes CronJob / Secret

## Sources Consulted
- Jenkins Configuration as Code plugin documentation: https://github.com/jenkinsci/configuration-as-code-plugin
- JCasC variable substitution docs (`${VAR}`, `${VAR:-default}`, `${base64:VAR}`)
- Jenkins LTS UI changes (Manage Jenkins redesign in 2.346 LTS, May 2022)
- Jenkins agent protocols history — JNLP1/JNLP2/JNLP3 protocols removed in Jenkins 2.219 (April 2020), only `JNLP4-connect` remains
- Agent → Controller security: made always-on and the legacy "kill switch" configuration removed (Jenkins 2.319+, December 2021)
- Jenkins Helm chart (`controller.installPlugins`, `controller.JCasC.configScripts`)
- kubernetes-plugin (Jenkins) pod template schema
- Job DSL plugin reference (`multibranchPipelineJob`, `workflowBranchProjectFactory`, `cpsScm`, `periodicFolderTrigger`)
- AWS Credentials plugin (`aws`, `awsCredentialsFromWebIdentity` symbols)
- HashiCorp Vault Jenkins plugin (`hashicorpVault`, `vaultAppRoleCredential`)

## Issues Found

1. **Outdated Jenkins UI navigation path.** The post said "Manage Jenkins > Manage Plugins > Available". Since the Manage Jenkins page redesign in Jenkins 2.346 LTS (May 2022), the menu item is just "Plugins" and the sub-tab is "Available plugins". Updated to "Manage Jenkins > Plugins > Available plugins".

2. **Invalid/non-existent JCasC configurators in the "Security Hardening" example.** The example used `jenkins.remotingSecurity.enabled` and a `security.agentProtocolControl` block with `JNLP-connect`, `JNLP2-connect`, `JNLP4-connect` entries. These are not standard JCasC configurators:
   - `remotingSecurity` corresponds to the legacy "Agent → Master security" feature that was made mandatory and removed from the UI/configuration in Jenkins 2.319 (December 2021).
   - `agentProtocolControl` is not a JCasC schema element. The supported way to enable/disable agent protocols is `jenkins.agentProtocols: [...]`.
   - JNLP1/JNLP2/JNLP3 protocols were removed in Jenkins 2.219 (April 2020), so showing them as "deprecated, disable them" is misleading — they no longer exist.
   Replaced both blocks with a single correct `jenkins.agentProtocols` list containing `JNLP4-connect` and `Ping`, and adjusted surrounding comments.

## Review Notes

- The post does not pin a JCasC plugin or Jenkins version. Schemas evolve, so readers using very old or very new versions should consult the JCasC reference (Manage Jenkins → Configuration as Code → Documentation) for their installed version.
- The Kubernetes cloud and pod-template snippets use the kubernetes-plugin field names that have been stable for several years, but the plugin has been actively gaining new fields; readers may want richer pod YAML via `yaml:` blocks for advanced use.
- The `awsCredentialsFromWebIdentity` symbol is exposed by recent versions of the AWS Credentials plugin; older versions may not support it.
- The "Validate JCasC Schema" pipeline stage starts Jenkins with `--argumentsRealm.passwd.admin=...` — these flags are accepted by the embedded Winstone servlet container but are intended for quick smoke tests, not real validation. A more robust approach is `JENKINS_HOME=$(mktemp -d) java -jar jenkins.war --httpPort=8080` and then hitting `/configuration-as-code/check`. Left as-is since it is functional and matches what the author intended.
- `mode: EXCLUSIVE` on the controller (Jenkins object) is correct for restricting builds to labeled nodes; combined with `numExecutors: 0` it is somewhat redundant but harmless.
