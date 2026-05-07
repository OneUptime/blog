# Validation Summary: How to Use sd_notify for Auto-Update Health Checks in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman Quadlet
- systemd service notifications
- sd_notify
- Podman auto-update
- Podman health checks
- Go

## Sources Consulted
- Podman `podman-systemd.unit(5)` documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-auto-update(1)` documentation: https://docs.podman.io/en/v5.8.0/markdown/podman-auto-update.1.html
- systemd `sd_notify(3)` documentation: https://www.freedesktop.org/software/systemd/man/sd_notify.html
- systemd `systemd.service(5)` documentation: https://www.freedesktop.org/software/systemd/man/254/systemd.service.html
- Go `net` package documentation: https://pkg.go.dev/net
- Go `net/http` package documentation: https://pkg.go.dev/net/http

## Issues Found
- The Go example referenced `setupDatabase()` and `setupRoutes()` without defining them, so the snippet would not compile as shown. I replaced `setupRoutes()` with an inline `/health` handler and added a small `setupDatabase()` placeholder function.
- The Go example said it verified that the server was accepting connections before notifying systemd, but it called `notifyReady()` immediately after starting `ListenAndServe` in a goroutine. I added `waitForServer()` using `net.DialTimeout` so the example sends `READY=1` only after the TCP listener accepts connections.

## Review Notes
- The Quadlet configuration keys used in the post, including `AutoUpdate=registry`, `HealthCmd`, `HealthInterval`, `HealthTimeout`, `HealthRetries`, `HealthStartPeriod`, `Notify=healthy`, and `Notify=true`, match current Podman documentation.
- Podman documentation describes auto-update rollback as enabled by default and notes that detecting failed starts is best done through sd_notify readiness, which supports the post's central explanation.
- The local environment did not have `podman` or `go` installed, so CLI and Go compilation checks were performed against official documentation rather than local execution.
