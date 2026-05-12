# Validation Summary: How to Secure Calico on OpenShift Upgrades

## Status
validated

## Post Type
Guide / Reference (security checklist with bash snippets)

## Technologies Covered
- Calico (open source + Calico Enterprise / Tigera)
- Red Hat OpenShift Container Platform (OCP) 4.x
- OpenShift Security Context Constraints (SCC)
- OpenShift `oc` CLI (`oc get scc`, `oc adm policy who-can`, `oc adm must-gather`)
- Kubernetes `kubectl` (jsonpath)
- Red Hat Security Advisories (RHSA) / OCP Upgrade Graph
- `jq`, `grep`, `curl` (shell tooling)
- Mermaid diagrams

## Sources Consulted
- OpenShift SecurityContextConstraints API reference (`security.openshift.io/v1`) — boolean fields including `allowPrivilegedContainer`, `allowHostNetwork`, `allowHostPID`, `allowHostIPC`, `allowHostPorts`, `allowHostDirVolumePlugin` (https://docs.openshift.com/container-platform/4.14/rest_api/security_apis/securitycontextconstraints-security-openshift-io-v1.html)
- OpenShift docs: Managing Security Context Constraints (https://docs.openshift.com/container-platform/4.14/authentication/managing-security-context-constraints.html)
- OpenShift `oc adm must-gather` documentation for collecting audit logs via `gather_audit_logs` (https://docs.openshift.com/container-platform/4.14/support/gathering-cluster-data.html)
- OpenShift `oc adm policy who-can` reference
- Red Hat Customer Portal / OCP Upgrade Graph Tool (https://access.redhat.com/labs/ocpupgradegraph/)
- Tigera security advisories (https://docs.tigera.io/calico-enterprise/latest/release-notes/security-advisories)
- GNU grep manual on BRE alternation (`\|`) and `-E` (ERE) grouping

## Issues Found
1. **Incorrect SCC field name in conclusion.** The conclusion referenced `allowPrivileged: true` as an example of a privilege-broadening field, but the actual SCC YAML field name is `allowPrivilegedContainer` (per the `security.openshift.io/v1` API). Updated the example to `allowPrivilegedContainer: true` so readers searching/diffing SCC manifests use the real key.
2. **Broken grep alternation in Security Control 3.** The pipeline `grep '"verb":"update\|patch\|delete"'` uses GNU BRE alternation across the entire pattern, which expands to three separate alternatives — `"verb":"update`, `patch`, and `delete"` — matching any line containing just `patch` or `delete"`. Changed to `grep -E '"verb":"(update|patch|delete)"'` so the alternation is properly scoped inside the quoted verb value.

## Review Notes
- The `grep -E "allowPrivileged|hostNetwork|hostPID|hostIPC|volumes|capabilities"` filter in Security Control 2 is fine because the patterns are substrings of the real SCC fields (`allowPrivilegedContainer`, `allowHostNetwork`, `allowHostPID`, `allowHostIPC`, `volumes`, `allowedCapabilities` / `requiredDropCapabilities` / `defaultAddCapabilities`) and grep matches on substrings. No change needed.
- The `curl` against `https://access.redhat.com/labs/ocpupgradegraph/update_path` is illustrative; the labs UI is the canonical source and a programmatic equivalent lives at `https://api.openshift.com/api/upgrades_info/v1/graph`. The post frames it as an exploratory check rather than a guaranteed JSON API, so left as-is.
- The Tigera security advisories link `https://docs.tigera.io/security-advisories` may redirect to a versioned path under `calico-enterprise/<version>/release-notes/security-advisories`, but the top-level URL is a reasonable starting point. Not changed.
- `oc adm must-gather -- gather_audit_logs` is the correct invocation; the audit log files land under the must-gather output directory (e.g., `audit_logs/kube-apiserver/`), so the subsequent `grep audit.log` step assumes the user has consolidated or `cd`'d into that location. Acceptable as a representative example.
- Mermaid `\n` line breaks in node labels are supported by Mermaid's flowchart syntax. No change needed.
