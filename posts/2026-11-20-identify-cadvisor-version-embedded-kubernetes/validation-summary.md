# Validation summary

## Checks performed

- Executed the exact Python lookup against upstream Kubernetes v1.35.0 go.mod and vendor/modules.txt; both reported cAdvisor v0.53.0.
- Executed the published JSONPath using client-go v0.35.0 against a synthetic two-node response; both versions, including a vendor suffix, were preserved.
- kubectl shell example passed bash syntax checking.
- Reviewed upstream dependency files, kubelet integration, official node fields, metric endpoint documentation and Go replacement semantics.
- Four-edge Mermaid structure checked; not graphically rendered.
- Generated social image visually reviewed at 1280x720; readable title without clipping.

## Limitations

- No live cluster, vendor binary, software bill of materials or vulnerability assessment was performed.
- The Python snippet inspects text entries rather than resolving the complete Go module graph.
- Upstream v1.35.0 mapping is not claimed for all patch releases or downstream builds.

## Reviewed sources

- https://kubernetes.io/docs/reference/node/node-status/
- https://kubernetes.io/docs/reference/kubectl/jsonpath/
- https://github.com/kubernetes/kubernetes/blob/v1.35.0/go.mod
- https://github.com/kubernetes/kubernetes/blob/v1.35.0/vendor/modules.txt
- https://go.dev/ref/mod#go-mod-file-replace
- https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/kubelet/cadvisor/cadvisor_linux.go
- https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
