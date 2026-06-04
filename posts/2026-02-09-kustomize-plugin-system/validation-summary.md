# Validation Summary: How to implement Kustomize plugin system for custom transformations

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes
- Kustomize
- Kustomize legacy exec plugins
- Bash
- Python
- Go
- Docker
- YAML

## Sources Consulted
- Kubernetes `kubectl kustomize` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- Kustomize upstream plugin documentation: https://github.com/kubernetes-sigs/kustomize/blob/master/plugin/README.md
- Kustomize upstream plugin loader source: https://github.com/kubernetes-sigs/kustomize/blob/master/api/internal/plugins/loader/loader.go
- Kustomize upstream exec plugin source: https://github.com/kubernetes-sigs/kustomize/blob/master/api/internal/plugins/execplugin/execplugin.go
- Kustomize upstream plugin home configuration source: https://github.com/kubernetes-sigs/kustomize/blob/master/api/konfig/plugins.go
- Kustomize KRM function API conventions: https://github.com/kubernetes-sigs/kustomize/blob/master/cmd/config/docs/api-conventions/functions-spec.md
- Python `py_compile` local syntax checks for Python examples.

## Issues Found
- The post stated that plugins simply receive resource configuration on stdin. Updated this to explain the legacy exec plugin contract: Kustomize passes plugin configuration as a temporary file path in the first argument; generators write manifests to stdout; transformers read resources from stdin and write transformed resources to stdout.
- The post omitted that external Kustomize plugins are alpha-gated. Added `kustomize build --enable-alpha-plugins .` examples where plugins are used.
- The plugin discovery section only mentioned `XDG_CONFIG_HOME`. Updated it to also mention `KUSTOMIZE_PLUGIN_HOME`, matching Kustomize's current lookup order.
- The Bash generator read its configuration from stdin, which would not work as a legacy exec generator under Kustomize. Changed it to read the config file path passed as `$1`.
- The Python transformer expected the first stdin document to be its configuration and the rest to be resources. Changed it to read configuration from `sys.argv[1]` and resources from stdin.
- The Python transformer used `dict.get(..., {})` for nested fields, so newly created maps could be disconnected from the resource. Changed the nested access to `setdefault`.
- The Go example mixed in-process plugin APIs with standalone executable behavior, imported unused packages, and did not implement the described transformation. Replaced it with a standalone exec transformer example that reads config from `os.Args[1]`, reads resources from stdin, updates container limits, and writes YAML to stdout.
- The plugin error-handling example read configuration from stdin. Updated it to read the config file path from `sys.argv[1]`.
- The local generator test piped configuration to stdin. Updated it to invoke the generator with the config file path argument.
- The Dockerfile installed PyYAML via `pip` on Alpine and used an `ENTRYPOINT` that would interfere with the sample `docker run ... cp ...` command. Updated it to use Alpine's `py3-yaml` package, changed `ENTRYPOINT` to `CMD`, and fixed the copy command so the host mount does not hide `/kustomize/plugin`.
- The documentation example had incorrect nested Markdown fence closures (` ```bash` and ` ```text`) and an extra empty Bash fence at the end of the post. Corrected the fences.

## Review Notes
`go`, `kustomize`, and `kubectl` were not installed in the local workspace, so Go compilation and end-to-end Kustomize execution could not be run locally. Those parts were checked against upstream Kustomize source and official generated Kubernetes CLI documentation instead. All Python snippets were syntax-checked locally.
