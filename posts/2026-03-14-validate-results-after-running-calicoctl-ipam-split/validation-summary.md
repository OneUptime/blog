# Validation Summary: Validating Results After Running calicoctl ipam split

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Enterprise
- calicoctl
- Calico IPAM
- Kubernetes
- kubectl
- Bash

## Sources Consulted
- Calico Enterprise `calicoctl ipam split` reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/split
- Calico Enterprise `calicoctl ipam show` reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico Enterprise `calicoctl ipam check` reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Calico Open Source `calicoctl ipam` overview: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico IPAM concepts: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post used `calicoctl ipam split 10.244.0.0/24 --cidr-size=26`, but official Calico Enterprise documentation shows `ipam split` takes a power-of-two child pool count and identifies the pool with `--cidr=<CIDR>` or `--name=<POOL_NAME>`. I changed the example to `calicoctl ipam split --cidr=10.244.0.0/24 4`, which splits a `/24` into four equal `/26` pools.
- The split example omitted the required datastore lock and unlock workflow. Calico Enterprise documentation says the datastore should be locked before splitting and unlocked afterward, so I added `calicoctl datastore migrate lock` and `calicoctl datastore migrate unlock` around the split command.
- The post did not distinguish the Enterprise-only `ipam split` and `ipam check` commands from the current Calico Open Source `calicoctl ipam` command set. I clarified the description and prerequisites to say the guide applies to Calico Enterprise `calicoctl`.
- The block count command used `grep -c "Block" || echo 0`, which can produce two zeroes when no blocks match because `grep -c` prints `0` before returning a non-zero status. I changed it to `grep -c '^| Block' || true` so the variable contains one count and matches only block rows.
- The test pod command passed `sleep 30` as arguments without `--command`. Kubernetes documents `--command -- <cmd> <args...>` for overriding the container command, so I added `--command` to make the BusyBox allocation test explicit.
- The allocation test used a fixed `sleep 5` before reading the pod IP. I replaced it with `kubectl wait --for=condition=Ready pod/ipam-test --timeout=30s` so the script waits for the pod readiness condition instead of relying on timing.
- The cleanup command used `--grace-period=0` for a temporary pod where immediate forced deletion is not necessary. I changed it to `kubectl delete pod ipam-test --ignore-not-found` to keep cleanup simple and avoid force-deletion semantics.

## Review Notes
The guide is now technically valid for Calico Enterprise environments where `calicoctl ipam split` and `calicoctl ipam check` are available. Future improvements could avoid rerunning `ipam split` in a validation guide and instead show how to inspect output captured during the original maintenance window.
