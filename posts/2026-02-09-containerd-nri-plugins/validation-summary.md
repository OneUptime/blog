# Validation Summary: How to Configure containerd NRI Plugins for Custom Container Resource Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- containerd
- Node Resource Interface (NRI)
- Go
- Linux cgroups resource controls

## Sources Consulted
- containerd 1.7 NRI documentation: https://containerd.io/docs/1.7/nri/
- containerd 2.2 NRI documentation: https://containerd.io/docs/2.2/nri/
- containerd/nri project README: https://github.com/containerd/nri
- NRI Go package documentation: https://pkg.go.dev/github.com/containerd/nri
- NRI stub package documentation: https://pkg.go.dev/github.com/containerd/nri/pkg/stub
- NRI generated API source for resource and adjustment types: https://github.com/containerd/nri/blob/main/pkg/api/api.pb.go
- NRI optional value helper source: https://github.com/containerd/nri/blob/main/pkg/api/optional.go
- NRI event mask source: https://github.com/containerd/nri/blob/main/pkg/api/event.go
- NRI sample plugin template: https://github.com/containerd/nri/blob/main/plugins/template/plugin.go

## Issues Found
- The containerd NRI configuration used `config_file = "/etc/nri/nri.conf"`, which is not the documented key. Changed it to `plugin_config_path = "/etc/nri/conf.d"` and updated the directory creation command accordingly.
- The configuration omitted `disable_connections = false` while documenting an externally reachable NRI socket. Added it so externally launched plugins can connect to `/var/run/nri/nri.sock`.
- The code sample used the current `Configure` behavior but an outdated method signature without `context.Context`. Updated it to `Configure(ctx context.Context, config, runtime, version string)`.
- The Go sample imported `fmt` but did not use it. Removed the unused import.
- The Go sample used `proto.Uint64` and `proto.Int64` for NRI CPU fields, but current NRI API fields are `*api.OptionalUInt64` and `*api.OptionalInt64`. Replaced those calls with `api.UInt64` and `api.Int64`.
- The sample subscribed to both `RunPodSandbox` and `CreateContainer` while only implementing a `CreateContainer` handler. Narrowed the event mask to `CreateContainer`.
- The text implied enabling NRI uniformly. Updated the configuration comment to note that NRI is enabled by default in containerd 2.0 and later, while preserving the `disable = false` setting needed for containerd 1.7.

## Review Notes
- NRI support differs by containerd major version: containerd 1.7 documents NRI as disabled by default, while containerd 2.0 and later document it as enabled by default. The corrected snippet is valid for explicitly enabling it and keeping external plugin connections available.
- Go is not installed in this workspace, so the sample could not be compiled locally. The review checked the code against the current official NRI generated sources and stub package documentation instead.
