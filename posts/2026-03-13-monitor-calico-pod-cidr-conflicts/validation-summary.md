# Validation Summary: How to Monitor Calico Pod CIDR Conflicts

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico IPAM
- Kubernetes CronJob
- kubectl JSONPath
- Linux routing table inspection

## Sources Consulted
- Calico documentation: calicoctl ipam check, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: Calico IP address management, https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico documentation: Configure calicoctl for the Kubernetes API datastore, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico documentation: Configure IP autodetection, https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Kubernetes documentation: CronJob, https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The post described `calicoctl ipam check` as directly alerting on CIDR conflicts, overlaps, or unreachable addresses. Official Calico documentation describes it as an integrity check of Calico IPAM data structures against Kubernetes, with options for showing leaked or improperly allocated IPs. I updated the wording to distinguish IPAM integrity issues from node-network or infrastructure CIDR overlap checks.
- The CronJob ran `calicoctl ipam check` twice and only grepped for words that are not the documented focus of `ipam check`. I changed it to run once with `--show-problem-ips`, preserve the exit status, print the output, and alert on non-zero status or problem indicators.
- The pod IP duplication check used `grep` with an unescaped IP address regular expression. Dots in IP addresses would be interpreted as regex wildcards, so it could produce false matches. I changed the check to compare one IP per line with `grep -Fxq`.
- The routing-table example assumed all Calico tunnel routes use `tunl0`. That is only appropriate for IP-in-IP mode, while Calico can also use other routing or encapsulation modes. I clarified that the example applies when IP-in-IP is enabled and changed the command to inspect `tunl0` routes directly.
- The conclusion overstated `calicoctl ipam check` as early detection for emerging CIDR conflicts. I updated it to say it detects IPAM integrity issues and that CIDR conflict monitoring also requires explicit node and infrastructure range audits.

## Review Notes
The example uses `calico/ctl:v3.27.0`; Calico documentation notes that the calicoctl client and cluster versions should generally match. Future updates should either pin the image to the cluster's Calico version or call that out explicitly.
