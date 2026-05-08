# Validation Summary: Troubleshooting Calico Alternate Registry Configuration

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico and Tigera Operator
- Kubernetes pods, events, image pull secrets, and kubectl
- Private container registries
- crane / go-containerregistry
- containerd registry and TLS configuration
- OpenSSL

## Sources Consulted
- Calico documentation: Configure use of your image registry: https://docs.tigera.io/calico/latest/operations/image-options/alternate-registry
- Calico documentation: Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Kubernetes documentation: kubectl create secret docker-registry: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes documentation: kubectl run: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl debug: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- go-containerregistry crane documentation: https://pkg.go.dev/github.com/google/go-containerregistry/cmd/crane
- containerd CRI registry documentation: https://github.com/containerd/containerd/blob/main/docs/cri/registry.md
- containerd hosts.toml registry configuration documentation: https://github.com/containerd/containerd/blob/main/docs/hosts.md

## Issues Found
- The authentication test used a public crane image and ran `crane ls` inside the pod, which would not use the Kubernetes image pull secret for the in-container registry request. Changed it to test Kubernetes pulling a private Calico image with `imagePullSecrets`.
- The image pull secret examples used `calico-registry-secret` in `calico-system`, but Calico's operator documentation configures registry pull secrets through the `Installation` resource and the `tigera-operator` namespace. Updated the commands to inspect and recreate `tigera-pull-secret` in `tigera-operator`.
- The containerd TLS example used the deprecated `registry.configs.<host>.tls.ca_file` pattern. Updated it to the current `config_path` plus `/etc/containerd/certs.d/<registry>/hosts.toml` configuration, with both containerd 1.x and 2.x plugin paths.
- The `Installation` registry examples omitted the trailing slash required by the current Installation API reference. Updated the expected output and patch command to use `registry.example.com/`.
- The proxy environment inspection command piped Kubernetes JSONPath output into `python3 -m json.tool`, but that JSONPath output is not valid JSON. Changed it to request full JSON and filter it with Python.
- The platform verification command only showed the resolved image config. Changed it to inspect the manifest list platforms, with a fallback message for single-platform manifests.

## Review Notes
The Calico image registry guide and the generated Installation API reference currently show slightly different formatting for `spec.registry`; the API reference explicitly states that the value must end with `/`, so the post now follows the API reference.
