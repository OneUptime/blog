# Validation Summary: How to Use crictl to Debug Container Runtime Issues on Kubernetes Nodes

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Kubernetes
- crictl / cri-tools
- Container Runtime Interface (CRI)
- containerd
- CRI-O
- jq
- kubectl

## Sources Consulted
- Kubernetes documentation: Debugging Kubernetes nodes with crictl: https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/
- cri-tools crictl documentation: https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md
- cri-tools releases: https://github.com/kubernetes-sigs/cri-tools/releases
- cri-tools v1.36.0 `crictl --help` and subcommand help for `ps`, `pods`, `pull`, `exec`, `stats`, `inspect`, and `inspectp`
- Kubernetes CRI API protobuf definitions: https://github.com/kubernetes/cri-api/blob/master/pkg/apis/runtime/v1/api.proto
- containerd crictl documentation: https://containerd.io/docs/2.1/cri/crictl/

## Issues Found
- Updated the manual install example from `v1.29.0` to `v1.36.0`, matching the current cri-tools documentation and releases available during review.
- Replaced `crictl inspectp <sandbox-id> | jq '.status.message'` with `.info` because `PodSandboxStatus` does not define a `message` field in the CRI API.
- Changed the image inspection comment from "View image layers" to "View image digests" because `.status.repoDigests` reports image digests, not layers.
- Corrected `crictl pull --debug nginx:latest` to `crictl --debug pull nginx:latest` because `--debug` is a global crictl flag, not a `pull` subcommand flag.
- Clarified the `crictl pull --pod-config` example comment because `--pod-config` supplies pod sandbox configuration context; it does not select a registry.
- Replaced the `inspectp` image pull secret lookup with `kubectl get pod ... -o jsonpath='{.spec.imagePullSecrets}'` because image pull secrets are Kubernetes pod spec data, not a standard CRI pod sandbox status annotation.
- Replaced unsupported `crictl exec -e VAR=value` and `crictl exec -u 1000` examples. In crictl v1.36.0, `-e` means `--ignore-errors`, and there is no `-u`/`--user` exec flag.
- Corrected `crictl stats -o json` JSON paths from `.linux.*` to `.stats[0].*`, matching the `ListContainerStatsResponse` shape returned by crictl.
- Replaced a runtime-specific pod namespace path example with `.status.linux.namespaces`, which is the CRI pod sandbox status field exposed by `inspectp`.
- Added `log_directory` to the sample pod sandbox configuration, matching the official cri-tools `runp` example format.

## Review Notes
Some `inspect` examples intentionally use runtime-specific verbose fields under `.info.runtimeSpec`, which are useful with containerd but are not guaranteed by the CRI API across every runtime. The post is still accurate as a container runtime debugging guide, but future revisions could call out that `.info` content is runtime-specific.
