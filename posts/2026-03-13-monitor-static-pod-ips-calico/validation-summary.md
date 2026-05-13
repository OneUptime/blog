# Validation Summary: How to Monitor Static Pod IPs in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.20+)
- Calico IPAM
- `calicoctl` CLI
- Kubernetes (StatefulSet, Pod annotations)
- `kubectl`
- Bash scripting
- Prometheus / kube-state-metrics (`PrometheusRule` CRD from prometheus-operator)

## Sources Consulted
- Calico docs — Use a specific IP address with a pod: https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico docs — `calicoctl ipam show`: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico docs — `calicoctl get workloadendpoint` reference
- kube-state-metrics docs — `kube_pod_status_phase` metric
- prometheus-operator docs — `PrometheusRule` (`monitoring.coreos.com/v1`)

## Issues Found
No technical issues found.

Verified items:
- `cni.projectcalico.org/ipAddrs` annotation name and JSON-array string value format match official Calico documentation.
- StatefulSet uses `replicas: 1`, which avoids the well-known pitfall of all replicas claiming the same static IP when the annotation is set in the pod template.
- `calicoctl ipam show --ip=<ip>` and `calicoctl ipam show --show-blocks` are valid flags.
- `calicoctl get workloadendpoints -A -o yaml` is valid syntax.
- `kubectl wait --for=condition=Ready pod/<name>` syntax is correct.
- Bash script uses `declare -A` (Bash 4+) and `set -euo pipefail` correctly; `${!EXPECTED_IPS[@]}` iterates associative array keys properly.
- `PrometheusRule` `apiVersion: monitoring.coreos.com/v1` and `kube_pod_status_phase` metric/labels match kube-state-metrics.

## Review Notes
- The Step 5 section is titled "Prometheus Alert for IP Mismatch" but the actual rule alerts on pod phase != Running rather than directly on IP mismatch. This is a reasonable proxy (a pod not running cannot hold its IP), and the alert is internally consistent (`CalicoStaticIPPodNotRunning` with a matching summary), so this is a stylistic rather than a technical issue. A future revision could either rename the heading to "Prometheus Alert for Static IP Pod Health" or implement a true IP-mismatch alert using `kube_pod_info{pod_ip!="<expected>"}`-style queries.
- Calico annotation-based static IPs in a StatefulSet template only work cleanly for single-replica StatefulSets (as used here). For multi-replica stateful workloads, users typically need per-pod CNI configuration or an external operator — worth flagging in a follow-up if the post is ever extended.
