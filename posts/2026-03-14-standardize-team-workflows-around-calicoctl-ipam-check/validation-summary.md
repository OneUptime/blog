# Validation Summary: Standardizing Team Workflows Around calicoctl ipam check

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico IPAM
- Kubernetes CronJob inspection with kubectl
- Bash scripting
- YAML snippets

## Sources Consulted
- Calico Open Source 3.32 `calicoctl ipam` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source 3.32 `calicoctl ipam check` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico Open Source 3.32 `calicoctl ipam release` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico Open Source 3.32 `calicoctl ipam show` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source IP address management overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Kubernetes kubectl reference for `kubectl get`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The response playbook used `calicoctl ipam release --node=<node>`, but the official Calico 3.32 `ipam release` command supports `--ip=<IP>` and `--from-report=<REPORT>`, not `--node`. Replaced that procedure with the documented report workflow: `calicoctl ipam check -o report.json` followed by `calicoctl ipam release --from-report=report.json`.
- The audit schedule referred to alerting on "orphaned blocks" from `calicoctl ipam check`. The official help describes problem IP reporting as leaked or improperly allocated IPs, so the alert wording was changed to "leaked IPs or IP allocation inconsistencies."
- The verification section implied a CronJob had been created by the post. Since no CronJob manifest is included, the comment was clarified to say the command applies if the team's automation uses a CronJob.

## Review Notes
The remaining `calicoctl ipam check`, `calicoctl ipam show`, `calicoctl ipam show --show-blocks`, `calicoctl ipam release --ip=<ip>`, and `kubectl get cronjobs -n calico-system` command forms are valid. The post is a process guide rather than a full automation tutorial, so the CronJob verification remains conditional.
