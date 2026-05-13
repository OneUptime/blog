# Validation Summary: How to Operationalize Calico on OpenShift Upgrades

## Status
validated

## Post Type
Operational guide / Runbook template

## Technologies Covered
- Calico (Tigera Operator)
- Red Hat OpenShift Container Platform (OCP)
- Kubernetes
- `oc` CLI and `kubectl`
- MachineConfig / MachineConfigPool
- ClusterOperator
- Mermaid Gantt charts

## Sources Consulted
- Red Hat OpenShift Container Platform Life Cycle: https://access.redhat.com/support/policy/updates/openshift
- OpenShift release notes: https://docs.openshift.com/container-platform/latest/release_notes/
- Tigera/Calico operator documentation for `Installation` and `TigeraStatus` CRDs: https://docs.tigera.io/calico/latest/reference/installation/api
- OpenShift CLI reference for `oc adm must-gather`, `oc get co`, `oc get mc`, `oc get mcp`: https://docs.openshift.com/container-platform/latest/cli_reference/openshift_cli/developer-cli-commands.html

## Issues Found
1. The "Before Starting" section referenced a Red Hat Customer Portal URL `https://access.redhat.com/articles/open-cluster-management-supportability`. This article does not exist (the path renders only generic navigation), and "Open Cluster Management" refers to RHACM, not OCP. Replaced with the canonical OpenShift release notes URL `https://docs.openshift.com/container-platform/latest/release_notes/`, which is where Red Hat publishes known issues per release. The surrounding sentence was reworded to match the new target ("Check Red Hat OpenShift release notes for known issues").

## Review Notes
- All `oc`/`kubectl` commands are syntactically correct and use current, non-deprecated subcommands and flags. The expected ClusterOperator status of True/False/False for Available/Progressing/Degraded is correct.
- `kubectl get installation default -o yaml` correctly references the Tigera Operator's cluster-scoped `Installation` CR (name `default`), and `kubectl get tigerastatus -o yaml` is the right resource for reporting Calico operator health.
- The Gantt chart uses OCP 4.15/4.16/4.17 as illustrative versions for a 2026 calendar. In reality OCP 4.15 reached GA in February 2024 and would be near or past maintenance EOL by Q1 2026; by mid-2026 a typical environment would be planning around OCP 4.20+. The chart is clearly a planning template, so the version numbers were left as-is, but readers should substitute the versions actually in use.
- The claim "minor versions every 4-6 months" is slightly looser than Red Hat's stated target of a ~4-month cadence, but is within an acceptable approximation. Z-stream patches typically ship every 1-2 weeks rather than monthly, though "monthly" is a reasonable conservative cadence for planning a stability window.
