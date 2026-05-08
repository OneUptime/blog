# Validation Summary: Standardizing Team Workflows Around calicoctl ipam release

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Calico IPAM
- Kubernetes CronJob
- Bash
- YAML

## Sources Consulted
- Calico Open Source calicoctl IPAM overview: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source calicoctl ipam release reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico Open Source calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico Open Source Install calicoctl guide: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico Open Source Kubernetes API datastore configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The post treated `calicoctl ipam release` as a routine health-check or visibility command. Calico documents `ipam release` as a mutating command that releases a previously assigned address and should be used to clean up addresses from endpoints that were not cleanly removed. I changed the workflow language to use `calicoctl ipam check` for detection and `calicoctl ipam release` for controlled cleanup.
- The team script released a hardcoded IP address with `calicoctl ipam release --ip=10.244.0.5`. That could incorrectly free an address still used by an endpoint. I changed the script to follow Calico's documented check-and-release workflow: lock the datastore, generate an IPAM report, release leaked addresses from that report, and unlock the datastore with a trap.
- The CronJob automatically ran `calicoctl ipam release --ip=10.244.0.5`. That is unsafe for routine monitoring because it mutates IPAM state and uses a hardcoded address. I changed the CronJob to run `calicoctl ipam check --show-problem-ips -o /tmp/ipam-report.json` so scheduled automation reports issues without releasing addresses.
- The CronJob did not configure the calicoctl datastore type. I added `DATASTORE_TYPE=kubernetes`, matching Calico's documented environment variable for Kubernetes API datastore access.
- The container image used `calico/ctl:v3.27.0`, while the current Calico documentation references `v3.32.0` and states that the `calicoctl` version should match the cluster's Calico version. I updated the example image and added a prerequisite about version matching.

## Review Notes
The Kubernetes CronJob manifest structure uses `apiVersion: batch/v1`, `kind: CronJob`, `.spec.schedule`, `.spec.jobTemplate`, container command, and pod `restartPolicy` fields in the documented form. The CronJob still assumes that the referenced `calicoctl` service account, RBAC, and Calico connection configuration already exist.
