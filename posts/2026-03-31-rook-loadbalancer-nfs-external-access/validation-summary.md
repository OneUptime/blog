# Validation Summary: How to Set Up LoadBalancer Service for NFS External Access in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph NFS operator for Kubernetes)
- Ceph NFS-Ganesha
- Kubernetes Services (LoadBalancer type)
- MetalLB (referenced for on-prem load balancing)
- NFSv4
- nftables (firewall configuration)

## Sources Consulted
- Rook CephNFS CRD documentation: https://rook.github.io/docs/rook/latest/CRDs/ceph-nfs-crd/
- Rook NFS LoadBalancer example: https://github.com/rook/rook/blob/master/deploy/examples/nfs-load-balancer.yaml
- Rook NFS Storage Overview: https://rook.io/docs/rook/v1.15/Storage-Configuration/NFS/nfs/
- NFSv4 protocol specification (RFC 7530) regarding portmapper elimination
- NFS-Ganesha documentation on port configuration
- Linux mount.nfs4 man page for mount option verification

## Issues Found

### 1. Incorrect NFS instance labels (numeric instead of letter-based)
- **What was wrong:** The post used `instance: "0"` as the pod selector label, and the multi-instance loop iterated over `0 1 2`.
- **What was changed:** Updated to `instance: a` and the loop to iterate over `a b c`.
- **Why:** Rook assigns letter-based instance identifiers (a, b, c, ...) to NFS server pods, not numeric ones. Using numeric values would fail to match any pods.

### 2. Port 111 (rpcbind) incorrectly included in Service spec
- **What was wrong:** The LoadBalancer Service exposed port 111 (rpcbind) alongside port 2049 (NFS). The introductory text claimed NFS "requires both TCP port 2049 and typically port 111."
- **What was changed:** Removed port 111 from the Service spec and the example output. Updated the introduction and summary to clarify that only port 2049 is needed.
- **Why:** Rook CephNFS supports NFSv4.1+ only. NFSv4 eliminated the dependency on the portmapper/rpcbind service (port 111). Rook's own official LoadBalancer example only exposes port 2049.

### 3. `showmount -e` does not work with NFSv4
- **What was wrong:** The post suggested using `showmount -e` to verify connectivity before mounting with NFSv4.2, and showed expected output.
- **What was changed:** Replaced with `rpcinfo -T tcp <ip> nfs` as a connectivity check.
- **Why:** `showmount` relies on the NFSv3 MNT protocol, which is not available when NFS-Ganesha is configured for NFSv4-only access. Running `showmount -e` against an NFSv4-only server typically returns "RPC: Program not registered."

## Review Notes
- The mount command syntax (`mount -t nfs4 -o proto=tcp,port=2049,vers=4.2`) is correct, though `proto=tcp` and `port=2049` are defaults for NFSv4 and could be omitted for brevity. Left as-is since being explicit is not wrong and aids clarity.
- The post could benefit from mentioning `externalTrafficPolicy: Local` on the LoadBalancer Service, which Rook's official examples recommend for better performance. Not added since it is an enhancement rather than a correction.
- The `loadBalancerIP` field used in the Service spec is deprecated in Kubernetes v1.24+. It still works in most implementations but may be removed in future versions. Cloud providers and MetalLB now prefer annotations for IP assignment. Not changed since it remains functional.
