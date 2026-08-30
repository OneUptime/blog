# Validation Summary: How to Add Linux Nodes to Rundeck with SSH Keys Stored in Key Storage

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Rundeck / PagerDuty Runbook Automation
- Rundeck Key Storage and storage ACL policies
- Rundeck Resource YAML v1.3 and File node sources
- Rundeck SSH, SSH-J, JSch, SCP, and SFTP node-execution plugins
- OpenSSH (`ssh`, `ssh-keygen`, `authorized_keys`, and `known_hosts`)
- GNU/Linux file ownership and permissions
- `sudo` / `sudoers`
- Enterprise Runner remote node dispatch

## Sources Consulted
- Rundeck Key Storage: https://docs.rundeck.com/docs/manual/key-storage/
- Rundeck SSH Node Execution: https://docs.rundeck.com/docs/manual/projects/node-execution/ssh.html
- Rundeck Resource YAML v1.3: https://docs.rundeck.com/docs/manual/document-format-reference/resource-yaml-v13.html
- Rundeck Node Sources overview: https://docs.rundeck.com/docs/manual/projects/resource-model-sources/
- Rundeck built-in File node source: https://docs.rundeck.com/docs/manual/projects/resource-model-sources/builtin.html
- Rundeck Project Settings (node executor and file copier): https://docs.rundeck.com/docs/manual/project-settings.html
- Rundeck Node Filters: https://docs.rundeck.com/docs/manual/11-node-filters.html
- Rundeck Key Storage access control: https://docs.rundeck.com/docs/administration/security/authorization.html#key-storage-access-control
- Rundeck Enterprise Runner node dispatch: https://docs.rundeck.com/docs/administration/runner/runner-management/node-dispatch.html
- Rundeck OpenSSH executor requirements: https://docs.rundeck.com/docs/manual/projects/node-execution/openssh.html
- Rundeck SSH-J plugin source: https://github.com/rundeck-plugins/sshj-plugin
- Rundeck JSch keyfile validation source: https://github.com/rundeck/rundeck/blob/main/plugins/jsch-plugin/src/main/java/org/rundeck/plugins/jsch/net/SSHTaskBuilder.java#L659-L683
- OpenSSH `ssh-keygen(1)`: https://man.openbsd.org/ssh-keygen.1
- OpenSSH `ssh_config(5)`: https://man.openbsd.org/ssh_config.5
- OpenSSH `sshd(8)`: https://man.openbsd.org/sshd.8
- GNU Coreutils `install`: https://www.gnu.org/software/coreutils/manual/html_node/install-invocation.html
- Linux `sudoers(5)`: https://man7.org/linux/man-pages/man5/sudoers.5.html

## Issues Found
- The `install` commands set another account's ownership and write under `/home/deploy`, which ordinarily requires elevated privileges. The text now states that root privileges are required, and the examples use `sudo`.
- Passing `-i ./rundeck-prod` does not prevent OpenSSH from offering identities supplied by configuration or an agent, so the test could succeed with a different key. Added `-o IdentitiesOnly=yes` so the command validates the intended private key.
- `BatchMode=yes` disables host-key confirmation prompts as well as password and passphrase prompts. Added a requirement to verify the target host key in the execution identity's `known_hosts` before running the batch test.
- The storage path hard-coded `Operations` without identifying it as the project-name segment. Added an instruction to replace `Operations` with the exact Rundeck project name so the key is stored and authorized in the intended project scope.
- The `Auth fail` diagnostic listed too narrow a set of causes. Expanded it to include public-key permissions, SSH server policy, and executor/key-algorithm compatibility.
- The quoted missing-key error did not match Rundeck's JSch message and appeared executor-independent. Corrected it to `SSH Keyfile does not exist` and identified it as a JSch executor diagnostic.

## Review Notes
- Current Rundeck documentation recommends SSH-J and identifies it as the default for new projects because it supports current SSH algorithms. Existing projects can still use JSch or the native OpenSSH executor, so key-format, algorithm, and passphrase support must be checked for the selected executor.
- The Resource YAML map structure, all shown node attributes, `project.ssh-key-storage-path`, node-to-project-to-framework precedence, `name: app01`, and `tags: app+production` were verified as correct.
- The `/keys/project/Operations/ssh/rundeck-prod` URI form is correct when the project is literally named `Operations`; Key Storage paths and project names must match exactly.
- Node ACLs can also affect which nodes a user can see or target. The post's `No matched nodes` guidance remains correct for the inventory/filter troubleshooting sequence described.
