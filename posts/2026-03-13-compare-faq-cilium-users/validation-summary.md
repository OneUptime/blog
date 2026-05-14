# Validation Summary: Compare FAQ for Cilium Users

## Status
validated

## Post Type
FAQ / Troubleshooting guide

## Technologies Covered
- Cilium
- Cilium CLI
- Cilium debug CLI (`cilium-dbg`)
- Hubble
- Kubernetes
- Helm

## Sources Consulted
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/
- `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- `cilium config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- `cilium hubble enable` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_hubble_enable/
- `cilium hubble ui` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_hubble_ui/
- `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_endpoint_list/
- `cilium-dbg endpoint get` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_endpoint_get/
- Cilium troubleshooting guide: https://docs.cilium.io/en/latest/operations/troubleshooting/
- Cilium upgrade guide: https://docs.cilium.io/en/latest/operations/upgrade/
- Cilium Hubble UI setup guide: https://docs.cilium.io/en/latest/observability/hubble/hubble-ui/
- Cilium network policy documentation: https://docs.cilium.io/en/latest/network/kubernetes/policy/

## Issues Found
- The post used `cilium endpoint list` and `cilium endpoint get <endpoint-id>`, but endpoint inspection is provided by `cilium-dbg` and is typically run inside a Cilium pod in Kubernetes. Updated the examples to `kubectl -n kube-system exec -ti <cilium-pod> -- cilium-dbg endpoint list` and `kubectl -n kube-system exec -ti <cilium-pod> -- cilium-dbg endpoint get <endpoint-id>`.
- The Hubble section enabled Hubble without the UI, then opened the UI. Updated the enable command to `cilium hubble enable --ui` so the UI is installed before `cilium hubble ui` is used.
- The Helm upgrade example used `--reuse-values` while changing the Cilium chart version. Cilium's upgrade guide warns not to use `--reuse-values` for minor version upgrades. Updated the example to export existing values with `helm get values`, review them, and pass a reviewed values file with `-f old-values.yaml`.
- The upgrade example pinned Cilium `1.15.0`, which is outdated and not a latest patch release. Replaced it with `<target-version>` to avoid recommending an obsolete fixed version.
- The best-practices section recommended `cilium debuginfo`, but Kubernetes troubleshooting bundles should be collected with `cilium sysdump`; `cilium-dbg debuginfo` is mainly for non-Kubernetes or single-agent debug output and is included in sysdump. Updated the recommendation to `cilium sysdump`.

## Review Notes
- `kubectl get cnp,ccnp -A`, `cilium status`, `cilium connectivity test`, `cilium config view`, `cilium hubble ui`, `cilium version`, and the Cilium agent log command are valid for the troubleshooting context described.
- Future updates could mention `cilium status --wait` for installation and upgrade validation, but the current `cilium status` example is technically correct.
