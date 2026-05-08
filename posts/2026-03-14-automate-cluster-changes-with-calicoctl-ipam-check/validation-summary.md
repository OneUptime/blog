# Validation Summary: Automating IPAM Health Checks with calicoctl ipam check

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico IPAM
- Kubernetes CronJob
- Bash scripting
- Prometheus-style text metrics

## Sources Consulted
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl IPAM command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico calicoctl ipam release reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Kubernetes API datastore configuration for calicoctl: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico calicoctl installation guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The CronJob ran `calicoctl` from inside a pod without configuring access to the Kubernetes API datastore. Added a generated `/tmp/calicoctl.cfg` that uses the pod service account token, Kubernetes API endpoint, and service account CA file.
- The CronJob issue counter used `grep -c ... || echo 0`, which can produce two zero lines when there are no matches and break the numeric comparison. Replaced it with `grep ... || true`.
- The examples looked for "orphan" output, but the documented `calicoctl ipam check` output and options focus on leaked IPs and IPs that are not allocated properly. Updated the matching and metric name accordingly.
- The cleanup script claimed to clean leaked IPs and orphaned blocks but did not actually perform cleanup. Replaced it with Calico's documented workflow: lock the datastore, write an IPAM report with `calicoctl ipam check -o`, and release leaked addresses with `calicoctl ipam release --from-report`.
- The monitoring script parsed `calicoctl ipam show` output using strings that do not match the documented table format. Updated the `awk` parsing to read the `IP Pool` rows and the `IPS TOTAL` / `IPS IN USE` columns.
- The troubleshooting cleanup note referred to releasing IPs from missing nodes. Updated it to align with the documented release behavior: only release leaked addresses and avoid addresses still used by active endpoints.

## Review Notes
- The CronJob still assumes the `calicoctl` service account has the necessary Kubernetes and Calico datastore permissions. The post correctly notes RBAC as a troubleshooting item but does not include a full RBAC manifest.
- The example image tag is `calico/ctl:v3.27.0`. Calico documentation recommends matching the `calicoctl` version to the cluster's Calico version, so operators should adjust the tag for clusters not running Calico v3.27.
