# Validation Summary: How to Configure Longhorn Node and Disk Settings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn (cloud-native distributed block storage for Kubernetes)
- Kubernetes (kubectl, CRDs, node management)
- Linux storage (lsblk, mkfs.ext4, /etc/fstab, mount)

## Sources Consulted
- Longhorn official documentation: https://longhorn.io/docs/
- Longhorn Node CRD reference: https://longhorn.io/docs/1.6.0/references/crd-api/node.longhorn.io_nodes/
- Longhorn nodes and volumes documentation: https://longhorn.io/docs/1.6.0/nodes-and-volumes/
- Longhorn maintenance guide (eviction): https://longhorn.io/docs/1.6.0/maintenance/maintenance/
- Longhorn API spec for v1beta2 (`apiVersion: longhorn.io/v1beta2`)
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- kubectl drain documentation (`--delete-emptydir-data` flag)

## Issues Found
No technical issues found.

All technical claims, kubectl commands, JSON/YAML manifests, and byte calculations were verified:
- The CRD `nodes.longhorn.io` and `apiVersion: longhorn.io/v1beta2` are correct.
- Node spec fields (`allowScheduling`, `disks`, `evictionRequested`, `tags`) and per-disk spec fields (`allowScheduling`, `evictionRequested`, `path`, `storageReserved`, `tags`) match the Longhorn CRD schema.
- Storage reservation byte values are mathematically correct (5 GiB = 5368709120, 1 GiB = 1073741824, 10 GiB = 10737418240).
- The `longhornnode=<node-name>` label on replica resources is correct.
- The default Longhorn data path `/var/lib/longhorn` is correct.
- `kubectl drain --ignore-daemonsets --delete-emptydir-data` uses the modern flag (the older `--delete-local-data` is deprecated).
- The UI navigation ("Node" → three-dot menu → "Edit Node and Disks") matches current Longhorn UI behavior.

## Review Notes
- The disk spec `tags` array uses arbitrary strings; the keys in the `disks` map (e.g., `default-disk`, `ssd-disk`) are user-chosen disk identifiers, which Longhorn will track internally by UUID after creation.
- The comment "Reserve 25% for the OS and other uses" alongside `storageReserved: 5368709120` is illustrative — 5 GiB only equals 25% on a ~20 GiB disk; on larger disks it is a smaller percentage. The byte value is technically correct, so this was left as-is. Readers should adjust the value to match their actual disk size.
- For Longhorn v1.5+, an optional `diskType` field (`filesystem` or `block`) is available on disk specs (used for the V2 data engine). It defaults to `filesystem`, which is what this post implicitly uses, so omitting it is fine.
- The `kubectl get replicas.longhorn.io ... -l longhornnode=<node>` command shows replicas on the entire node, not on a specific disk. To check a specific disk has been emptied, the `longhorndiskuuid=<disk-uuid>` label can also be used. The post's approach is acceptable for monitoring overall progress.
- `kubectl describe nodes.longhorn.io -n longhorn-system` (without a name) describes all Longhorn nodes in the namespace; on large clusters this can produce voluminous output.
