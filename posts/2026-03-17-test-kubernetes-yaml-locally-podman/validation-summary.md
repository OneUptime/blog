# Validation Summary: How to Test Kubernetes YAML Locally with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Kubernetes YAML manifests
- kubectl
- Python and PyYAML
- Container networking and logs
- ConfigMaps

## Sources Consulted
- Podman `podman kube play` documentation: https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html
- Podman `podman kube down` documentation: https://docs.podman.io/en/stable/markdown/podman-kube-down.1.html
- Podman `podman ps` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman `podman pod logs` documentation: https://docs.podman.io/en/v5.0.0/markdown/podman-pod-logs.1.html
- Podman `podman logs` documentation: https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html
- Podman `podman exec` documentation: https://docs.podman.io/en/latest/markdown/podman-exec.1.html
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The introduction and summary implied that Podman validates Kubernetes manifests broadly. Podman documentation describes `podman kube play` as reading Kubernetes YAML and recreating supported containers, pods, and volumes, with a documented subset of supported kinds and fields. Updated the wording to say Podman runs supported Kubernetes manifests locally.
- The metadata description and validation comment implied that Podman itself was the validation mechanism, including a nonexistent `podman kube play --dry-run` workflow. Updated those lines to direct validation to YAML and kubectl tooling instead.
- The Python YAML syntax check used `yaml.safe_load`, which only reads a single YAML document and requires PyYAML. Kubernetes manifest files commonly contain multiple YAML documents separated by `---`. Updated the example to mention PyYAML and use `yaml.safe_load_all`.
- The kubectl validation command relied on the default validation mode. Updated it to include `--validate=strict`, matching the current kubectl reference and making the intended schema validation behavior explicit.

## Review Notes
Podman's Kubernetes YAML support is useful for local feedback, but it is not a complete substitute for testing against a real Kubernetes API server and scheduler. The post's examples use supported fields such as `hostPort`, ConfigMap environment injection, pod/container logs, and the `pod` filter for `podman ps`.
