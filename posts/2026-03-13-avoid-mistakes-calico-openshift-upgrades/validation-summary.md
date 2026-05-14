# Validation Summary: How to Avoid Common Mistakes with Calico on OpenShift Upgrades

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Enterprise
- OpenShift Container Platform
- Kubernetes
- OpenShift CLI (`oc`)
- Security Context Constraints (SCCs)
- MachineConfigPool upgrades

## Sources Consulted
- Calico Enterprise support and compatibility: https://docs.tigera.io/calico-enterprise/latest/getting-started/compatibility
- Calico Enterprise OpenShift system requirements: https://docs.tigera.io/calico-enterprise/latest/getting-started/install-on-clusters/openshift/requirements
- Calico Enterprise OpenShift upgrade documentation: https://docs.tigera.io/calico-enterprise/latest/getting-started/upgrading/upgrading-enterprise/openshift-upgrade
- Calico OpenShift 4 upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/openshift-upgrade
- OpenShift cluster update documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.19/html/updating_clusters/performing-a-cluster-update
- OpenShift MachineConfigPool troubleshooting notes: https://docs.openshift.com/container-platform/4.18/support/troubleshooting/diagnosing-oc-issues.html
- OpenShift SCC documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.19/html-single/authentication_and_authorization/index
- Kubernetes `kubectl get` reference, used because `oc get` follows kubectl-style flags for this command: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes `kubectl api-resources` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources

## Issues Found
- The Calico Enterprise requirements URL in the post used an outdated path. Updated it to the current OpenShift requirements path and added the official support and compatibility page because the post specifically tells readers to check the OpenShift compatibility matrix.
- The SCC API check used `oc get scc --show-api-group`, but `--show-api-group` is not a supported `kubectl/oc get` flag. Replaced it with `oc api-resources --api-group=security.openshift.io | grep securitycontextconstraints`, which checks the served SCC API group.
- The stable-cluster check only mentioned `Progressing=False` and `Available=True`. Updated the comment to also include `Degraded=False`, matching the OpenShift update status columns used to confirm cluster health.
- The SCC comparison example used `grep -A100` against a multi-object YAML snapshot and recomputed the snapshot filename with `date`, both of which can produce incorrect comparisons. Reworked the snippet to save a stable snapshot filename and capture explicit pre- and post-upgrade `calico-node` SCC YAML files before running `diff -u`.

## Review Notes
The post is technically relevant and the guidance is broadly consistent with official Calico and OpenShift upgrade documentation. The examples are operational checks rather than a complete upgrade procedure, so readers should still follow the exact Calico version-specific upgrade steps and release notes for their installed Calico Enterprise or open source Calico version.
