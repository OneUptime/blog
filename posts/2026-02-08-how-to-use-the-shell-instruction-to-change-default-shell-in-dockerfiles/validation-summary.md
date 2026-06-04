# Validation Summary: How to Use the SHELL Instruction to Change Default Shell in Dockerfiles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile `SHELL`, `RUN`, `CMD`, and `ENTRYPOINT` instructions
- Linux shells (`sh`, `bash`, `ash`, `dash`)
- Bash strict mode and `pipefail`
- Alpine Linux
- Windows containers
- PowerShell
- NVM
- Rust / Cargo

## Sources Consulted
- Dockerfile reference, including shell/exec forms and the `SHELL` instruction: https://docs.docker.com/reference/dockerfile/
- GNU Bash manual, including invocation options and pipeline exit status with `pipefail`: https://www.gnu.org/software/bash/manual/
- POSIX Shell Command Language, including pipeline exit status and `pipefail`: https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html
- nvm README, including Docker-specific `BASH_ENV` guidance and current install script version: https://github.com/nvm-sh/nvm/blob/master/README.md
- Microsoft PowerShell preference variables documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_preference_variables
- Microsoft PowerShell common parameters documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_commonparameters
- Microsoft `Invoke-WebRequest` documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-webrequest

## Issues Found
- The post stated that Alpine's `/bin/sh` lacks `pipefail`. Current Alpine 3.19 `ash` supports `set -o pipefail`, while other `/bin/sh` implementations such as Ubuntu's `dash` do not. Updated the wording to say `pipefail` is not portable across `/bin/sh` implementations.
- The NVM example used `SHELL ["/bin/bash", "--login", "-c"]` and relied on bash profile loading. Official nvm Docker guidance recommends `BASH_ENV` because Docker `RUN` commands use non-interactive shells. Replaced the example with a `BASH_ENV`-based pattern.
- The NVM install URL used `v0.39.7`, which is outdated. Updated it to `v0.40.5`, matching the current official nvm README at review time.
- The first corrected NVM snippet used `${HOME}` in a Dockerfile `ENV`, which Docker can warn about if `HOME` is not defined as a Dockerfile environment variable. Set `BASH_ENV=/root/.bash_env` for a deterministic Ubuntu root-user example.

## Review Notes
- Verified with Docker 29.4.2 that `SHELL ["/bin/bash", "-euo", "pipefail", "-c"]` catches pipeline failures.
- Verified with Docker 29.4.2 that the corrected NVM `BASH_ENV` pattern makes `nvm` available in a later `RUN` instruction.
- Verified with Docker 29.4.2 that the custom shell wrapper example logs and executes a subsequent shell-form `RUN` instruction.
