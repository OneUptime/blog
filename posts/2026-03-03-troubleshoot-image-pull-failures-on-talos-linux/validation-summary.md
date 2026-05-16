# Validation Summary: How to Troubleshoot Image Pull Failures on Talos Linux

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Talos Linux
- Kubernetes
- containerd / CRI
- Container registries
- Docker CLI
- Docker Hub rate limits
- Kubernetes image pull secrets

## Sources Consulted
- Talos Linux v1.13 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos Linux RegistryAuthConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/cri/registryauthconfig
- Talos Linux RegistryTLSConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/cri/registrytlsconfig
- Talos Linux RegistryMirrorConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/cri/registrymirrorconfig
- Talos Linux resolver configuration guide: https://docs.siderolabs.com/talos/v1.13/networking/configuration/resolvers
- Talos Linux corporate proxy guidance: https://docs.siderolabs.com/talos/v1.9/networking/corporate-proxies
- Kubernetes image pull secrets documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes private registry pull task: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Docker manifest CLI reference: https://docs.docker.com/reference/cli/docker/manifest/
- Docker Hub usage and limits: https://docs.docker.com/docker-hub/usage/storage/

## Issues Found
- Talos registry authentication, TLS, and mirror examples used older `machine.registries` snippets. Updated them to current `RegistryAuthConfig`, `RegistryTLSConfig`, and `RegistryMirrorConfig` configuration documents.
- The DNS fix used the older `machine.network.nameservers` shape. Updated it to the current `ResolverConfig` document format.
- The DNS troubleshooting command described `talosctl containers` as container pull history. Replaced it with checking kubelet logs for resolver errors.
- The explanation of Talos registry credentials versus Kubernetes image pull secrets incorrectly implied precedence. Reworded it to distinguish node-wide Talos registry configuration from namespace/pod-scoped Kubernetes image pull secrets.
- The `talosctl events --tail 20` command used an unsupported flag. Replaced it with `talosctl events --duration 10m`.
- The image listing command used `talosctl images`, which is not the current image listing command. Replaced it with `talosctl image list`.
- The article had duplicate "Cause 7" headings and the summary omitted rate limiting and architecture mismatch. Renumbered the headings and updated the summary list.

## Review Notes
The guide is technically relevant and broadly accurate after the fixes. Some examples are intentionally placeholders, so they still require readers to apply the configuration documents with their normal Talos configuration workflow and replace registry names, credentials, certificate contents, and node addresses.
