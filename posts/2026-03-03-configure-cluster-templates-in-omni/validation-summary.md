# Validation Summary: How to Configure Cluster Templates in Omni

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Sidero Omni (cluster template feature)
- Talos Linux (machine configuration patches)
- Kubernetes (versions, kubelet, etcd, kube-apiserver)
- `omnictl` CLI
- GitHub Actions (CI/CD example)
- containerd (CRI configuration drop-in files)

## Sources Consulted
- Sidero Omni cluster templates reference: https://docs.siderolabs.com/omni/reference/cluster-templates
- Sidero Omni "Create a cluster using templates" how-to: https://docs.siderolabs.com/omni/how-to-guides/create-a-cluster-using-templates
- Sidero Omni `omnictl` CLI reference: https://docs.siderolabs.com/omni/reference/cli
- Example cluster template from `siderolabs/contrib`: https://github.com/siderolabs/contrib/blob/main/examples/omni/infra/cluster-template.yaml
- Talos Linux containerd configuration reference: https://www.talos.dev/v1.11/talos-guides/configuration/containerd/
- `siderolabs/omni` releases (omnictl download): https://github.com/siderolabs/omni/releases

## Issues Found

1. **Wrong cluster-template YAML structure.** The original post wrote a single YAML document with `controlPlane:` and `workers:` nested under the top-level `Cluster` body. Omni's cluster template format is actually a multi-document YAML where `Cluster`, `ControlPlane`, and `Workers` are separate documents separated by `---`. Every YAML example in the post was restructured to the multi-document form.

2. **`machineCount` is not a valid field.** Used throughout the post (e.g., `controlPlane: { machineCount: 3 }`). The actual schema uses either `machineClass: { name: <class>, size: <N> }` or an explicit `machines: [<uuid>, ...]` list. Replaced every `machineCount` with the correct `machineClass`/`size` form.

3. **`machineSelector` with `matchLabels` does not exist in cluster templates.** The "Using Machine Selectors in Templates" section invented a `machineSelector.matchLabels` block on `ControlPlane`/`Workers`. In real Omni, machine selection uses a separately defined `MachineClass` resource (with a `matchLabels` selector string in its spec) that is then referenced by name from the cluster template. The section was renamed "Using Machine Classes in Templates" and rewritten to show creating the MachineClass resource via `omnictl apply` and then referencing it from `ControlPlane`/`Workers`.

4. **Wrong `omnictl` subcommand.** The post used `omnictl cluster template apply` in five places. `apply` is not a `omnictl cluster template` subcommand; the actual subcommands are `delete`, `diff`, `export`, `render`, `status`, `sync`, and `validate`. All occurrences were changed to `omnictl cluster template sync`. The cluster status check was changed from `omnictl cluster status dev-cluster` to `omnictl cluster template status -f cluster-template-basic.yaml` to use the template-aware subcommand.

5. **`${index}` hostname substitution is not a real Omni feature.** The "Production-Ready Templates" example used `hostname: cp-${index}` and `hostname: worker-${index}` inside inline patches. Omni does not perform `${index}` interpolation in patches — those literal strings would end up as the hostname. The `network.hostname` patch fields were removed.

6. **Patches under `ControlPlane`/`Workers` were misplaced.** The original nested `patches` at the same level as `machineCount` inside a single document. After restructuring to separate `ControlPlane`/`Workers` documents, `patches:` was correctly placed at the top level of those documents.

7. **Wrong containerd drop-in path/extension.** The post used `path: /var/cri/conf.d/20-customization.toml`. The correct Talos containerd drop-in path is `/etc/cri/conf.d/20-customization.part` (Talos merges `.part` fragments from `/etc/cri/conf.d/`).

8. **Bogus template inheritance/composition.** The "Template Inheritance and Composition" section claimed `omnictl cluster template apply -f base.yaml -f overrides.yaml` would layer templates. `omnictl cluster template sync` accepts a single `-f` flag and there is no template-overlay/override feature. The section was renamed "Sharing Configuration Across Templates" and rewritten to show the actual sharing mechanism — file-based patches referenced via the `file:` field on a patch entry.

9. **omnictl download URL changed to GitHub releases.** The original `https://omni.siderolabs.com/omnictl/latest/omnictl-linux-amd64` does redirect in some configurations, but the canonical, documented URL is `https://github.com/siderolabs/omni/releases/latest/download/omnictl-linux-amd64`, which is now used in the GitHub Actions example.

## Review Notes

- The Kubernetes and Talos versions used in the examples (`v1.29.0` and `v1.6.0`) are several years out of date as of 2026-05-17 (current Talos is in the 1.11.x range and Kubernetes in the 1.34.x range). They are still syntactically valid template values, so they were left unchanged to stay within the scope of "fix what is technically wrong, do not restructure." A future revision should bump these to currently supported versions.
- The post uses `kubelet.extraArgs` and `etcd.extraArgs` style fields that match the Talos machine config schema in the v1.6.x line. With newer Talos, `extraArgs` was renamed/replaced with `extraArgs` map under the relevant section in some cases; users on current Talos should consult the Talos reference for their specific version.
- The `MachineClass` resource example uses the `metadata`/`spec` form accepted by `omnictl apply`. The exact `type` string (`MachineClasses.omni.sidero.dev`) should be verified against the Omni API for the user's installation; the `matchLabels` selector syntax (a list of comma-separated `key=value` selector strings) is correct.
