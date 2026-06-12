# Validation Summary: How to Build Velero Custom Plugins

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Velero custom plugins
- Kubernetes backups and restores
- Go plugin development
- Docker container packaging
- Kubernetes custom resources
- Velero CLI

## Sources Consulted
- Velero v1.18 Custom Plugins documentation: https://velero.io/docs/v1.18/custom-plugins/
- Velero v1.18 Plugin Overview documentation: https://velero.io/docs/v1.18/overview-plugins/
- Velero example plugin repository: https://github.com/velero-io/velero-plugin-example
- Velero example plugin `main.go`: https://raw.githubusercontent.com/velero-io/velero-plugin-example/main/main.go
- Velero example plugin Dockerfile: https://raw.githubusercontent.com/velero-io/velero-plugin-example/main/Dockerfile
- Velero Go package documentation for `pkg/plugin/velero`: https://pkg.go.dev/github.com/vmware-tanzu/velero/pkg/plugin/velero
- Velero Go package documentation for backup item action v1: https://pkg.go.dev/github.com/vmware-tanzu/velero/pkg/plugin/velero/backupitemaction/v1
- Velero backup storage location documentation: https://velero.io/docs/v1.9/locations/

## Issues Found
- The dependency versions were outdated for a current Velero plugin tutorial. Updated the example `go.mod` from Velero v1.12/Kubernetes v0.28 era dependencies to Velero v1.18 and Kubernetes v0.33 dependencies, matching current Velero documentation and the official example plugin repository.
- The project setup commands did not install the dependencies shown in the example `go.mod`. Added a `go get` command for the Velero, Logrus, and Kubernetes module versions used by the snippets.
- The object store snippet imported `pkg/plugin/framework` but did not use it, which would not compile. Removed the unused import.
- The object store and backup item action structs accepted a Velero logger field but the factory functions returned structs without setting it. Added constructor functions and updated the plugin factory functions to pass Velero's plugin logger.
- The backup item action snippet used `*velero.Backup`, but the Backup API type is in `github.com/vmware-tanzu/velero/pkg/apis/velero/v1`. Updated the imports and function signatures to use `*velerov1api.Backup`.
- The Dockerfile used the AWS plugin image as a base image, which would package unrelated provider plugin content and did not match Velero's official plugin image pattern. Replaced it with a minimal image that copies the custom plugin binary to `/target`.
- The deployment section manually patched the Velero Deployment with a shell-based init container. Replaced it with the official `velero plugin add <registry/image:version>` command.
- The lifecycle diagram showed a `Cleanup` callback, but the documented plugin interfaces do not expose a generic cleanup method. Changed the diagram to describe stopping the plugin process instead.
- The best-practices section advised streaming large ConfigMaps and Secrets through item action plugins, which is misleading because item actions receive Kubernetes objects as in-memory unstructured resources. Updated the guidance to apply streaming to object store backup data and to avoid unnecessary copies in item actions.

## Review Notes
The high-level explanation of Velero's plugin architecture, supported plugin kinds, provider naming, BackupStorageLocation provider usage, and `velero backup create --storage-location` usage matched the official documentation. The example encryption function is explicitly described as a placeholder and should not be used as production cryptography.
