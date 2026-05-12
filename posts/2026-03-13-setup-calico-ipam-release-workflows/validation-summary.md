# Validation Summary: How to Set Up Calico IPAM Release Workflows Step by Step

## Status
validated

## Post Type
Tutorial / Operational Runbook

## Technologies Covered
- Calico (project Calico CNI)
- Calico IPAM
- `calicoctl` CLI (ipam check, ipam show, ipam release, delete blockaffinity)
- Kubernetes (kubectl)
- Mermaid (workflow diagram)

## Sources Consulted
- [calicoctl ipam release — Calico Documentation](https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release)
- [calicoctl ipam check — Calico Documentation](https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check)
- [calicoctl ipam show — Calico Documentation](https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show)
- [calicoctl ipam overview — Calico Documentation](https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/)
- projectcalico/calico GitHub issues #7839, #8643 (orphaned block affinity behavior)

## Issues Found

1. **Step 3 verification used a non-existent flag for `calicoctl ipam show`.** The post used `calicoctl ipam show --show-all-ips | grep "${LEAKED_IP}"`. The `--show-all-ips` flag does not exist on `calicoctl ipam show` (it exists only on `calicoctl ipam check`). The valid flags for `ipam show` are `--ip`, `--show-blocks`, `--show-borrowed`, and `--show-configuration`. Replaced with `calicoctl ipam show --ip="${LEAKED_IP}"`, which is the documented way to check whether a specific IP is currently assigned.

2. **Step 4 used non-existent flags on `calicoctl ipam release`.** The post called `calicoctl ipam release --block=<cidr> --node=<deleted-node>`. Per the Tigera/Calico docs, `calicoctl ipam release` only accepts `--ip`, `--from-report`, and `--config`; the `--block` and `--node` flags do not exist. Replaced with the documented workflow: list block affinities via `calicoctl get blockaffinity -o wide`, then run `calicoctl delete blockaffinity <block-affinity-name>` to release a stale block affinity for a deleted node.

## Review Notes
- `calicoctl ipam check --show-all-ips` is valid (verified against current docs).
- `calicoctl ipam release --ip=<IP>` is correct.
- The safety guidance (verify with `kubectl get pod`, endpoints, and nodes before releasing) is sound and aligns with Calico operational guidance — releasing an in-use IP can produce duplicate assignments.
- The post does not pin a specific Calico version. The fixes apply to current Calico v3.x documentation; readers on older versions should consult their version-specific `calicoctl --help` output for any flag differences.
- An alternative bulk option exists for leaked IPs identified by `calicoctl ipam check`: `calicoctl ipam release --from-report=<report-file>`. The post does not cover this, which is fine for a step-by-step workflow focused on per-IP verification.
