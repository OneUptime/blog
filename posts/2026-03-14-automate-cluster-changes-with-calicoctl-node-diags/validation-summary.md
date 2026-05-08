# Validation Summary: Automating Diagnostic Collection with calicoctl node diags

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes CronJob
- kubectl
- Bash scripting
- SSH/SCP-based automation

## Sources Consulted
- Calico official `calicoctl node diags` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/diags
- Calico official troubleshooting and diagnostics guide: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico official `calicoctl cluster diags` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags
- Calico official `calicoctl` installation guide: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Kubernetes official CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes official `kubectl cp` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/

## Issues Found
- The original Kubernetes CronJob ran `calicoctl node diags` inside a standalone `calico/ctl` pod. Official Calico documentation states that `calicoctl node diags` must be run on the specific Calico node being diagnosed. Updated the CronJob to SSH to each node and run `sudo calicoctl node diags` there.
- The original multi-node pipeline ran `calicoctl node diags` via `kubectl exec` in `calico-node` pods and copied bundles with `kubectl cp`. Updated it to run the command on each node over SSH and retrieve the generated archive with `scp`.
- The original examples searched for `/tmp/calico-diags-*.tar.gz`. Official examples show `calicoctl node diags` writes archives as `/tmp/calico<random>/diags-*.tar.gz`. Updated all bundle discovery commands to use `/tmp/calico*/diags-*.tar.gz`.
- The prerequisites did not mention that node-level collection requires matching-version `calicoctl` and node access on each target node. Added those prerequisites.
- The troubleshooting section referenced privileged pod, hostNetwork, and hostPID requirements from the previous pod-based example. Updated the guidance to match the SSH/node-based workflow.

## Review Notes
The corrected examples intentionally keep the article focused on `calicoctl node diags`. For Kubernetes-native cluster-wide collection, Calico also provides `calicoctl cluster diags`, but that command gathers a different cluster-level diagnostic bundle and was not substituted for the node-level workflow.
