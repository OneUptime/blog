# Validation Summary: How to Implement Velero Plugin Development for Custom Resource Backup Logic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Velero
- Kubernetes
- Go
- Velero plugin framework
- BackupItemAction, RestoreItemAction, and ObjectStore plugins
- Docker plugin images
- Velero CLI

## Sources Consulted
- Velero custom plugin documentation: https://velero.io/docs/v1.12/custom-plugins/
- Velero plugin example repository: https://github.com/vmware-tanzu/velero-plugin-example
- Velero Go package docs for plugin interfaces: https://pkg.go.dev/github.com/vmware-tanzu/velero/pkg/plugin/velero
- Velero BackupItemAction v1 API docs: https://pkg.go.dev/github.com/vmware-tanzu/velero/pkg/plugin/velero/backupitemaction/v1
- Velero RestoreItemAction v1 API docs: https://pkg.go.dev/github.com/vmware-tanzu/velero/pkg/plugin/velero/restoreitemaction/v1
- Velero plugin framework docs: https://pkg.go.dev/github.com/vmware-tanzu/velero/pkg/plugin/framework
- Velero troubleshooting documentation for debug logging: https://velero.io/docs/v1.18/troubleshooting/
- Velero AWS plugin compatibility information: https://pkg.go.dev/github.com/vmware-tanzu/velero-plugin-for-aws
- Velero v1.18.1 source and go.mod: https://github.com/vmware-tanzu/velero/tree/v1.18.1

## Issues Found
- The development setup used Go 1.21 even though current Velero v1.18.x declares a Go 1.25 toolchain in its `go.mod`. Updated the install example to use Go 1.25.10 and remove an existing `/usr/local/go` before extraction, matching Go's install guidance.
- The BackupItemAction example used `*v1.ConfigMap` from Kubernetes core as the backup argument. Changed it to `*api.Backup` from `github.com/vmware-tanzu/velero/pkg/apis/velero/v1`, which matches the Velero BackupItemAction interface.
- Several Go snippets had unused imports (`encoding/json`, `fmt`, `runtime`, and `github.com/pkg/errors` in the object store example). Removed or corrected them so the examples are syntactically valid.
- The file comments placed plugin implementations under separate subdirectories while `go build .` and `main.go` expected one package. Changed the comments to root-level filenames so the shown project layout can build as a single plugin binary.
- The backup annotation logic used unsafe metadata type assertions and would panic in the unit test when the backup argument was nil. Updated it to use `unstructured.Unstructured` metadata helpers and handle a nil backup defensively.
- The AWS plugin version in the install example was outdated for current Velero. Updated the example from `velero-plugin-for-aws:v1.9.0` to `v1.14.1`, which is in the current AWS plugin line for Velero v1.18.x.
- The plugin ConfigMap label used an implementation type name as the value and a plugin name that did not match the registered plugin. Updated it to use the registered plugin name `example.com/custom-backup-action` and plugin kind `BackupItemAction`, matching Velero's documented plugin configuration convention.
- The debug logging example set a `LOG_LEVEL` environment variable, but Velero documents server debug logging via the `--log-level debug` argument. Updated the patch command to append `--log-level` and `debug` to the Velero deployment args.
- The unit test example left the returned `result` unused and passed a nil backup. Updated it to pass `&api.Backup{}` and assert that the expected annotation was added.

## Review Notes
The examples are now aligned with current Velero v1 BackupItemAction and RestoreItemAction interfaces. I could not run a local Go compile because the workspace does not have the `go` binary installed, so code verification was performed against official Velero API documentation and source. The configuration section remains a compact pattern; a production plugin still needs Kubernetes client logic to read the labeled ConfigMap at runtime.
