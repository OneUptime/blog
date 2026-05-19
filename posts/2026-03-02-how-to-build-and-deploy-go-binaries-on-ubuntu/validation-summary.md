# Validation Summary: How to Build and Deploy Go Binaries on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Ubuntu
- systemd
- Bash
- Make
- CGO and static linking

## Sources Consulted
- Go command documentation: https://pkg.go.dev/cmd/go
- Go linker documentation: https://pkg.go.dev/cmd/link
- Go embed package documentation: https://pkg.go.dev/embed
- systemd.service documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd.unit documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.exec documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- systemd resource control documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html
- Local Ubuntu systemd 255 man pages for systemd.service, systemd.unit, systemd.exec, and systemd.resource-control

## Issues Found
- The introduction claimed Go compiles to a single statically linked binary with no runtime dependencies. This is only reliably true for pure Go applications, especially when CGO is disabled. Updated the wording to avoid overstating static-linking behavior.
- The `go build -o bin/ ./cmd/...` example can fail if `bin/` does not exist. Added `mkdir -p bin` before the command.
- The Makefile build target wrote to `bin/myapp` without ensuring `bin/` exists. Added `mkdir -p bin` to the build target.
- The binary stripping note said stripped binaries cannot be analyzed with debuggers or profilers. This was too absolute because `-s -w` removes symbol and DWARF data but does not make every profiling workflow impossible. Updated the wording to say less symbol and DWARF data is available for debugging tools.
- The systemd unit placed `StartLimitIntervalSec` and `StartLimitBurst` in `[Service]`. Modern systemd documents these under unit-level settings, so they were moved to `[Unit]`.
- The systemd unit used `EnvironmentFile=/opt/myapp/config/env`, which makes the service fail if the sample env file is absent. Changed it to `EnvironmentFile=-/opt/myapp/config/env` so the optional file is handled correctly in the tutorial context.
- The systemd unit used deprecated `MemoryLimit=`, a legacy cgroup v1 control. Replaced it with current `MemoryMax=`.
- The deployment section was titled "Zero-Downtime Deployment Script" even though it restarts the service. Renamed it to "Minimal-Downtime Deployment Script" to match the script's actual behavior.
- The binary dependency section said to verify the binary is "truly static" before showing `ldd`. Updated the wording to verify whether dynamic library dependencies exist, which matches the command's purpose.

## Review Notes
The Go embed, `ldflags -X`, `-trimpath`, `go test -race`, systemd `ExecReload`, and systemd `ExecStartPost` examples are generally accurate. The static musl example is technically valid but assumes `musl-gcc` is installed and that the application's CGO dependencies can be linked statically.
