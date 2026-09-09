# Validation Summary: How to Drain and Replace an etcd Leader with move-leader

## Status
validated

## Post Type
Technical maintenance guide with Bash commands.

## Technologies Covered
- etcd 3.7 and etcdctl
- Raft leadership, quorum, voters, and learners
- TLS client authentication
- gRPC client connections and etcd watches
- Member replacement and persistent member identity
- Bash environment variables and command invocation

## Sources Consulted
- [etcdctl v3.7.1 reference](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdctl/README.md): command syntax, environment variable conventions, endpoint status and health, member identifiers, alarms, and leadership transfer.
- [etcdctl v3.7.1 global flag definitions](https://raw.githubusercontent.com/etcd-io/etcd/v3.7.1/etcdctl/ctlv3/ctl.go): TLS, endpoints, output, and command timeout options.
- [Runtime reconfiguration](https://etcd.io/docs/v3.7/op-guide/runtime-configuration/): sequential replacement, learner promotion, existing-cluster configuration, and removed-member behavior.
- [Failure modes](https://etcd.io/docs/v3.7/op-guide/failures/): majority availability, elections, and uncertain uncommitted writes.
- [API operation and watch guarantees](https://etcd.io/docs/v3.7/learning/api_guarantees/): request completion uncertainty and watch resumption boundaries.
- [Learner design](https://etcd.io/docs/v3.7/learning/design-learner/): non-voting membership, leadership restrictions, and client request limitations.
- [Interacting with etcd](https://etcd.io/docs/v3.7/dev-guide/interacting_v3/): watch history and revision-based operation.
- [Author profile](https://github.com/nawazdhandala): author link destination.

## Issues Found
- **Watch resumption boundary:** The post instructed clients to resume from their last fully processed revision. This can replay already processed events. Changed the instruction to start at the revision after the last fully processed revision, and clarified that rebuilding is necessary when the required history has been compacted. The official watch guarantees specify resuming after the last received revision; retaining the post's fully processed checkpoint also accounts for application processing.

## Review Notes
- Verified the commands against the pinned v3.7.1 reference and global flag definitions. Both Bash blocks passed `bash -n`. The target member ID, endpoints, and TLS paths intentionally require deployment-specific values.
- Confirmed that the transfer endpoint must include the leader, while the destination is identified by its hexadecimal member ID. Status tables expose leadership, learner state, and applied progress; a single index sample does not establish continuing health.
- Confirmed majority requirements: two voters out of three, or three out of five. Learners contribute no votes and cannot receive leadership before promotion.
- The replacement workflow correctly separates removal from addition, uses an existing-cluster configuration, and waits for catch-up before promotion. A removed identity cannot be restored simply by restarting its directory.
- Client draining remains deployment-specific. A routing update alone cannot establish that existing streams have ended; the bounded drain and reconnection guidance is appropriate.
- The linked version-specific documentation and pinned CLI reference resolve. No deprecated commands were found in the examples. The learner design page contains historical v3.4 details and proposals; these were not treated as new v3.7 features.
- This was documentation and shell-syntax validation. No live etcd cluster was supplied, so leadership transfer, TLS authentication, replacement, and application reconnection were not executed.
