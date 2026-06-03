# Validation Summary: How to Write kubectl Plugins from Scratch in Bash and Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- kubectl plugins
- Bash
- Go
- Kubernetes client-go
- Krew plugin manifests

## Sources Consulted
- Kubernetes documentation: Extend kubectl with plugins: https://kubernetes.io/docs/tasks/extend-kubectl/kubectl-plugins/
- Kubernetes kubectl reference: kubectl drain: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Krew documentation: Writing Krew plugin manifests: https://krew.sigs.k8s.io/docs/developer-guide/plugin-manifest/
- Go documentation: flag package: https://go.dev/pkg/flag/
- client-go package documentation: https://pkg.go.dev/k8s.io/client-go/tools/clientcmd
- client-go repository README: https://github.com/kubernetes/client-go

## Issues Found
- Plugin filenames for dashed command names were incorrect. kubectl treats dashes in plugin filenames as subcommand separators, so commands such as `kubectl pod-summary` and `kubectl drain-safe` need executable names with underscores, such as `kubectl-pod_summary` and `kubectl-drain_safe`. Updated the introduction and affected script comments.
- The drain helper described `--delete-local-data` too broadly. Modern `kubectl drain` uses `--delete-emptydir-data` for pods using `emptyDir` data, so the helper text now describes that accurately while still mapping the custom flag to the current kubectl flag.
- The Go `podinfo` example manually expanded `KUBECONFIG` and defaulted to `$HOME/.kube/config`, which is less accurate than client-go's default loading rules, especially for normal kubeconfig loading behavior. Updated it to use `clientcmd.NewDefaultClientConfigLoadingRules()` and an explicit path only when `--kubeconfig` is supplied.
- The Go usage example placed `-namespace=production` after the positional pod name. Go's standard `flag` package stops parsing at the first non-flag argument, so the example now puts the namespace flag before the pod name.
- The advanced Go section claimed to use client-go printer utilities, but the code used `fmt`-based formatting. Updated the description to match the code.
- The advanced Go example ignored API errors from resource list calls and could panic on failures. Added error handling for each list operation.
- The Krew manifest used short placeholder SHA values that did not represent a SHA-256 checksum. Replaced them with explicit placeholder text indicating the archive-specific SHA-256 value.
- The performance section gave fixed timing numbers without enough context. Updated it to avoid unsupported exact timings and clarify that results depend on local and cluster conditions.

## Review Notes
- Bash snippets passed `bash -n` syntax checks locally.
- Go syntax could not be compiled locally because the `go`/`gofmt` toolchain is not installed in this environment.
- `kubectl` is not installed locally, so kubectl behavior and flags were verified against official Kubernetes documentation rather than local `kubectl --help` output.
