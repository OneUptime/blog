# Validation Summary: How to Perform Container Forensics in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Kubernetes (kubectl)
- crictl (containerd CLI)
- Linux networking tools (ss, netstat, tcpdump)
- Kubernetes RBAC / labels / selectors

## Sources Consulted
- kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- kubectl logs: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#logs
- kubectl exec: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#exec
- kubectl cp: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#cp
- kubectl top: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#top
- kubectl label / patch: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- crictl reference: https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md
- Rancher cluster management UI docs: https://ranchermanager.docs.rancher.com/

## Issues Found
- "Isolate a Suspicious Pod" section: The original example added a `quarantine=true` label and then ran `kubectl patch service <svc-name> -p '{"spec":{"selector":{"app":"myapp"}}}'`, which sets the service selector to the value that is typically already present (a no-op). The trailing comment "Remove the label that the service selector uses" described an action that was never actually performed. I replaced the patch command with `kubectl label pod <pod-name> app- --overwrite`, which is the standard pattern: removing the label the service selector matches on (e.g., `app`) so the endpoint controller drops the pod from the service's endpoints. This now matches the intent stated in the comment.

## Review Notes
- The post's description mentions "ephemeral debug containers" (`kubectl debug`) but the body does not actually cover that feature. Not a technical error, but a future revision could add a short section on `kubectl debug` for proper debug-container forensics on distroless images.
- The section title "Capture a Container Image Snapshot" is slightly misleading — the section shows `crictl inspect` (metadata) and `kubectl cp` (file extraction), not a true container image snapshot (which would require `ctr images export` or `docker commit`). The commands themselves are correct for filesystem-level forensics, so this is a wording/scoping observation rather than a technical error.
- The `tcpdump` example would benefit from `-it` flags so the operator can Ctrl+C the capture inside the pod. As written it still works but the operator must kill the process from another shell. Not incorrect, just slightly awkward.
- `kubectl get events --sort-by='.lastTimestamp'` is correct and widely used. Note that on very recent Kubernetes versions some tooling has shifted toward `eventTime`, but `lastTimestamp` is still populated and supported.
- Commands like `netstat`, `ss`, and `tcpdump` assume the container image includes those binaries. Many production images (especially distroless) do not — `kubectl debug` with an ephemeral debug container is the modern alternative. Worth noting in a future revision.
