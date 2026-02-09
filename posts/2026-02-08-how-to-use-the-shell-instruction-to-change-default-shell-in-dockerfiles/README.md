# How to Use the SHELL Instruction to Change Default Shell in Dockerfiles

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, SHELL, Bash, PowerShell, DevOps

Description: Learn how to use the SHELL instruction to change the default shell in Dockerfiles for bash features and Windows support.

---

By default, Docker uses `/bin/sh -c` as the shell for executing RUN instructions in shell form on Linux, and `cmd /S /C` on Windows. The SHELL instruction lets you change this default to any shell you prefer. This is particularly useful when you need bash-specific features, want stricter error handling, or are building Windows container images that should use PowerShell.

This guide explains how the SHELL instruction works, when you need it, and how to use it effectively on both Linux and Windows.

## The Default Shell Problem

On Linux, the default shell for RUN instructions is `/bin/sh`. In many Docker base images (especially Alpine), `/bin/sh` is actually `ash` or `dash`, not `bash`. These shells lack features that many developers take for granted:

- No `pipefail` option (pipe failures go undetected)
- No arrays
- No `[[ ]]` extended test syntax
- No process substitution
- Limited string manipulation

Consider this Dockerfile:

```dockerfile
FROM alpine:3.19

# This uses /bin/sh (ash), not bash
# If curl fails but wc succeeds, the RUN instruction reports success
RUN curl -fsSL https://example.com/data.txt | wc -l
```

If `curl` fails, the exit code of the pipeline is determined by the last command (`wc`), which might succeed with an exit code of 0. The failure goes unnoticed.

## Basic SHELL Syntax

The SHELL instruction takes a JSON array specifying the shell executable and its arguments:

```dockerfile
# Change the default shell to bash with strict error handling
SHELL ["/bin/bash", "-c"]
```

After this instruction, all subsequent RUN instructions in shell form use `/bin/bash -c` instead of `/bin/sh -c`.

## Using Bash with Strict Mode

The most common use of SHELL is to enable bash with pipefail and other safety features:

```dockerfile
FROM ubuntu:22.04

# Install bash if not present (Ubuntu already has it)
# Switch to bash with strict error handling
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

# Now pipe failures are caught
# If curl fails, the entire RUN instruction fails
RUN curl -fsSL https://example.com/install.sh | bash

# Bash features are now available
RUN declare -A config && \
    config[host]="localhost" && \
    config[port]="8080" && \
    echo "Server: ${config[host]}:${config[port]}"
```

The flags in the SHELL instruction:

- `-e`: Exit immediately if a command exits with a non-zero status
- `-u`: Treat unset variables as an error
- `-o pipefail`: The return value of a pipeline is the status of the last command to exit with a non-zero status
- `-c`: Read commands from the following string (required for RUN to work)

## SHELL on Alpine Linux

Alpine Linux uses `ash` as its default shell and does not include `bash` by default. You need to install it first:

```dockerfile
FROM alpine:3.19

# Install bash (using the default ash shell)
RUN apk add --no-cache bash

# Now switch to bash
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

# All subsequent RUN instructions use bash
RUN echo "Running in bash: $BASH_VERSION"
```

Note that installing bash increases the image size. If you only need pipefail, you can work around it without changing the shell:

```dockerfile
FROM alpine:3.19

# Alternative: use set -o pipefail within the RUN instruction
RUN set -o pipefail && curl -fsSL https://example.com/data | wc -l
```

However, this approach requires adding `set -o pipefail` to every RUN instruction, which is error-prone. The SHELL instruction is cleaner.

## Multiple SHELL Instructions

You can use SHELL multiple times in a Dockerfile. Each one changes the default for all subsequent RUN instructions:

```dockerfile
FROM ubuntu:22.04

# Start with bash for general commands
SHELL ["/bin/bash", "-c"]
RUN echo "Using bash"

# Switch to a Python shell for specific operations
RUN apt-get update && apt-get install -y python3
SHELL ["/usr/bin/python3", "-c"]
RUN print("Hello from Python")

# Switch back to bash
SHELL ["/bin/bash", "-c"]
RUN echo "Back to bash"
```

While this is possible, changing shells mid-Dockerfile can make it confusing to read. Use this technique sparingly.

## SHELL for Windows Containers

The SHELL instruction is essential for Windows container images. Windows has two shells: `cmd` and PowerShell. The default is `cmd`, but PowerShell is usually preferred.

