# Validation Summary: How to Use etcd Transactions for Atomic Multi-Key Compare-and-Swap

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- etcd 3.6 and 3.7 and the v3 transaction API
- Go and go.etcd.io/etcd/client/v3 v3.7.1
- etcdctl
- MVCC revisions, atomic compare-and-swap, and coherent reads
- Optimistic concurrency, retry deduplication, and conditional rollback

## Sources Consulted
- [etcd 3.6 transaction and comparison API](https://etcd.io/docs/v3.6/learning/api/): comparison branches, revisions, range reads, and duplicate-write restrictions.
- [etcd API guarantees](https://etcd.io/docs/v3.6/learning/api_guarantees/): atomicity, strict serializability, and uncertain outcomes.
- [Go transaction client, v3.6.0](https://github.com/etcd-io/etcd/blob/v3.6.0/client/v3/txn.go): verified the linked resource through its raw source.
- [Go transaction client, v3.7.1](https://raw.githubusercontent.com/etcd-io/etcd/v3.7.1/client/v3/txn.go): If/Then/Else/Commit API and response behavior.
- [Go comparison helpers, v3.7.1](https://raw.githubusercontent.com/etcd-io/etcd/v3.7.1/client/v3/compare.go): ModRevision, Version, equality operator, and integer arguments.
- [Go client configuration, v3.7.1](https://raw.githubusercontent.com/etcd-io/etcd/v3.7.1/client/v3/config.go): endpoint, timeout, and TLS fields.
- [Client module requirements, v3.7.1](https://raw.githubusercontent.com/etcd-io/etcd/v3.7.1/client/v3/go.mod): release dependencies and Go 1.26 requirement.
- [Server transaction implementation, v3.7.1](https://raw.githubusercontent.com/etcd-io/etcd/v3.7.1/server/etcdserver/txn/txn.go): missing-key comparisons use zero-valued metadata.
- [Server transaction authorization, v3.7.1](https://raw.githubusercontent.com/etcd-io/etcd/v3.7.1/server/etcdserver/apply/auth.go): permissions cover comparisons and both branches.
- [etcdctl reference, v3.7.1](https://raw.githubusercontent.com/etcd-io/etcd/v3.7.1/etcdctl/README.md): get, --prefix, --write-out=json, and default linearizable consistency.
- [etcd configuration options](https://etcd.io/docs/v3.6/op-guide/configuration/): request-size and transaction-operation limits.
- [Go modules reference](https://go.dev/ref/mod#go-get) and [Go command reference](https://pkg.go.dev/cmd/go): version-pinned dependency installation and go run.

## Issues Found
1. **Missing-key ABA caveat.** The explanation did not distinguish absence checks from history detection. Clarified that ModRevision == 0 checks current absence but cannot detect a create/delete cycle between observation and commit. This follows from the server comparing missing keys against zero-valued metadata.
2. **Uncertain retry ordering.** A linearizable read returning no operation marker does not establish that an earlier outstanding write can never commit. Clarified that retries must reuse the same operation ID and retain the atomic marker-absence comparison. Also replaced “read the marker linearly” with the precise term “linearizable read.”
3. **Rollback concurrency and original absence.** Comparing revisions obtained only from a fresh rollback read can accept a newer release that already completed. Changed the guidance to retain the successful publication revision and compare both keys against it, stopping on conflict. Original values alone also cannot represent originally missing keys, so the deployment record must preserve existence and rollback must delete keys that were previously absent. These corrections follow from revision comparison semantics.

## Review Notes
- Extracted the exact Go code into an isolated temporary module, successfully ran go get go.etcd.io/etcd/client/v3@v3.7.1, and successfully compiled it with go build . The Go command selected toolchain go1.26.8 to satisfy the dependency requirement. No code changes were necessary.
- Confirmed coherent read-only transactions, shared revisions for the two puts, normal comparison conflicts, and the read-only failure branch. The function intentionally discards failure-branch values, as the prose explains.
- The example accepts predetermined replacement strings; it captures revisions but does not derive replacements from the initial values. Its CAS protection covers changes after that initial read.
- A failure during the initial read cannot have published data. The example conservatively reports every returned error as requiring reconciliation; an application can distinguish the read and write stages for more precise diagnostics.
- Exactly one competing writer succeeds under the stated shared starting revisions when both transactions complete normally and no unrelated writer intervenes. Transport failures require reconciliation before interpreting the result.
- Reviewed deduplication retention, bounded retries, external side-effect boundaries, configured limits, and permissions. The application-level recommendations are deductions from etcd guarantees, not a claim that etcd implements an outbox or deduplication automatically.
- No live etcd cluster was started. Contention, continuous-reader, cancellation, TLS, and authorization scenarios were reviewed against documentation and implementation, but were not executed. Compilation validates the Go example, not runtime behavior across both server versions.
- Existing technical documentation links resolve to the intended resources; the GitHub source link was checked using the equivalent raw URL after the browser fetch failed.
