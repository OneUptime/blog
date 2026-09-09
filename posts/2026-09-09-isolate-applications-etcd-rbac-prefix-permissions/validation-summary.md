# Validation Summary: How to Isolate Applications with etcd Users, Roles, and Prefix Permissions

## Status
validated

## Post Type
Tutorial / operational guide with executable etcdctl examples.

## Technologies Covered
- etcd 3.7 and the v3 API
- etcdctl user, role, authentication, and key-value commands
- Role-based access control and byte-range prefix permissions
- TLS, client certificates, and Common Name identities
- gRPC, gRPC gateway, and gRPC proxy
- Watches, transactions, and leases
- Kubernetes control-plane etcd integration

## Sources Consulted
- [etcd 3.7 RBAC reference](https://etcd.io/docs/v3.7/op-guide/authentication/rbac/): bootstrap, permissions, password prompts, certificate identity precedence, proxy limitations, and HTTP handler scope.
- [etcd 3.7 authentication design](https://etcd.io/docs/v3.7/learning/design-auth-v3/): flat keyspace, permission checks, and authentication revisions.
- [etcd 3.7 transport security](https://etcd.io/docs/v3.7/op-guide/security/): TLS configuration and certificate authentication.
- [etcdctl v3.7.1 command reference](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdctl/README.md): CLI syntax, prefix flags, environment variables, and endpoint status output.
- [etcdctl v3.7.1 authentication commands](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdctl/ctlv3/command/auth_command.go): confirms the auth status subcommand, which is omitted from the README's authentication heading.
- [etcdctl v3.7.1 global command configuration](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdctl/ctlv3/command/global.go): endpoint, TLS, and timeout configuration handling.
- [etcd v3.7.1 auth store](https://github.com/etcd-io/etcd/blob/v3.7.1/server/auth/store.go): special root-role assignment behavior.
- [etcd v3.7.1 permission cache](https://github.com/etcd-io/etcd/blob/v3.7.1/server/auth/range_perm_cache.go): additive role grants and authorization of complete intervals.
- [etcd v3.7.1 authorization application layer](https://github.com/etcd-io/etcd/blob/v3.7.1/server/etcdserver/apply/auth.go): key-value, transaction, lease, and administrative permission checks.
- [etcd 3.7 maintenance guide](https://etcd.io/docs/v3.7/op-guide/maintenance/): shared storage quotas, history compaction, and cluster-wide resource effects.

## Issues Found
- The statement that all future role and user management commands require the root role was too broad. In v3.7.1, UserGet permits users to inspect themselves, and RoleGet permits users to inspect roles they hold. Changed the sentence to say that future changes to roles and users require the root role. The implementation explicitly requires administrative permission for those mutations. No commands or other content needed correction.

## Review Notes
- Verified all shell examples against the official command reference and version-pinned source. The environment variable names, TLS paths as placeholders, timeout values, user/role argument order, readwrite permission, prefix flag, and password-prompt usage are valid.
- The root role can be granted without first running role add root; the implementation explicitly handles that special role.
- The slash-terminated billing prefix excludes both the literal /apps/billing key and /apps/billing-archive. The allowed and denied examples agree with that boundary. Whole-range authorization and additive grants support the post's explanation.
- Certificate CN mapping requires client certificate authentication. Password credentials take precedence when both identity mechanisms are supplied. The gateway/proxy and HTTP metrics/health caveats are supported by the official documentation.
- Shared backend quotas and retained history affect the cluster as a whole; RBAC does not establish per-application resource budgets. Testing real watches, transactions, and lease behavior remains appropriate.
- The linked v3.7 documentation and v3.7.1 command reference were accessible. No deprecated command usage was identified for the stated version.
- Validation used documentation and source inspection, plus shell syntax checks. No live etcd cluster was contacted and no credentials or cluster authentication settings were changed. End-to-end behavior with deployment-specific certificates and clients was not executed.
