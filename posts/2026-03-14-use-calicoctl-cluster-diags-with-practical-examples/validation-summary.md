# Validation Summary: Using calicoctl cluster diags with Practical Examples

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes
- Kubernetes CronJob
- Bash
- Python

## Sources Consulted
- Calico `calicoctl cluster diags` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl` install guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico Kubernetes datastore configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico v3.32.0 `cluster diags` source: https://github.com/projectcalico/calico/blob/v3.32.0/calicoctl/calicoctl/commands/cluster/diags.go
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes API access from Pods: https://kubernetes.io/docs/tasks/run-application/access-api-from-pod

## Issues Found
- The post used the archive name pattern `calico-cluster-diags-*.tar.gz`, but current `calicoctl cluster diags` creates timestamped archives named `calico-diagnostics-YYYYMMDD_HHMMSS.tar.gz`. Updated the sample output, support-bundle script, CronJob copy command, and verification commands to use `calico-diagnostics-*.tar.gz`.
- The prerequisites stated `calicoctl` v3.25+. Official Calico install guidance says the `calicoctl` version should match the Calico cluster version, and current `calicoctl` also checks for version mismatches. Updated the prerequisite accordingly.

## Review Notes
The CronJob manifest is structurally valid for `batch/v1`, but it assumes the referenced `calicoctl` ServiceAccount and PVC already exist and that the ServiceAccount has sufficient RBAC to read Calico and Kubernetes resources and pod logs.
