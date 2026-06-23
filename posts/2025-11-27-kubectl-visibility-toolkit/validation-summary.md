# Validation Summary: How to Build a kubectl Visibility Toolkit for Fast Incident Response

## Status
validated

## Post Type
Reference / Guide (curated list of kubectl commands, aliases, plugins, and scripts for incident response)

## Technologies Covered
- Kubernetes (kubectl CLI)
- kubectl plugins via krew (view-utilization, neat, who-can, df-pv)
- metrics-server (`kubectl top`)
- Bash scripting / shell aliases
- RBAC (`kubectl auth can-i`)
- JSONPath output formatting

## Sources Consulted
- kubectl logs reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/ (confirmed `kubectl logs deploy/NAME` picks one Pod by default; `--all-pods` streams from all)
- kubectl cheat sheet & command reference — https://kubernetes.io/docs/reference/kubectl/
- kubectl field selectors — https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- `kubectl auth can-i` / impersonation docs — https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- krew plugin index — https://krew.sigs.k8s.io/plugins/

## Issues Found
1. **Incorrect log streaming claim (line 88).** The comment stated `kubectl logs deploy/payments-api ... -f` "follows all Pods." Per the official kubectl logs reference, running `kubectl logs deploy/NAME` selects and streams from a *single* representative Pod by default; streaming from every Pod requires the `--all-pods` flag. Changed the comment to "(picks one Pod)" and added a note that `--all-pods` streams from every Pod.
2. **Script name inconsistency (line 224).** The diagnostic script's header names it `pod-health.sh`, but the run instruction invoked it as `./scripts/pod-health` (no extension), which would fail to locate the file as written. Corrected the invocation to `./scripts/pod-health.sh prod`.

## Review Notes
- All other commands verified correct: `kubectl get nodes -o wide`, `kubectl top nodes`, `kubectl get deploy,ds,sts -A`, field-selector filtering (`status.phase!=Running`), label selectors, `describe`, `--previous` logs, `--sort-by=.lastTimestamp`, `exec -it ... -- /bin/sh`, `port-forward svc/...`, `api-resources`, `explain ... --recursive`, `auth can-i` with `--as` impersonation, JSONPath extraction, and the krew plugin names — all current and non-deprecated.
- Minor version caveat (not corrected, still valid): the `.lastTimestamp` field used for sorting events comes from the legacy core/v1 Events API. The newer events.k8s.io/v1 API uses different timestamp fields, but `--sort-by=.lastTimestamp` continues to work against the default `kubectl get events` output, so no change was needed.
- `kubectl top nodes` correctly notes the metrics-server dependency.
