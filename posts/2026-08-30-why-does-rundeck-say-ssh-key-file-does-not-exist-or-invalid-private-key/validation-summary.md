# Validation Summary: Why Does Rundeck Say "SSH Key File Does Not Exist" or "Invalid Private Key"?

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- Rundeck and PagerDuty Runbook Automation
- Rundeck SSH Node Executors and File Copiers
- Rundeck Key Storage and project-scoped keys
- Enterprise Runners and distributed node dispatch
- OpenSSH private/public keys and authentication
- Linux filesystem ownership and permissions
- YAML resource-model node definitions

## Sources Consulted

- [Rundeck: SSH Node Execution](https://docs.rundeck.com/docs/manual/projects/node-execution/ssh.html)
- [Rundeck: Key Storage](https://docs.rundeck.com/docs/manual/key-storage/)
- [Rundeck: Job Options and Secure Remote Authentication](https://docs.rundeck.com/docs/manual/jobs/job-options.html)
- [Rundeck: Built-in Node Execution Plugins](https://docs.rundeck.com/docs/manual/projects/node-execution/builtin.html)
- [Rundeck: OpenSSH Node Execution Plugins](https://docs.rundeck.com/docs/manual/projects/node-execution/openssh.html)
- [Rundeck: RESOURCE-YAML format](https://docs.rundeck.com/docs/manual/document-format-reference/resource-yaml-v13.html)
- [Rundeck: Docker Configuration Reference](https://docs.rundeck.com/docs/administration/configuration/docker.html)
- [Rundeck: Runner Node Dispatch](https://docs.rundeck.com/docs/administration/runner/runner-management/node-dispatch.html)
- [Rundeck: Plugins Installed on Runners](https://docs.rundeck.com/docs/administration/runner/runner-plugins/runner-plugins.html)
- [Rundeck: Node Sources and cache delay](https://docs.rundeck.com/docs/learning/getting-started/jobs/node-sources.html)
- [OpenBSD manual: `ssh-keygen(1)`](https://man.openbsd.org/ssh-keygen.1)
- [OpenBSD manual: `ssh(1)`](https://man.openbsd.org/ssh.1)
- [OpenBSD manual: `ssh_config(5)`](https://man.openbsd.org/ssh_config.5)
- [OpenBSD manual: `sshd_config(5)`](https://man.openbsd.org/sshd_config.5)
- [OpenSSH: Legacy Options](https://www.openssh.com/legacy.html)
- [OpenSSH portable private-key parser](https://github.com/openssh/openssh-portable/blob/master/sshkey.c)
- [GNU Coreutils: File access tests](https://www.gnu.org/software/coreutils/manual/html_node/Access-permission-tests.html)
- [Sudo manual](https://www.sudo.ws/docs/man/sudo.man/)

## Issues Found

- The post treated the Node Executor as the only component that loads an SSH key. Rundeck invokes the File Copier first for script and file steps, so a key error can originate there. Updated the diagnosis, runtime-location, version, and logging guidance to include the File Copier where applicable.
- The `ssh-keygen -y` check ran as the invoking shell user even though the example makes the key readable only by `rundeck`, and any rejection was classified as corruption. Updated the command to run as the service identity and clarified that an encrypted key must first be given the correct passphrase and that an otherwise valid format can be unsupported by the installed OpenSSH version.
- The corruption list incorrectly treated ordinary Base64 wrapping and leading body whitespace as inherently invalid. OpenSSH removes line endings from the encoded body and its decoder tolerates normal wrapping. Replaced those examples with missing markers, truncation or alteration, parser-incompatible line endings, and literal JSON escape sequences.
- The direct `ssh -i` test did not prove that public-key authentication used the intended identity: OpenSSH can consider agent identities and other authentication mechanisms. Added `IdentitiesOnly=yes` and `PreferredAuthentications=publickey`, set the target service account's home with `sudo -H`, and documented that the shown `BatchMode=yes` source-file test assumes an unencrypted key and an already trusted host key.
- The permission-changing commands lacked privilege escalation, and mode `0700` on an incorrectly owned `.ssh` directory would still block the service account. Added `sudo` and set ownership on both the directory and private-key file.
- The examples assumed every execution environment uses the `rundeck` account. Clarified that this is the common package-install account and that Runner or customized-container checks must use the actual process identity.
- The public-key and `authorized_keys` wording was too categorical. Clarified that an OpenSSH public-key file typically begins with a key type, that the remote account can use any configured authorized-key source, and that file ownership/mode checks apply when `AuthorizedKeysFile` and `StrictModes` are in use.
- The Key Storage warning could be read as requiring a leading slash even though official examples use both `keys/...` and `/keys/...`. Rephrased it to require the top-level `keys` segment.
- The encrypted-key guidance mentioned only an interactive Secure Remote Authentication option. Added the documented `ssh-key-passphrase-storage-path` alternative and its project/framework equivalents.
- The post treated both `Auth fail` and `Permission denied (publickey)` as conclusive proof of remote rejection. Clarified that `Permission denied (publickey)` is a remote authentication failure while a provider's generic `Auth fail` should be interpreted using its exception chain.
- The node-refresh instruction applied to every configuration change even though the relevant cache is the node-source cache. Limited the instruction to changes in node-source data and noted the configured cache delay.

## Review Notes

- The filesystem and Key Storage precedence chains, all property names, `privateKey` authentication value, YAML node-map syntax, and project-scoped Key Storage example are correct.
- Rundeck's current documentation recommends SSH-J and uses it by default for new projects, while older projects and installations can use other SSH providers. The post appropriately keeps compatibility advice provider- and version-aware.
- Official Key Storage examples inconsistently show paths with and without an initial slash and also retain a legacy plural `keys/projects/...` convention. The current project-scoped formula uses the singular `keys/project/[project-name]/...` hierarchy.
- The `ssh-rsa` text at the start of an RSA public key does not by itself mean the connection must use the deprecated RSA/SHA-1 signature algorithm; modern OpenSSH can use RSA/SHA-2 signatures with an existing RSA key.
- All four external links in the post resolve to the intended current official Rundeck documentation pages.
