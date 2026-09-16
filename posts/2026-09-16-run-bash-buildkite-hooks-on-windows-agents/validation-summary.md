# Validation Summary: How to Run Bash-Based Buildkite Hooks on Windows Agents

## Status
validated

## Post Type
Technical guide / troubleshooting tutorial

## Technologies Covered
- Buildkite self-hosted agents and job lifecycle hooks
- Windows Server and Windows Batch
- Git Bash / Bash
- Git attributes and cross-platform line endings
- CI/CD environment-variable and exit-status handling

## Sources Consulted
- [Installing Buildkite agent on Windows](https://buildkite.com/docs/agent/self-hosted/install/windows)
- [Buildkite agent hooks](https://buildkite.com/docs/agent/hooks)
- [Writing plugins](https://buildkite.com/docs/pipelines/integrations/plugins/writing)
- [Microsoft Learn: set](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/set_1)
- [Microsoft Learn: setlocal](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/setlocal)
- [Microsoft Learn: cmd](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cmd)
- [GNU Bash Reference Manual: Command Execution Environment](https://www.gnu.org/software/bash/manual/html_node/Command-Execution-Environment.html)
- [Git gitattributes documentation](https://git-scm.com/docs/gitattributes)
- [Git FAQ: line-ending attributes](https://git-scm.com/docs/gitfaq)

## Issues Found
No technical issues found.

## Review Notes
- Buildkite explicitly states that Git Bash is not supported for running Bash pipeline scripts on Windows. The post correctly presents the Batch-to-Bash invocation as a compatibility wrapper that must be tested on the exact agent image, not as a supported replacement for the configured Windows shell.
- Buildkite's current hook documentation confirms that Windows job hooks use `.bat` files with the default Batch shell, or PowerShell hooks when the agent shell is configured accordingly; PowerShell hook support begins with agent v3.32.3.
- Buildkite's plugin documentation confirms the stated Windows hook selection behavior: `.bat` is checked before `.cmd`, `.ps1`, `.exe`, and an extensionless hook.
- The Bash helper passed a syntax check. Its strict-mode options, file test, diagnostic redirection, and nonzero failure exit are valid Bash.
- The Batch wrapper's quoting, `%~dp0` use, executable existence check, and nonzero exit propagation are consistent with `cmd.exe` behavior. Allowing the success path to reach the end also avoids the Buildkite environment-capture problem associated with an early `exit`.
- The explanation that a child Bash process cannot modify its parent Batch environment is consistent with standard process-environment semantics. The warning about `SETLOCAL` is also correct because localized changes are restored at the end of the Batch file.
- The `.gitattributes` examples match Git's documented `text eol=lf` and `text eol=crlf` syntax.
