# Validation Summary: Standardizing Team Workflows Around calicoctl ipam split

## Status
validated

## Post Type
Operational guide

## Technologies Covered
- Calico
- calicoctl
- Calico IPAM
- Kubernetes CronJob
- Bash scripting

## Sources Consulted
- Calico Open Source documentation: calicoctl ipam split, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/split
- Calico Open Source documentation: calicoctl ipam overview, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source documentation: configure calicoctl, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Kubernetes documentation: CronJob, https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The post described `calicoctl ipam split` as a daily or routine health check. This was incorrect because the command mutates IP pools by splitting an existing pool into smaller pools. Updated the introduction, scheduling guidance, troubleshooting, and conclusion to frame the command as planned IPAM maintenance.
- The script and CronJob ran `calicoctl ipam split` without first locking the Calico datastore and unlocking it afterward. Calico documentation states the datastore must be locked before splitting and unlocked after the split. Added `calicoctl datastore migrate lock`, an `EXIT` trap for `calicoctl datastore migrate unlock`, and a pre-split `calicoctl ipam check`.
- The command examples used `calicoctl ipam split 4 --cidr=10.244.0.0/24`. Updated the examples to the documented form, `calicoctl ipam split --cidr=10.244.0.0/24 4`.
- The automated example was an active daily CronJob for a mutating IPAM operation. Changed it to a suspended runbook CronJob so execution requires an intentional approval step.
- The container image referenced Calico v3.27.0 while the current official documentation reviewed is Calico Open Source 3.32. Updated the example image to `calico/ctl:v3.32.0`.

## Review Notes
The corrected examples still use the sample CIDR `10.244.0.0/24`; operators must replace it with an actual IPPool CIDR or use `--name=<POOL_NAME>` for their environment. The service account in the CronJob must have datastore access appropriate for calicoctl operations.
