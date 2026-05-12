# Validation Summary: How to Prevent Calico Pods from Losing External Service Connectivity

## Status
validated

## Post Type
Guide / Prevention playbook

## Technologies Covered
- Calico (projectcalico.org/v3 API: IPPool, GlobalNetworkPolicy)
- Kubernetes (Pods, CronJobs, kubectl)
- calicoctl CLI
- Bash + Python (validation script)
- busybox (wget, nslookup)
- Mermaid (flowchart)

## Sources Consulted
- Calico IPPool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool — confirms `cidr`, `ipipMode` (Always/CrossSubnet/Never), `natOutgoing` (bool, default false), and `nodeSelector` fields.
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy — confirms `order`, `selector`, `types`, `ingress`/`egress` structure and `default-deny` semantics when `types` includes a direction without matching rules.
- Calico EntityRule reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#entityrule — confirms `notNets` and `ports` are valid destination fields.
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get — confirms `-o yaml` produces a `*List` kind with an `items` array when listing resources.
- Kubernetes CronJob API (batch/v1): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/ — confirms the manifest structure used.
- kubectl run / wait references: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands — confirms `--restart=Never` produces a Pod, and `--for=condition=Ready` syntax is valid.
- BusyBox wget / nslookup: https://busybox.net/downloads/BusyBox.html — confirms `-qO-` and `--timeout` options for wget and `nslookup` availability.

## Issues Found
- Prevention 4: the test script echoed `DNS_OK` immediately after a `wget` to `http://1.1.1.1`, which is an HTTP connectivity check, not DNS. The DNS check (`nslookup google.com`) was the part that actually tested DNS. The labels were swapped/misleading. Fixed by changing the first echo to `HTTP_OK` and the second to `DNS_OK` so each label matches the test it follows.

## Review Notes
- The Calico defaults claim (`natOutgoing` defaults to `false`) is correct per the IPPool reference.
- `order: 9999` for a default-deny policy is consistent with Calico's "lower order = higher priority" semantics; specific Allow policies at lower order numbers will be evaluated first.
- Prevention 4 uses `kubectl wait pod ... --for=condition=Ready --timeout=30s` on a short-lived Pod created with `--restart=Never`. This can be racy: a pod that completes quickly may transition through Ready briefly and reach Succeeded before `kubectl wait` observes Ready=True, depending on image-pull latency. Not strictly incorrect but worth being aware of; a `--for=jsonpath='{.status.phase}'=Succeeded` approach or a one-shot Job would be more deterministic.
- The Prevention 3 Python snippet uses 2-space indentation rather than the conventional 4-space; valid Python, just unconventional.
- Image references (`busybox`) are unpinned to a digest/tag; fine for ephemeral test workloads but worth pinning for production-style probes.
