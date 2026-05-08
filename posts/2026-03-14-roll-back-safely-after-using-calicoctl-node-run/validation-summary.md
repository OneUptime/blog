# Validation Summary: Rolling Back Safely After Using calicoctl node run

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- calico/node
- Docker
- Kubernetes node cordon and drain workflows
- BGP routing
- Calico IPAM
- iptables

## Sources Consulted
- Calico Open Source calicoctl node command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico Open Source calicoctl node run reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/run
- Calico Open Source calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico Open Source calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source Node resource reference: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico Open Source configuring calico/node reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico Open Source decommissioning a node guide: https://docs.tigera.io/calico/latest/operations/decommissioning-a-node
- Calico Open Source calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico Open Source calicoctl ipam release reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Kubernetes kubectl cordon reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- The post used `calicoctl node stop`, but current Calico Open Source documentation for `calicoctl node` lists `run`, `status`, `diags`, and `checksystem`, not `stop`. Replaced the documented rollback stop path with `docker stop calico-node` and `docker rm calico-node`, matching the container created by `calicoctl node run`.
- The image rollback script used `calicoctl get ... -o jsonpath=...`, but current `calicoctl get` output formats include `yaml`, `json`, `ps`, `wide`, `custom-columns`, `go-template`, and `go-template-file`; `jsonpath` is not documented. Changed the field extraction to `go-template`.
- The image rollback script read the node AS number but did not pass it to `calicoctl node run`. Added conditional `--as` restoration when a per-node AS number is present.
- The image rollback script always passed `--ip="$NODE_IP"`, which could pass an empty value if the node resource has no BGP IPv4 address. Added conditional argument construction so `calicoctl node run` can fall back to its documented default behavior.
- The clean removal script used `calicoctl ipam release --node="$NODE_NAME"`, but `ipam release` supports `--ip` and `--from-report`, not `--node`. Replaced this with the documented datastore lock, `calicoctl ipam check -o ...`, `calicoctl ipam release --from-report=...`, and datastore unlock workflow.
- The configuration rollback example used `CALICO_IP` and `CALICO_IP_AUTODETECTION_METHOD`, but `calico/node` documents `IP` and `IP_AUTODETECTION_METHOD` for BGP IP configuration. Updated the environment variable names and passed them through the corresponding `calicoctl node run` flags.
- The configuration rollback example used `source` before `sudo -E`, but sourced variables are not exported automatically. Added `set -a` / `set +a` around the source step so datastore variables are exported for `sudo -E`.
- Fixed a typo in a script comment from "Restops" to "Restarts".
- Updated the IPAM troubleshooting note to use the documented report-based release workflow.

## Review Notes
- The guide is focused on `calicoctl node run`, which is primarily relevant to manually managed or non-operator deployments. Modern Kubernetes Calico installations are commonly managed by an operator or DaemonSet, so future revisions could call that scope out more explicitly.
- The manual `iptables-save | grep -v "cali-" | iptables-restore` cleanup approach is operationally risky and should be tested carefully on the target dataplane and iptables backend before use in production.
