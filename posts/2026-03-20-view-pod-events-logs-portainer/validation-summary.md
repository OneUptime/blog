# Validation Summary: How to View Pod Events and Logs in Portainer - View Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Kubernetes UI)
- Kubernetes
- kubectl CLI
- Kubernetes Pod lifecycle events
- Container logs (stdout/stderr)

## Sources Consulted
- kubectl logs reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#logs
- kubectl get events reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#get
- Kubernetes Pod lifecycle / event reasons: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes debugging pods guide: https://kubernetes.io/docs/tasks/debug/debug-application/debug-pods/
- Portainer Kubernetes documentation: https://docs.portainer.io/user/kubernetes

## Issues Found
- In the "Log Filtering and Search" section, the follow command used both `--follow` and `-f`, which are the same flag (long and short form). Fixed by removing the redundant `--follow`, leaving `kubectl logs -n production deployment/api-server -f`.

## Review Notes
- The `kubectl logs <pod-name> -c <container-name> --previous -n <namespace>` command is correct and matches official kubectl usage for retrieving the previous container instance's logs (useful for CrashLoopBackOff diagnosis).
- The listed pod event reasons (Scheduled, Pulling, Pulled, Created, Started, Unhealthy, Killing) are all valid Kubernetes event reasons emitted by the kubelet / scheduler.
- The `sql` language hint on the "Available options" fenced block is not semantically correct (the content is not SQL), but this is a minor markdown rendering choice rather than a technical error, so it was left as-is per the "only fix technical errors" guidance.
- `kubectl get events --sort-by='.lastTimestamp' -w` is syntactically valid; note that `--sort-by` only orders the initial listing — streamed events from `--watch` arrive in real-time order. This is acceptable for the stated use case of catching new scheduling issues during deployments.
- Portainer's exact navigation path can vary across versions (2.x UI has been iterated on); the described Kubernetes > Namespaces > Pods > Logs flow is broadly accurate.
