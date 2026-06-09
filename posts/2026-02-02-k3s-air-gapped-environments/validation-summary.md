# Validation Summary: How to Configure K3s for Air-Gapped Environments

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- K3s (lightweight Kubernetes distribution, v1.29.0+k3s1)
- containerd
- Docker Registry (registry:2)
- Harbor (mentioned)
- Docker Compose (v3.8)
- registries.yaml (K3s private registry configuration)
- Prometheus / Alertmanager (kube-prometheus-stack Helm chart)
- ArgoCD (GitOps)
- Mermaid diagrams
- Bash scripting
- zstd compression

## Sources Consulted
- K3s Air-Gap Installation docs: https://docs.k3s.io/installation/airgap
- K3s Private Registry Configuration: https://docs.k3s.io/installation/private-registry
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- K3s GitHub Releases (v1.29.0+k3s1 release artifacts)
- Docker Registry image documentation (registry:2 environment variables)
- ArgoCD declarative repository setup documentation
- kube-prometheus-stack Helm chart values reference

## Issues Found
No technical issues found.

Detailed verification:
- The auto-import path `/var/lib/rancher/k3s/agent/images/` is correct per K3s docs.
- The air-gap tarball filename `k3s-airgap-images-amd64.tar.zst` matches the official K3s release artifact naming.
- The `INSTALL_K3S_SKIP_DOWNLOAD=true` environment variable usage matches K3s documented practice for offline installs.
- The K3s binary destination `/usr/local/bin/k3s` is correct.
- All K3s server flags used in the post are valid and documented: `--system-default-registry`, `--disable`, `--write-kubeconfig-mode`, `--protect-kernel-defaults`, `--secrets-encryption`, `--kube-apiserver-arg`.
- The `registries.yaml` structure (top-level `mirrors:` and `configs:` sections with `auth`, `tls.ca_file`, `tls.insecure_skip_verify`) matches the K3s spec.
- The K3s release URL pattern `https://github.com/k3s-io/k3s/releases/download/<version>/<artifact>` and the install script URL `https://get.k3s.io` are accurate.
- The Docker Registry environment variables (`REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY`, `REGISTRY_STORAGE_DELETE_ENABLED`, `REGISTRY_HTTP_ADDR`) match the registry:2 image's documented env var to config-key mapping.
- The agent token location `/var/lib/rancher/k3s/server/node-token` and join URL pattern (`https://<server>:6443`) are correct.
- The kube-prometheus-stack Helm values structure (`global.imageRegistry`, `prometheus.prometheusSpec.image.{repository,tag}`, `alertmanager.alertmanagerSpec.image`) is accurate.
- The ArgoCD repository Secret format (label `argocd.argoproj.io/secret-type: repository`, `stringData` with `type`, `url`, `username`, `password`, `insecure`, `tlsClientCertData`) matches ArgoCD's declarative setup spec.
- Prometheus v2.48.0 and Alertmanager v0.26.0 are valid releases available at the time the post is targeted at.
- `k3s ctr images ls` is the correct command to inspect containerd images bundled with K3s.

## Review Notes
- The `import-images.sh` script uses `sed 's|.*/||'` which removes everything before the last `/`. This strips not just the registry hostname but also any namespace (e.g., `rancher/`). The script will still work but image names get flattened (e.g., `rancher/mirrored-coredns-coredns:1.10.1` becomes `mirrored-coredns-coredns:1.10.1` in the private registry). Combined with `--system-default-registry`, K3s will then look for `<registry>/mirrored-coredns-coredns:1.10.1`. This is functional but somewhat brittle compared to preserving paths via `skopeo copy` or similar tooling. Not a technical error — just a stylistic note for future improvement.
- Mermaid flowchart nodes use `\n` for line breaks while the sequence diagram uses `<br/>`. Both render correctly in current Mermaid, though `<br/>` is the more modern/portable form.
- The Docker Compose example uses `version: "3.8"`. The `version` key is no longer required in current Docker Compose versions (it is now obsolete and ignored), but its presence still works and produces only a deprecation warning. Not incorrect.
- The post pins K3s to v1.29.0+k3s1, which was a stable release at the time of writing. Readers using newer K3s versions should substitute the latest patch release and check release notes for any new air-gap flags (e.g., the optional `.cache.json` feature added in K3s 2025+ releases to speed up startup image imports).
- The example `registries.yaml` uses `http://registry.internal.local:5000` (plain HTTP). This requires either disabling TLS or adding the registry endpoint to containerd's insecure registries — which K3s handles automatically when the endpoint is `http://`. Correct, but worth noting that production deployments should use HTTPS as the post itself advises.
