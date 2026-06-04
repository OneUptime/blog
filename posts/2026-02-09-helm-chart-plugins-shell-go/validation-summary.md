# Validation Summary: How to Build Helm Chart Plugins Using Shell Scripts and Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Helm plugins
- Kubernetes
- Bash shell scripting
- Go
- Cobra
- Helm Go SDK
- GitHub CLI

## Sources Consulted
- Helm Plugins Guide: https://docs.helm.sh/docs/topics/plugins/
- Helm command environment documentation: https://docs.helm.sh/docs/helm/helm/
- Helm plugin install command documentation: https://docs.helm.sh/docs/helm/helm_plugin_install/
- Helm plugin package command documentation: https://docs.helm.sh/docs/helm/helm_plugin_package/
- Helm chart loader Go package documentation: https://pkg.go.dev/helm.sh/helm/v3/pkg/chart/loader
- Helm chart Go package documentation: https://pkg.go.dev/helm.sh/helm/v3/pkg/chart
- Cobra command package documentation: https://pkg.go.dev/github.com/spf13/cobra

## Issues Found
- The shell plugin `plugin.yaml` used the deprecated `command` field. Updated it to `platformCommand`, which is the current Helm metadata field for plugin commands.
- The Go plugin `plugin.yaml` used deprecated `command` and `hooks` fields, and the hook attempted to run a shell one-liner. Updated it to `platformCommand` and `platformHooks`, with the install hook invoking the script directly.
- The Go example imported unused packages (`path/filepath`, `helm.sh/helm/v3/pkg/action`, and `helm.sh/helm/v3/pkg/cli`) and referenced `chart.Chart` without importing `helm.sh/helm/v3/pkg/chart`. Removed the unused imports, added the missing import, and simplified the unused settings variable.
- The Go example used `chart` as a function parameter name while also relying on the `chart` package name. Renamed the parameter to `ch` to avoid shadowing and keep the snippet clear.
- The install script changed into `$HELM_PLUGIN_DIR` before checking whether the variable was set. Moved the `cd` inside the existing environment-variable check.
- The plugin directory creation example hard-coded Helm's Linux default plugin directory. Updated it to use `helm env HELM_PLUGINS`, which is Helm's documented source of truth.
- The release packaging example manually created a tarball. Updated it to use `helm plugin package --sign=false` and added `--verify=false` to the unsigned remote install command because current Helm verifies remote plugin tarballs by default.

## Review Notes
The security-check shell example is intentionally simple and grep-based, so it can miss rendered or conditionally templated Kubernetes security settings. It is technically valid as a basic plugin example, but a production security checker should render templates and parse Kubernetes YAML rather than scanning raw template text.
