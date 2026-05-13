# Validation Summary: How to Monitor BGP Peer Not Established in Calico

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico
- Calico BGP and BIRD
- calicoctl
- Kubernetes CronJob
- Kubernetes RBAC
- PrometheusRule
- kube-state-metrics Job metrics

## Sources Consulted
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico `calicoctl node status` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- kube-state-metrics Job metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/job-metrics.md

## Issues Found
- The introduction and description incorrectly implied that BIRD exposes BGP session state through Felix Prometheus metrics. Updated the post to state that Felix exposes component metrics, while BGP peer state is normally checked with `calicoctl node status` on a Calico node or by querying BIRD inside the `calico-node` pod.
- The CronJob ran `calicoctl node status` from a standalone `calico/ctl` pod. That command checks the local Calico node instance and would not reliably inspect every node from a separate pod. Replaced it with a Kubernetes CronJob that lists `calico-node` pods and runs `birdcl` inside each pod, with the minimal ServiceAccount, Role, and RoleBinding required for pod listing and exec.
- The original CronJob image and service account were not sufficient for the proposed Kubernetes API operations. Updated the image to `alpine/k8s:1.30.0`, verified it includes `kubectl` and `/bin/sh`, and added dedicated RBAC.
- The Prometheus alert used `kube_job_status_failed > 0`, which can remain true for retained failed Jobs after recovery. Updated the expression to alert on recent increases in failed Job count over a 10-minute window.

## Review Notes
- The examples assume Calico is installed in `kube-system` with pods labeled `k8s-app=calico-node`. Operator-based installations often use `calico-system`, so users may need to adjust the namespace and label selector for their deployment.
- The diagnosis metrics grep may return no BGP session-state series on some Calico versions; the BIRD protocol check is the authoritative check used by the corrected CronJob.
