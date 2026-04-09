# Validation Summary: How to Use fs swap for CephFS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CephFS)
- Rook (Kubernetes Ceph operator)
- `ceph fs swap` command
- MDS (Metadata Server) daemons
- CephX authentication

## Sources Consulted
- CephFS Administration documentation: https://docs.ceph.com/en/latest/cephfs/administration/
- Ceph CLI man page (`ceph(8)`): https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph Squid v19.2.0 release notes: https://ceph.io/en/news/blog/2024/v19-2-0-squid-released/
- Ceph source documentation on GitHub: https://github.com/ceph/ceph/blob/main/doc/cephfs/administration.rst

## Issues Found

### 1. Incorrect command syntax
**What was wrong:** The post showed the syntax as `ceph fs swap <fs1> <fs2> --yes-i-really-mean-it` with only two positional arguments (filesystem names).
**What was changed:** Corrected to `ceph fs swap <fs1-name> <fs1-id> <fs2-name> <fs2-id> --swap-fscids=<yes|no> --yes-i-really-mean-it`, which requires four positional arguments (name and FSCID for each filesystem) plus the mandatory `--swap-fscids` flag.
**Why:** The actual command requires filesystem cluster IDs (FSCIDs) in addition to names, and the `--swap-fscids` flag to control whether IDs are also exchanged.

### 2. Incorrect Ceph version
**What was wrong:** The post stated `ceph fs swap` is available in "Ceph Quincy (17.x) and later."
**What was changed:** Corrected to "Ceph Squid (19.x) and later."
**Why:** The `ceph fs swap` command was introduced in Ceph Squid v19.2.0 (released 2024). It does not exist in Quincy (17.x) or Reef (18.x).

### 3. False claim of zero client disruption
**What was wrong:** The post had a section titled "Swap with No Client Disruption" claiming that "clients that are already mounted do not see the operation as a reconnect" and that the swap is transparent to clients.
**What was changed:** Replaced with a "Client Remount Required" section explaining that both filesystems must be offline during the swap, clients must remount afterward, unflushed operations will be lost, and CephX credentials may need reauthorization.
**Why:** The official documentation explicitly states both filesystems must have `refuse_client_sessions` set and must be failed/offline before the swap can be performed. Clients must remount after the swap completes.

### 4. Missing pre-swap and post-swap steps in examples
**What was wrong:** The example commands showed only the swap command itself, without the required steps to take filesystems offline before swapping or bring them back online afterward.
**What was changed:** Added `ceph fs set ... refuse_client_sessions true`, `ceph fs fail`, `ceph fs set ... joinable true`, and `ceph fs set ... refuse_client_sessions false` commands to both the main example and the rollback example.
**Why:** These steps are mandatory -- the swap command will not succeed unless both filesystems are offline with client sessions refused.

### 5. Misleading "atomic" terminology
**What was wrong:** The post described the swap as "atomic" in a way that implied zero-downtime and transparent client behavior.
**What was changed:** Clarified that the swap is a "single FSMap update" ensuring no intermediate epoch where a filesystem name is missing, rather than an atomic operation from the client's perspective.
**Why:** The atomicity guarantee is at the FSMap metadata level only -- there is no missing-name epoch -- but it is not atomic from the client perspective since both filesystems must be offline.

## Review Notes
- The Rook considerations section is reasonable but somewhat speculative -- Rook's behavior after a `ceph fs swap` is not officially documented, and the advice to restart the operator is a best-effort recommendation.
- The `--swap-fscids` flag deserves more discussion in a future revision. Using `--swap-fscids=yes` vs `--swap-fscids=no` has different implications for clients that connect using FSCIDs rather than names.
- The post's blue-green deployment framing is valid, but readers should understand this involves a maintenance window (both filesystems offline, client remount) rather than true zero-downtime switching.
