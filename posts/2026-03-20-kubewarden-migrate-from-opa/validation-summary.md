# Validation Summary: How to Migrate from OPA Gatekeeper to Kubewarden

## Status
validated

## Post Type
Migration guide

## Technologies Covered
- OPA Gatekeeper
- Kubewarden
- Kubernetes admission control
- Rego
- WebAssembly (Wasm)
- `kwctl`
- Artifact Hub

## Sources Consulted
- Kubewarden vs OPA Gatekeeper: https://docs.kubewarden.io/explanations/comparisons/opa-comparison
- Gatekeeper support in Kubewarden: https://docs.kubewarden.io/tutorials/writing-policies/rego/gatekeeper/intro
- Build and run a Gatekeeper policy with Kubewarden: https://docs.kubewarden.io/tutorials/writing-policies/rego/gatekeeper/build-and-run
- Distributing a Gatekeeper policy with Kubewarden: https://docs.kubewarden.io/tutorials/writing-policies/rego/gatekeeper/distribute
- Kubewarden `kwctl` CLI reference: https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden CRD reference: https://docs.kubewarden.io/reference/CRDs
- Kubewarden monitor mode: https://docs.kubewarden.io/1.7/operator-manual/monitor-mode
- Kubewarden common tasks and Artifact Hub note: https://docs.kubewarden.io/howtos/tasks
- Kubewarden audit scanner and reports: https://docs.kubewarden.io/explanations/audit-scanner and https://docs.kubewarden.io/explanations/audit-scanner/policy-reports
- Gatekeeper installation and uninstallation: https://open-policy-agent.github.io/gatekeeper/website/docs/next/install/
- Gatekeeper `gator` CLI: https://open-policy-agent.github.io/gatekeeper/website/docs/next/gator
- Kubernetes `kubectl` references: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/, and https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The post said migration required rewriting Gatekeeper Rego into another language. Kubewarden can run Gatekeeper Rego policies directly in `executionMode: gatekeeper`, so I changed the guidance and replaced the incorrect Go example with the documented Gatekeeper-Rego-to-Wasm packaging flow.
- The architecture table understated Kubewarden language support and listed `conftest` as the Gatekeeper testing tool. I corrected the table to reflect Kubewarden's documented Rego/CEL/language support and Gatekeeper's `gator` CLI.
- The Gatekeeper inventory commands used `kubectl get constraints` and `kubectl get constrainttemplate`, which are not reliable generic commands for Gatekeeper's dynamically generated constraint kinds. I replaced them with `kubectl api-resources --api-group=constraints.gatekeeper.sh` plus fully qualified `constrainttemplates.templates.gatekeeper.sh`.
- The post referenced the retired Kubewarden Policy Hub and a nonexistent `kwctl search` command. I updated that section to use Artifact Hub for discovery and kept the supported `kwctl pull` and `kwctl inspect` commands.
- The monitor-mode example used an outdated/ambiguous module reference and a brittle deployment log target. I switched the policy URI to an explicitly documented `registry://` module reference and used a label-based `kubectl logs` query for the default PolicyServer.
- The audit section used `PolicyReport` resources as the default output. Current Kubewarden releases store audit results in OpenReports `Report` and `ClusterReport` resources by default, so I updated the commands accordingly.
- The Gatekeeper removal section used `kubectl delete constraints --all -A`, which does not correctly enumerate Gatekeeper constraint kinds, and it omitted documented CRD cleanup after Helm uninstall. I replaced the deletion flow with per-resource cleanup and added `kubectl delete crd -l gatekeeper.sh/system=yes`.

## Review Notes
- Kubewarden 1.33+ stores audit results in OpenReports by default. Legacy `PolicyReport` resources can still be enabled, but they are deprecated.
- Kubewarden's Gatekeeper compatibility applies to validating Rego policies. Gatekeeper-compatible mutation support is still limited, so some mutation workflows may still require a Kubewarden SDK policy instead of a direct reuse path.
- Kubewarden audit scanning has limitations for some policy shapes, including policies that only target `UPDATE` events.
