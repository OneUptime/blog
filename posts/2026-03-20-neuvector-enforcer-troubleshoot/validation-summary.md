# Validation Summary: How to Troubleshoot NeuVector Enforcer Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- NeuVector (Enforcer DaemonSet, Controller, REST API)
- Kubernetes (kubectl, DaemonSets, NetworkPolicy, tolerations)
- eBPF / netfilter kernel modules
- Linux kernel networking (BPF filesystem, nfnetlink, iptables xt_)
- curl / jq for API interaction

## Sources Consulted
- NeuVector official docs - Production deployment ports: https://open-docs.neuvector.com/5.2/deploying/production/details/
- NeuVector policy modes: https://open-docs.neuvector.com/policy/modes/
- NeuVector troubleshooting & debug API: https://open-docs.neuvector.com/troubleshooting/troubleshooting/
- NeuVector system requirements: https://open-docs.neuvector.com/basics/requirements/
- NeuVector Helm chart (DaemonSet + service definitions): https://github.com/neuvector/neuvector-helm
- Kubernetes `kubectl logs --prefix` flag: https://github.com/kubernetes/kubernetes/pull/76471

## Issues Found

1. **Issue 2 (Enforcer Cannot Connect to Controller) - wrong port and protocol for connectivity test.**
   The original used `wget -qO- http://neuvector-svc-controller.neuvector.svc.cluster.local:10443`. Port 10443 is the controller's HTTPS REST API port (used by the UI/admin), not the port the enforcer uses to talk to the controller. The actual enforcer-to-controller communication runs on TCP 18301 (cluster/Serf) and 18300 (RPC). Additionally, hitting an HTTPS port with `http://` would never succeed.
   **Fix:** Replaced the `wget` call with `kubectl get endpoints neuvector-svc-controller` plus `kubectl describe svc` to verify ready endpoints, and updated the NetworkPolicy comment to reference the correct ports (18300/18301).

2. **Step 5 (Capture Enforcer Debug Logs) - undocumented debug API.**
   The original called `PATCH /v1/debug` with body `{"controllers":"debug","enforcers":"debug"}`. NeuVector's documented controller-side debug API is `PATCH /v1/system/config` with a `controller_debug` array of categories (`cpath`, `conn`, `mutex`, `scan`, `cluster`, `all`) - not per-component log levels.
   **Fix:** Updated the `curl` to `PATCH /v1/system/config` with body `{"config":{"controller_debug":["cpath","conn"]}}`.

3. **Issue 3 / Best Practices - unsupported kernel-version claim.**
   The original said "minimum 4.1" and "older kernels have limited eBPF support". NeuVector's official system requirements page does not state a numeric kernel minimum, and NeuVector's enforcement is built primarily on netfilter/LSM/DPI in privileged mode (not exclusively eBPF), so a hard "4.1+ for eBPF" framing isn't supported by the docs.
   **Fix:** Replaced the "(minimum 4.1)" comment with "confirm the node kernel is on a supported distro/version" and changed the Best Practices bullet to reference NeuVector's published system requirements rather than a specific kernel version.

## Review Notes

- The DaemonSet name `neuvector-enforcer-pod`, the label selector `app=neuvector-enforcer-pod`, the service `neuvector-svc-controller`, the policy modes `Discover`/`Monitor`/`Protect`, the `policy_mode` group field, and the `/v1/group` endpoint all match the official Helm chart and API.
- Heading numbering is inconsistent ("Step 1" → "Issue 1-4" → "Step 5") but this is a stylistic, not technical, concern - left as-is per the no-restructuring guidance.
- The `kubectl logs --prefix=true` flag is valid (added in Kubernetes 1.17) and the `kubectl rollout restart daemonset/...` form is valid (1.15+).
- The `mount -t bpf bpf /sys/fs/bpf` command is correct syntax.
- `lsmod | grep -E "nfnetlink|xt_"` correctly inspects the netfilter modules NeuVector relies on.
- The tolerations merge-patch with `[{operator: "Exists"}]` is valid and will match all taints, but readers should be aware this also schedules the Enforcer onto control-plane nodes by design - which is usually desired for a security DaemonSet but worth flagging.
