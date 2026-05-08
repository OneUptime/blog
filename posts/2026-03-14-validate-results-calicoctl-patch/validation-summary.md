# Validation Summary: How to Validate Results After Running calicoctl patch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- kubectl
- Felix
- Prometheus metrics
- Bash

## Sources Consulted
- Calico documentation: calicoctl patch command: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico documentation: Felix configuration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Configuring Felix: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Kubernetes documentation: kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes documentation: Field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The introduction said a modified Felix configuration might not take effect until Felix restarts. Calico documents that Felix configuration is read from multiple sources with defined precedence, so the issue is more accurately that a datastore-level FelixConfiguration patch may be overridden by higher-precedence environment variables, configuration file values, or node-specific FelixConfiguration. Updated the sentence accordingly.
- The prerequisites did not mention that Felix Prometheus metrics are disabled by default. Added a prerequisite noting that metrics must be enabled before using metrics-based sync checks.
- The resource validation script said it traversed YAML while the command used `-o json` and Python's JSON parser. Updated the comment to say JSON output.
- The Felix log pipeline used `grep` under `set -euo pipefail`, which could terminate the script when no matching recent log line exists. Added `|| true` so an empty recent-log filter does not prevent the metrics check from running.
- The network behavior script used `kubectl exec -it` in non-interactive validation scripts. Removed `-it` so the commands are suitable for automation, consistent with kubectl exec usage.
- The automated pipeline described a log-read check as Felix sync validation. Renamed the check to "Felix logs are readable" so it does not overstate what the command proves.
- The automated pipeline's "All calico-node pods are running" check only verified that a filtered `kubectl get pods` command succeeded; it could pass with zero running pods. Replaced it with a helper that compares the total calico-node pod count with the running calico-node pod count and requires at least one pod.
- The scripts assumed the Calico namespace was always `calico-system`. Added a `CALICO_NAMESPACE` variable defaulting to `calico-system` so users can set it for manifest-based installations that use `kube-system`.

## Review Notes
The examples are still environment-dependent: service names, deployment names, container tools such as `curl`, `nslookup`, and `wget`, and the Calico installation namespace may differ between clusters. The post now calls out the namespace and metrics prerequisites, but users should still adapt the test workloads and commands to their cluster.
