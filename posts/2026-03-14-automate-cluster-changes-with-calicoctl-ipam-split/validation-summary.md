# Validation Summary: Automating Cluster Operations with calicoctl ipam split

## Status
validated

## Post Type
Operational guide

## Technologies Covered
- Calico
- calicoctl
- Calico IPAM
- Kubernetes CronJob
- kubectl
- GitHub Actions
- Bash scripting

## Sources Consulted
- Calico Open Source documentation: `calicoctl ipam split`, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/split
- Calico Open Source documentation: `calicoctl ipam` overview, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Kubernetes documentation: CronJob, https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes documentation: `kubectl create job`, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_job/
- GitHub Docs: Workflow syntax for GitHub Actions, https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions

## Issues Found
- The post framed `calicoctl ipam split` as a routine scheduled operation for proactive monitoring. Official Calico documentation describes it as a state-changing command that splits an IP pool into smaller IP pools. Updated the description, introduction, prerequisites, CI/CD trigger, troubleshooting, and conclusion to frame it as an approved maintenance workflow.
- The examples ran `calicoctl ipam split` without first locking the Calico datastore and unlocking it afterward. Calico documentation states the datastore must be locked before the split and unlocked afterward. Added `calicoctl datastore migrate lock` and an `EXIT` trap for `calicoctl datastore migrate unlock`.
- The command examples used `calicoctl ipam split 4 --cidr=10.244.0.0/24`. Updated the examples to the documented example style, `calicoctl ipam split --cidr=10.244.0.0/24 4`.
- The Kubernetes CronJob was active on an every-eight-hours schedule for a mutating IPAM operation. Added `suspend: true` so it acts as a reusable runbook template that requires intentional execution.
- The CronJob used `calico/ctl:v3.27.0` while the current official documentation reviewed is for Calico Open Source 3.32. Updated the example image to `calico/ctl:v3.32.0`.
- The multi-cluster script execed into `calico-kube-controllers` and assumed that pod contains `calicoctl`. Replaced it with `kubectl create job --from=cronjob/...` and log streaming against the reviewed CronJob template.
- The GitHub Actions example used a scheduled hosted runner with no cluster or calicoctl setup. Changed it to a manually triggered workflow on a self-hosted runner, matching the post prerequisite that `calicoctl` is available in the automation environment.

## Review Notes
The corrected examples still use the sample CIDR `10.244.0.0/24`; operators must replace it with an actual IPPool CIDR or use `--name=<POOL_NAME>` for their environment. The `calicoctl` service account and any self-hosted runner credentials must have the permissions needed for IPAM changes and datastore lock operations.
