# Validation Summary: How to Add, Catch Up, and Safely Promote an etcd Learner

## Status

validated

## Post Type

Tutorial / operational guide with shell commands and YAML configuration.

## Technologies Covered

- etcd 3.6 and 3.7
- etcdctl v3 membership and endpoint commands
- Raft replication, learners, voting membership, and quorum
- Mutual TLS and role-based access control
- YAML configuration and Linux service operation

## Sources Consulted

- [etcd 3.7 runtime reconfiguration](https://etcd.io/docs/v3.7/op-guide/runtime-configuration/): membership registration, learner startup, promotion, removal, and startup errors.
- [etcd 3.6 learner design](https://etcd.io/docs/v3.6/learning/design-learner/): nonvoting replication, resource costs, client restrictions, and quorum implications.
- [etcd 3.6 configuration options](https://etcd.io/docs/v3.6/op-guide/configuration/): listener and bootstrap settings, configuration-file precedence, and timing options.
- [Official v3.6.0 YAML sample](https://github.com/etcd-io/etcd/blob/v3.6.0/etcd.conf.yml.sample): nested client and peer TLS configuration fields.
- [etcdctl v3.6.0 reference](https://github.com/etcd-io/etcd/blob/v3.6.0/etcdctl/README.md) and [release-3.7 reference](https://github.com/etcd-io/etcd/blob/release-3.7/etcdctl/README.md): environment variables, endpoint commands, and status table fields.
- [v3.6.0 membership CLI implementation](https://github.com/etcd-io/etcd/blob/v3.6.0/etcdctl/ctlv3/command/member_command.go) and [release-3.7 implementation](https://github.com/etcd-io/etcd/blob/release-3.7/etcdctl/ctlv3/command/member_command.go): learner flag, promotion command, and hexadecimal member-ID parsing.
- [v3.6.0 embedded configuration](https://github.com/etcd-io/etcd/blob/v3.6.0/server/embed/config.go) and [release-3.7 configuration](https://github.com/etcd-io/etcd/blob/release-3.7/server/embed/config.go): configurable maximum learner count.
- [v3.6.0 server implementation](https://github.com/etcd-io/etcd/blob/v3.6.0/server/etcdserver/server.go): server-side learner readiness and strict promotion checks.
- [v3.6.0 RPC interceptor](https://github.com/etcd-io/etcd/blob/v3.6.0/server/etcdserver/api/v3rpc/interceptor.go) and [release-3.7 interceptor](https://github.com/etcd-io/etcd/blob/release-3.7/server/etcdserver/api/v3rpc/interceptor.go): learner RPC restrictions.
- [etcd 3.6 transport security](https://etcd.io/docs/v3.6/op-guide/security/): client and peer certificate authentication and certificate identity requirements.
- [etcd 3.6 role-based access control](https://etcd.io/docs/v3.6/op-guide/authentication/rbac/): membership administration privileges and TLS Common Name authentication.

## Issues Found

No technical issues found.

## Review Notes

- All four Bash examples passed `bash -n`. Command names, options, environment variables, and table fields were checked against official documentation and CLI source. The promotion placeholder must be replaced with the actual hexadecimal member ID, as the post explains.
- The YAML field names and nested TLS structures match the official configuration sample. Addresses, certificate paths, and the initial membership mapping are deployment-specific placeholders. Configuration-file precedence is correctly described.
- Adding a learner does not increase voting quorum. Promoting the fourth member changes the majority from two to three; both three and four voters tolerate one voter failure. The replacement sequence is reviewed in the stated context of three initially healthy voters, not as a general recovery procedure for an already failed cluster.
- Status indices provide observational evidence. The server evaluates replication readiness and reconfiguration safety; a locally chosen applied-index threshold cannot replace those checks. The post correctly avoids claiming that identical displayed indices are required.
- The learner design document includes historical v3.4 limits and implementation proposals. The source for the discussed newer versions exposes `max-learners`, so the post correctly avoids treating the historical single-learner limit as universal.
- Authentication-enabled deployments require an authorized identity. The documented root role grants membership privileges; a trusted client certificate alone does not automatically grant that role.
- Article documentation links resolved to the intended official resources. Version checks used the v3.6.0 source tag and the release-3.7 branch; branch references can change over time.
- This was a documentation and source review with shell syntax checks. No live cluster was started, and no membership changes, certificate handshakes, replication transfers, or application reads and writes were executed. README.md required no changes.
