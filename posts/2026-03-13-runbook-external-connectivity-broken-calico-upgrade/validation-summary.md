# Validation Summary: Runbook: External Connectivity Broken After Calico Upgrade

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Calico (calicoctl, IPPool resource, natOutgoing)
- Kubernetes (kubectl, DaemonSet rollouts, field selectors)
- iptables (nat table, MASQUERADE)
- BusyBox (wget, ping)
- Mermaid (flowchart diagram)

## Sources Consulted
- Calico IPPool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- kubectl rollout docs: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#rollout
- kubectl run docs: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run
- BusyBox wget source (FEATURE_WGET_TIMEOUT for --timeout long option)
- iptables(8) man page for `-t nat -L POSTROUTING` syntax
- Mermaid flowchart docs for `A & B & C --> D` multi-source syntax

## Issues Found
No technical issues found.

Verified specifically:
- `natOutgoing` is the correct camelCase field name in the IPPool spec.
- `default-ipv4-ippool` is the conventional default IP pool name created by Calico installations.
- `k8s-app=calico-node` is the correct label selector for the calico-node DaemonSet.
- `kubectl rollout restart` is a valid subcommand (added in kubectl 1.15+).
- `kubectl run --restart=Never` still creates a Pod in modern kubectl.
- BusyBox `wget --timeout=N` works on standard Docker Hub busybox images (FEATURE_WGET_TIMEOUT is enabled by default).
- The mermaid `G & J & K --> L` syntax for fan-in is valid.

## Review Notes
- The `calicoctl patch ippool default-ipv4-ippool` command assumes the pool is named `default-ipv4-ippool`; in clusters with custom pool names, operators will need to substitute the actual name. The runbook could mention this, but it's a reasonable default assumption.
- BusyBox `wget --timeout=N` relies on `FEATURE_WGET_TIMEOUT` being compiled in. If a custom/stripped busybox image is used, the short form `-T 10` is more portable — worth noting but not incorrect as written.
- The `ping` test in Step 1 assumes the calico-node container has `ping` available; this is generally true for the official Calico images but could be a friction point if Calico is run with a stripped image.
- `kubectl describe ... | grep -i "image\|updated"` is a heuristic — depending on the kubectl/k8s version the wording may differ slightly, but it's harmless and will surface the relevant lines.
- No version-specific caveats that would render the runbook inaccurate as of 2026-05.