```dockerfile
# Windows container with PowerShell as default shell
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Switch from cmd to PowerShell
SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]

# Now RUN instructions use PowerShell
RUN Write-Host 'Installing application...'
RUN Invoke-WebRequest -Uri 'https://example.com/installer.msi' -OutFile 'installer.msi'
RUN Start-Process msiexec.exe -ArgumentList '/i', 'installer.msi', '/quiet' -Wait
RUN Remove-Item 'installer.msi' -Force
```

The PowerShell flags:

- `-Command`: Execute the following string as a PowerShell command
- `$ErrorActionPreference = 'Stop'`: Stop on errors (similar to `set -e` in bash)
- `$ProgressPreference = 'SilentlyContinue'`: Disable progress bars (speeds up downloads significantly)

Without SHELL, you would need to prefix every RUN instruction with `powershell -Command`:

```dockerfile
# Without SHELL - verbose and repetitive
RUN powershell -Command Write-Host 'Installing...'
RUN powershell -Command Invoke-WebRequest -Uri 'https://example.com/file' -OutFile 'file'
```

## How SHELL Interacts with Other Instructions

The SHELL instruction affects any instruction that uses the shell form:

- **RUN** in shell form: Uses the specified shell
- **CMD** in shell form: Uses the specified shell
- **ENTRYPOINT** in shell form: Uses the specified shell

It does NOT affect exec form instructions:

```dockerfile
SHELL ["/bin/bash", "-c"]

# Shell form - uses /bin/bash -c
RUN echo "This uses bash"

# Exec form - NOT affected by SHELL, runs directly
RUN ["echo", "This does NOT use bash"]
```

```dockerfile
SHELL ["/bin/bash", "-c"]

# Shell form CMD - uses bash
CMD echo "Starting server"

# Exec form CMD - NOT affected by SHELL
CMD ["python", "server.py"]
```

## Practical Examples

### Node.js with NVM

NVM (Node Version Manager) requires bash. The SHELL instruction makes this work in a Dockerfile:

```dockerfile
FROM ubuntu:22.04

# Install prerequisites
RUN apt-get update && apt-get install -y curl bash

# Switch to bash for NVM compatibility
SHELL ["/bin/bash", "--login", "-c"]

# Install NVM
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Install Node.js through NVM
RUN nvm install 20 && nvm use 20 && nvm alias default 20

# Verify
RUN node --version && npm --version
```

The `--login` flag sources the bash profile, which is where NVM installs itself.

### Rust with Cargo

```dockerfile
FROM rust:1.75

# Use bash with strict mode for Rust builds
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src/ src/

# Build with cargo, piping output to tee for logging
RUN cargo build --release 2>&1 | tee /tmp/build.log
```

### Custom Shell Scripts

You can even point SHELL to a custom wrapper script:

```dockerfile
FROM ubuntu:22.04

# Create a custom shell wrapper that adds logging
RUN echo '#!/bin/bash\nset -euo pipefail\necho "[BUILD] $@"\nexec bash -c "$@"' > /usr/local/bin/build-shell && \
    chmod +x /usr/local/bin/build-shell

# Use the custom wrapper as the default shell
SHELL ["/usr/local/bin/build-shell"]

# Each RUN will now log its command before executing
RUN echo "Installing dependencies"
RUN apt-get update && apt-get install -y curl
```

## Checking the Current Shell

To see what shell a RUN instruction uses, you can print it:

```dockerfile
# Check which shell is active
RUN echo "Shell: $0"
RUN cat /proc/$$/cmdline | tr '\0' ' '
```

## Best Practices

1. **Set SHELL early in the Dockerfile** when you need bash features
2. **Always include `-c` as the last argument** for bash, as Docker appends the RUN command after it
3. **Use pipefail for any Dockerfile with pipes**: Undetected pipe failures are a common source of subtle bugs
4. **Keep it simple**: If you don't need bash-specific features, the default `/bin/sh` is fine
5. **Document why you changed the shell**: Add a comment explaining the reason

```dockerfile
# Using bash for pipefail support - curl failures must not be silently ignored
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]
```

## Summary

The SHELL instruction changes the default shell used by RUN, CMD, and ENTRYPOINT instructions in their shell form. The most common use case on Linux is switching from `/bin/sh` to `/bin/bash` with strict error handling flags like pipefail. On Windows, it is essential for switching from cmd to PowerShell. Set the SHELL instruction early in your Dockerfile, always include the `-c` flag, and use it whenever you need shell features beyond what `/bin/sh` provides.
