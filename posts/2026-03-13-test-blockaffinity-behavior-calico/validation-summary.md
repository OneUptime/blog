# Validation Summary: Test BlockAffinity Behavior in Calico IPAM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.20+)
- Calico IPAM and BlockAffinity resource
- `calicoctl` CLI
- Kubernetes (`kubectl`)
- `jq` for JSON parsing
- `kubeadm` (referenced for node join)

## Sources Consulted
- Calico official documentation on IPAM: https://docs.tigera.io/calico/latest/networking/ipam/
- Calico BlockAffinity resource reference: https://docs.tigera.io/calico/latest/reference/resources/blockaffinity
- Calico IPPool reference (`blockSize` field): https://docs.tigera.io/calico/latest/reference/resources/ippool
- `calicoctl ipam` subcommand reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- libcalico-go source patterns for BlockAffinity name conversion (`<hostname>-<cidr-with-dashes>`)
- Kubernetes docs for `kubectl drain` flags (`--delete-emptydir-data` replaced `--delete-local-data` around k8s 1.20)
- Kubernetes PodSpec docs for `nodeName` semantics (scheduler bypass)

## Issues Found
- **BlockAffinity resource name format (Step 1 YAML example)**: The example showed `name: node-worker-1-192-168-10-0-26`, with an incorrect `node-` prefix. Calico's BlockAffinity Kubernetes resource names follow the pattern `<hostname>-<cidr-with-dashes>` (slashes and dots in the CIDR replaced with hyphens). Changed to `name: worker-1-192-168-10-0-26` to match the actual format produced by libcalico-go.

## Review Notes
- The "Best Practices" line "Increase `blockSize` in the IP pool (e.g., from /26 to /24) for large nodes" is technically ambiguous because Calico's `blockSize` field takes a numeric prefix length (so going from /26 to /24 means the numeric value of `blockSize` decreases from 26 to 24, while the block's IP capacity quadruples). The example "/26 to /24" makes the intent clear ("larger blocks"), so the wording was left as written. A future revision could phrase this as "use a larger block size (lower `blockSize` value)" to remove ambiguity.
- Step 4 uses `kubectl patch deployment ... nodeName: target-node` to pin pods to a node. This works (it's a valid PodSpec field) but bypasses the scheduler; using `nodeSelector` or `nodeAffinity` is more idiomatic. The current approach is technically correct for the intended testing scenario.
- The "block borrowing" description is simplified: Calico first tries to allocate a new block from the IP pool before borrowing IPs from another node's affinity block. The post's framing is acceptable for an introductory guide.
- Step 4's `kubectl create deployment ... -n test` assumes the `test` namespace exists; readers may need to create it first.
- All `calicoctl` commands (`get blockaffinity`, `ipam check`, `ipam show --show-blocks`, `delete blockaffinity`) are real and current as of Calico v3.20+.
