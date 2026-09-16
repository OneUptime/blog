# How to Run Bash-Based Buildkite Hooks on Windows Agents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, Windows Server, Bash, CI/CD, Troubleshooting

Description: Use a native Windows hook wrapper for existing Bash helpers while preserving exit status and understanding environment boundaries.

---

Copying a Linux `.buildkite/hooks/pre-command` script onto a Windows agent does not make it a portable hook. Hook discovery, interpreter selection, paths, and environment capture all differ from a Unix agent.

The supported Windows starting point is a native Batch or PowerShell hook. If you must retain an existing Bash helper, invoke it explicitly from that native hook and test the combination on your exact agent image. Treat this as a compatibility wrapper, not as proof that Git Bash is a supported replacement for the agent's shell.

## Check the documented support boundary

Buildkite's [Windows installation guide](https://buildkite.com/docs/agent/self-hosted/install/windows) states that using Git Bash to run Bash pipeline scripts is not currently supported. The [hook guide](https://buildkite.com/docs/agent/hooks) documents Batch hooks and PowerShell hooks, with PowerShell support from agent v3.32.3.

The plugin authoring documentation also describes platform-specific hook-file selection. That discovery behavior does not guarantee every Unix shell script, plugin, or environment-capture technique works on Windows. Prefer a native implementation for hooks that configure job-wide credentials or mutate the environment.

First determine whether the agent runs as an interactive process or a Windows service. Test using the same service account, environment, filesystem permissions, and installed tools as the real job.

## Add a Batch wrapper for a helper

For a self-hosted agent using the default Batch hook path, create `.buildkite/hooks/pre-command.bat`:

```bat
@ECHO OFF
SET "BASH_EXE=C:\Program Files\Git\bin\bash.exe"
IF NOT EXIST "%BASH_EXE%" (
  ECHO Required Bash executable was not found 1>&2
  EXIT /B 1
)
"%BASH_EXE%" "%~dp0pre-command.sh"
IF ERRORLEVEL 1 EXIT /B %ERRORLEVEL%
```

This example assumes Git for Windows is installed at that path. Adjust the path in your controlled agent image if it is elsewhere. `%~dp0` locates the helper relative to the wrapper, so it does not depend on a particular current directory.

Use this pattern for a helper that performs an action and reports success or failure, such as verifying a generated file. Avoid `SETLOCAL` around environment changes you expect the agent to capture later. The example's successful path reaches the end of the hook rather than exiting early.

Create the helper as `.buildkite/hooks/pre-command.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

printf 'Bash helper is running\n'
[[ -f package.json ]] || {
  printf 'Expected repository checkout is missing\n' >&2
  exit 1
}
```

This assumes the repository contains `package.json`. Replace the check with the actual prerequisite. The wrapper forwards failure rather than allowing the build command to run after a failed setup check.

## Keep environment changes in the parent hook

An `export` inside the Bash child cannot update the environment of the parent Batch process. That is ordinary process isolation, not a Buildkite-specific defect. The agent's hook wrapper can capture changes made in the hook's own shell, but it cannot recover arbitrary child-shell exports after the child exits.

For a simple nonsecret setting, put the assignment in the Batch hook itself:

```bat
@ECHO OFF
SET "TOOL_MODE=ci"
SET "TEST_RESULTS_DIR=%BUILDKITE_BUILD_CHECKOUT_PATH%\test-results"
```

Use a native secret provider or native hook when credentials must persist into later phases. Do not print assignments from Bash and execute them as Batch commands; that turns helper output into code and creates quoting and injection problems.

For a larger cross-platform plugin, maintain separate `.bat` or `.ps1` hooks and a Unix hook. Share business logic in a language available on both systems when that reduces maintenance without obscuring environment handling.

## Control paths and line endings

Git Bash uses POSIX-style paths internally, while Windows executables commonly expect Windows paths. Convert at the boundary with the tool's supported path conversion instead of mixing separators throughout a script.

Spaces in `C:\Program Files` are a useful test case. Keep executable paths and script paths separately quoted. A single string combining executable and arguments is more fragile than an explicit invocation.

Store the Bash helper with LF line endings. A repository `.gitattributes` rule can make this consistent:

```gitattributes
*.sh text eol=lf
*.bat text eol=crlf
```

Scope these rules more narrowly if the repository already has line-ending policy. Unexpected carriage returns can appear as part of a command name or interpreter argument and cause confusing errors.

## Verify discovery and failure handling

Confirm the log shows the native hook file you expect. If a plugin supplies several variants, the [plugin writing guide](https://buildkite.com/docs/pipelines/integrations/plugins/writing) documents Windows selection order. An existing `.bat` can take precedence over another variant you just edited.

Run the helper once successfully and once with its prerequisite deliberately absent. Confirm the failure prevents the build command. Then verify a setting assigned in Batch reaches the command while a Bash-only export does not.

If the wrapper remains unreliable or requires substantial path emulation, port the hook to PowerShell or run that workload on a Linux agent. A small native hook is usually easier to support than assuming the Windows agent behaves like a Linux login shell.
