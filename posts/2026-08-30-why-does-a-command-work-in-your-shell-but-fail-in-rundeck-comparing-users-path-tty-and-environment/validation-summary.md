# Validation Summary: Why Does a Command Work in Your Shell but Fail in Rundeck? Comparing Users, PATH, TTY, and Environment

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Rundeck and PagerDuty Runbook Automation, including Node Executors, File Copiers, Enterprise Runners, Script steps, and context variables
- Linux process identities, filesystem permissions, environment variables, working directories, and `PATH`
- Bash startup modes, strict-mode options, executable lookup, and pipeline exit behavior
- OpenSSH remote command execution, pseudo-terminals, and environment forwarding
- `sudo` and `sudoers`, including non-interactive execution, `NOPASSWD`, and `requiretty`
- Kubernetes `kubectl` and Docker Compose command examples

## Sources Consulted

- [Rundeck Node Execution](https://docs.rundeck.com/docs/manual/projects/node-execution/)
- [Rundeck SSH Node Execution](https://docs.rundeck.com/docs/manual/projects/node-execution/ssh.html)
- [Rundeck Built-in Node Execution Plugins](https://docs.rundeck.com/docs/manual/projects/node-execution/builtin.html)
- [Rundeck Built-in Node Steps](https://docs.rundeck.com/docs/manual/jobs/job-plugins/node-steps/builtin.html)
- [Rundeck Job Variables Reference](https://docs.rundeck.com/docs/manual/jobs/job-variables.html)
- [Rundeck Job Options](https://docs.rundeck.com/docs/manual/jobs/job-options.html)
- [Rundeck Runner Concepts and Architecture](https://docs.rundeck.com/docs/administration/runner/concepts.html)
- [Rundeck Job Execution with Enterprise Runners](https://docs.rundeck.com/docs/administration/runner/using-runners/runner-using.html)
- [Rundeck Node Dispatch and Runner-as-a-Node](https://docs.rundeck.com/docs/administration/runner/runner-management/node-dispatch.html)
- [Rundeck Job Workflows and Error Handlers](https://docs.rundeck.com/docs/manual/jobs/job-workflows.html)
- [Rundeck Command Injection via Job Options Advisory](https://docs.rundeck.com/docs/history/cves/2025-07-option-escaping.html)
- [GNU Bash: Bash Startup Files](https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files.html)
- [GNU Bash: Bash Variables](https://www.gnu.org/software/bash/manual/html_node/Bash-Variables.html)
- [GNU Bash: The Set Builtin](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html)
- [POSIX Environment Variables](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap08.html)
- [OpenSSH `ssh(1)` Manual](https://man.openbsd.org/ssh)
- [OpenSSH `sshd_config(5)` Manual](https://man.openbsd.org/sshd_config)
- [`sudo(8)` Linux Manual](https://man7.org/linux/man-pages/man8/sudo.8.html)
- [`sudoers(5)` Linux Manual](https://man7.org/linux/man-pages/man5/sudoers.5.html)
- [GNU Coreutils Access Permission Tests](https://www.gnu.org/software/coreutils/manual/html_node/Access-permission-tests.html)
- [GNU Coreutils File Type Tests](https://www.gnu.org/software/coreutils/manual/html_node/File-type-tests.html)
- [`namei(1)` Linux Manual](https://man7.org/linux/man-pages/man1/namei.1.html)
- [Kubernetes `kubectl` Reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl/)
- [Docker Compose CLI Reference](https://docs.docker.com/reference/cli/docker/compose/)

## Issues Found

- The execution-location paragraph categorically placed local work on the Automation Server, used the non-standard phrase "workflow-local script," assumed the service account was named `rundeck`, and implied that the SSH username must come from the node. It now qualifies the statement for Runner delegation, refers to server-local steps, identifies the operating-system account that runs Rundeck, and reflects the documented node/project/framework SSH username resolution order.
- The diagnostic labeled `$SHELL` as the executing shell, but POSIX defines it as the user's preferred command interpreter and it may not identify the current process. The label is now `shell_env`, and `$BASH` is printed separately to identify the current Bash executable.
- The diagnostic labeled `test -t 0` as a general TTY test even though it checks only file descriptor 0. The output is now labeled `stdin_tty`, and the accompanying text says it checks whether standard input is a terminal.
- The Bash startup-file description suggested that a login shell could read all listed per-user profile files and treated `.bashrc` as strictly interactive-only. It now states Bash's documented first-readable-file order and its special non-interactive `sshd` behavior.
- The working-directory example could continue after a failed `cd`, allowing the following command to run in an unintended directory and potentially hide the failure. It now exits when `cd /opt/myapp` fails.

## Review Notes

- The Rundeck context-variable syntaxes and `AcceptEnv RD_*` example are current. Rundeck versions 3.4.1 through 5.19.0 had an option-escaping command-injection vulnerability; installations on those versions should upgrade to 5.20.0 or later and continue to constrain user-supplied options with allowed values or validation.
- `#!/usr/bin/env bash` is a valid portable idiom but must find `bash` through the inherited `PATH` before the script can set its own `PATH`. Environments with a known fixed Bash location can use that absolute interpreter path instead.
- The native `ssh -T` example is appropriately described as a close reproduction. Credentials, host-key handling, environment forwarding, and quoting can differ when Rundeck uses its SSH-J executor.
- The absolute `kubectl` and `docker` paths are installation-specific examples; their flags and argument order are current and valid.
