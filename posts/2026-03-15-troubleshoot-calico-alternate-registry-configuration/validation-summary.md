# Validation Summary: How to Troubleshoot Calico Alternate Registry Configuration

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Calico / Tigera Operator
- Kubernetes
- Container registries and image pull secrets
- containerd
- Docker
- crane
- crictl

## Sources Consulted
- Calico documentation: Configure use of your image registry, https://docs.tigera.io/calico/latest/operations/image-options/alternate-registry
- Calico documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: Install images by registry digest, https://docs.tigera.io/calico/latest/operations/image-options/imageset
- containerd documentation: CRI registry configuration, https://containerd.org/docs/1.7/cri/registry/
- containerd documentation: hosts.toml registry configuration, https://github.com/containerd/containerd/blob/main/docs/hosts.md
- Kubernetes documentation: Pull an image from a private registry, https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/

## Issues Found
- The operator registry example omitted `imagePullSecrets` and used `registry.internal.example.com` without the trailing slash required by the current Installation API reference. Updated the example to include `imagePullSecrets` and `registry.internal.example.com/`.
- The image pull secret commands created a secret only in `calico-system`, which does not match operator-managed installations. Updated the commands to check and create the pull secret in `tigera-operator`, then patch the Installation resource to reference it.
- The Calico image lists omitted `calico/apiserver` and `calico/key-cert-provisioner` while the post checks the Calico API server namespace and discusses operator-managed Calico components. Added those images to the validation and mirroring lists.
- The mirroring command used `crane copy` from `docker.io`. Current Calico documentation uses Tigera's Quay registry and the crane command is `crane cp`. Updated the command to copy from `quay.io`.
- The containerd TLS example used the deprecated inline `registry.configs` pattern. Updated it to use `config_path` with a per-registry `hosts.toml` file and `ca` setting.

## Review Notes
The post uses Calico `v3.27.0` as an example version. That is no longer the latest Calico release, but the version pin is acceptable for a troubleshooting guide as long as readers substitute the version they are actually installing.
