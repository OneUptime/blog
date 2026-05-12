# Validation Summary: How to Set Up Calico Operator Migration Step by Step

## Status
validated

## Post Type
Tutorial / Step-by-step migration guide

## Technologies Covered
- Calico (open-source CNI)
- Tigera Operator (Installation CR, `operator.tigera.io/v1`)
- Kubernetes (DaemonSet, Deployment, namespaces, kubectl)
- `calicoctl` CLI
- IPPool, FelixConfiguration, GlobalNetworkPolicy custom resources
- Calico v3.27.0 (released 2023-12-15)

## Sources Consulted
- Calico operator migration guide: https://docs.tigera.io/calico/latest/operations/operator-migration
- Tigera Operator Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico v3.27.0 release: https://github.com/projectcalico/calico/releases/tag/v3.27.0
- Tigera Operator manifest: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

## Issues Found
- **Misleading comment on `variant: Calico`** — The YAML manifest in Step 2 originally claimed the `variant` field was used to "Specify current version to avoid automatic upgrade." That is incorrect: the `variant` field selects which product to install (valid values are `Calico` or `TigeraSecureEnterprise`) and has no effect on version pinning or upgrade behavior. The comment was corrected to "Select the open-source Calico variant (vs. Calico Enterprise)."

## Review Notes
- The Tigera Operator manifest URL pattern (`https://raw.githubusercontent.com/projectcalico/calico/<version>/manifests/tigera-operator.yaml`) is correct for v3.27.0.
- The Installation CR fields (`apiVersion: operator.tigera.io/v1`, `spec.calicoNetwork.ipPools[].cidr`, `encapsulation`, `natOutgoing`, `nodeSelector`) and the `VXLAN` encapsulation value are all valid per the documented API.
- The automatic-migration claim is accurate: per Tigera's "Migrate Calico to an operator-managed installation" guide, the operator detects an existing manifest installation, takes ownership of the resources, migrates pods into the `calico-system` namespace, and cleans up the legacy `kube-system` resources. Users with custom or unsupported configurations should consult the migration guide before executing, since unsupported customizations produce warnings.
- The `CURRENT_ENCAP` shell variable in Step 2 only reads `spec.ipipMode` — for IP pools using VXLAN encapsulation, the relevant field is `spec.vxlanMode`. This is a minor incompleteness (the variable is illustrative and not consumed by the Installation YAML below) and was left as-is to avoid introducing scope changes beyond clear technical errors.
- The mermaid diagram uses `\n` for line breaks inside unquoted node labels. This works in current Mermaid versions but is non-standard; `<br/>` is more portable. Not fixed as it is rendering-engine dependent and not strictly incorrect.
- Calico v3.15+ is listed as the minimum supported source version; readers running older Calico versions should upgrade to a recent v3.x release before attempting the operator migration.
