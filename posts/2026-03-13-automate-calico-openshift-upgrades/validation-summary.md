# Validation Summary: How to Automate Calico on OpenShift Upgrades

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- OpenShift Container Platform
- Kubernetes
- Tigera Operator
- GitHub Actions
- Bash

## Sources Consulted
- Calico documentation: Upgrade Calico on OpenShift 4, https://docs.tigera.io/calico/latest/operations/upgrading/openshift-upgrade
- Calico documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: OpenShift migration and TigeraStatus wait examples, https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/ovn-to-calico
- Calico documentation: OpenShift system requirements, https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/requirements
- Red Hat OpenShift documentation: MachineConfigPool status fields, https://docs.redhat.com/en/documentation/openshift_container_platform/4.17/html-single/machine_configuration/index
- Red Hat OpenShift documentation: Understanding OpenShift updates and MachineConfigPool behavior, https://docs.redhat.com/en/documentation/openshift_container_platform/4.15/html/updating_clusters/understanding-openshift-updates-1
- Kubernetes documentation: kubectl rollout status examples, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- GitHub Actions documentation: workflow_dispatch inputs, https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions

## Issues Found
- The prerequisite cluster operator health command matched healthy rows because every healthy operator includes `False` for `PROGRESSING` and `DEGRADED`. Replaced it with an `awk` check that only counts operators whose `AVAILABLE`, `PROGRESSING`, or `DEGRADED` columns are not in the healthy state.
- The MachineConfigPool pre-flight only checked `UPDATING=True`, so it could miss MCPs that were not fully updated or were degraded. Updated the check to require `UPDATED=True`, `UPDATING=False`, and `DEGRADED=False`.
- The pre-flight cluster operator section only warned on degraded operators while still printing "Pre-flight checks passed." Changed it to fail when any operator is unavailable, progressing, or degraded.
- The GitHub Actions pre-flight used `grep -v "True.*False"`, which could succeed on headers or unrelated lines and did not accurately validate MCP readiness. Replaced it with explicit OpenShift MCP and cluster operator health checks.
- The upgrade step patched `Installation.spec.version`, but the Calico Installation API does not define `spec.version`. Replaced it with the official OpenShift upgrade flow: applying the versioned `tigera-operator-ocp-upgrade.yaml` manifest with `oc apply --server-side --force-conflicts`.
- The workflow waited only for the `calico-node` DaemonSet. Added waits for the `tigera-operator` Deployment rollout and `tigerastatus` resources to become `Available`, matching documented Calico/OpenShift validation patterns.
- The validation script did not pass the selected GitHub Actions cluster context into its `oc`/`kubectl` commands. Added an optional context argument and used `oc --context`.
- The validation script queried `installation default` through `kubectl`. Updated it to query the fully qualified `installation.operator.tigera.io default` resource through `oc`.

## Review Notes
- The post is technically relevant and contains implementation-focused OpenShift, Calico, GitHub Actions, and Bash examples.
- The examples assume a Calico operator-managed OpenShift installation and a Calico release input formatted as a tag such as `v3.32.0`.
- Local `oc` and `kubectl` binaries were not installed in the review environment, so CLI behavior was checked against official documentation rather than live command help.
