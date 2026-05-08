# Validation Summary: Troubleshooting Cilium Bugtool Collection Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- cilium-bugtool
- cilium-dbg
- Kubernetes
- kubectl
- Linux shell utilities
- tar archives

## Sources Consulted
- Cilium command reference for cilium-bugtool: https://docs.cilium.io/en/stable/cmdref/cilium-bugtool/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium command reference for cilium-dbg status: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/

## Issues Found
- The post used `/tmp/cilium-bugtool-*.tar.gz` as the default archive pattern, but current Cilium documentation shows `cilium-bugtool` defaults to `tar` archives unless `--archiveType gz` is selected. Updated archive examples to use `/tmp/cilium-bugtool-*.tar*`, which matches the documented default and still works for gzip archives.
- Several `kubectl exec` examples passed shell wildcards directly to commands such as `ls` and `rm`. Because `kubectl exec` does not run those commands through a shell by default, the wildcards would not expand in the container. Wrapped those examples in `sh -c`.
- The binary permission check used `$(which cilium-bugtool ...)`, which would execute on the local machine before `kubectl exec` ran. Updated it to run `command -v` inside the Cilium container.
- The timeout section used `cilium-bugtool --commands=...`, but current official command reference does not document a `--commands` flag. Replaced it with documented options: `--exec-timeout`, `--envoy-dump=false`, `--envoy-metrics=false`, `--hubble-metrics=false`, and `--exclude-object-files`.
- The background logging example used Bash-specific `&>` redirection under `sh -c`. Replaced it with POSIX-compatible `>/tmp/bugtool-log.txt 2>&1`.
- The incomplete archive example assumed a fixed `/tmp/cilium-bugtool.tar.gz` filename and used gzip-specific `tar` flags. Updated it to select the latest generated archive and use `tar tf` / `tar xf`.
- The `/usr/bin/cilium*` example used a wildcard without a shell in `kubectl exec`. Wrapped it in `sh -c`.
- The troubleshooting note for hangs recommended the unsupported `--commands` flag. Updated it to recommend rerunning with a shorter `--exec-timeout` and optional collectors disabled.

## Review Notes
The guide remains version-general. Cilium's documented default archive type is `tar`, while gzip archives are supported via `--archiveType gz`; the updated examples intentionally match both.
