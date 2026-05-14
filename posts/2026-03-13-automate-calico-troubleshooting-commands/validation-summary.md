# Validation Summary: How to Automate Calico Troubleshooting Commands

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Kubernetes CronJob
- Bash
- kubectl

## Sources Consulted
- Calico calicoctl overview: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico BGP peer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post claimed the bundle collected Felix status/error counts and policy counts, but the script collects FelixConfiguration and GlobalNetworkPolicy resources. Updated the description and introduction to match the implemented diagnostics.
- The diagnostic bundle used `calicoctl get installation`, but `Installation` is an `operator.tigera.io/v1` operator resource and is documented for use through Kubernetes APIs. Changed the command to `kubectl get installation.operator.tigera.io -o yaml`.
- The BGP status script counted peers with `grep -c "peer"`, which does not match the uppercase `PEER ADDRESS` table header and can incorrectly count strings such as "No IPv6 peers found." Reworked the script to parse actual `calicoctl node status` table rows with `awk`.
- The BGP status script could produce invalid numeric values when `grep -c` returned zero matches because `grep` prints `0` and exits non-zero, causing the fallback `echo 0` to append a second zero. Reworked the script to run `calicoctl node status` once, fail explicitly if it cannot be read, and compute numeric counts with `awk`.
- The CronJob wrote snapshots to `/snapshots` but defined only a volume, not a `volumeMount`. Added a `volumeMounts` entry for the `snapshots` PVC.

## Review Notes
- The CronJob is a minimal snippet and assumes the `calico-diagnostics` ServiceAccount, RBAC, and `calico-snapshots` PersistentVolumeClaim already exist.
- The `bitnami/kubectl:latest` image tag is functional as an example but pinning a specific image version would make production automation more reproducible.
