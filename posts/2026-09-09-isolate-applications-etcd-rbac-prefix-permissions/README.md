# How to Isolate Applications with etcd Users, Roles, and Prefix Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, RBAC, Access Control, Security, Kubernetes

Description: Give each application an etcd identity and a bounded key prefix, then verify permitted operations and cross-application denial.

Two applications can share an etcd cluster without sharing access to every key. The essential pieces are separate identities, roles granting access to specific byte ranges, and authentication enabled on the cluster. Naming keys with different prefixes is only a convention until the server enforces permissions.

This guide uses etcd 3.7 and its v3 API. Apply the setup to an application-owned cluster or an approved test environment. Changing authentication on a Kubernetes-managed etcd cluster requires coordinating the API servers and every other existing client first.

## Choose Prefix Boundaries Before Creating Roles

Use a namespace that contains an unambiguous separator:

```text
/apps/billing/config/tax-region
/apps/billing/locks/daily-close
/apps/catalog/config/index-version
```

Grant billing access to `/apps/billing/`, including the final slash. A prefix permission on `/apps/billing` also covers names such as `/apps/billing-archive`. A prefix is a byte range, not a directory or a filesystem glob. The literal key `/apps/billing` is outside the slash-terminated prefix.

Choose separate prefixes when readers and writers need different permissions. For example, a worker can read published configuration without permission to replace it. Roles are additive: a restrictive role does not cancel a broader role that the same user also holds. The [RBAC reference](https://etcd.io/docs/v3.7/op-guide/authentication/rbac/) describes the supported key and range permissions.

## Configure Transport and Administrative Access

The examples assume the client listener already uses TLS. Replace the endpoint and certificate paths with your environment's values:

```bash
export ETCDCTL_ENDPOINTS=https://etcd-1.example.net:2379
export ETCDCTL_CACERT=/etc/etcd/pki/ca.crt
export ETCDCTL_CERT=/etc/etcd/pki/operator-client.crt
export ETCDCTL_KEY=/etc/etcd/pki/operator-client.key
export ETCDCTL_DIAL_TIMEOUT=5s
export ETCDCTL_COMMAND_TIMEOUT=10s

etcdctl endpoint status --write-out=table
```

For the password examples below, use transport credentials whose certificate Common Name does not select a different etcd user. Explicit username/password authentication takes priority when both mechanisms are supplied, but it is better to make the intended identity clear.

On a cluster where authentication is still disabled, establish the root user and role before enabling it. `user add` prompts for a password, avoiding a password in the command line:

```bash
etcdctl user add root
etcdctl user grant-role root root
```

If authentication is already enabled, use the existing administrator with `--user root` for the management commands instead. Do not recreate an existing root identity or disable authentication to simplify this procedure.

## Create Application Identities and Roles

For the initial setup before authentication is enabled:

```bash
etcdctl role add billing-rw
etcdctl role grant-permission billing-rw readwrite /apps/billing/ --prefix
etcdctl user add billing
etcdctl user grant-role billing billing-rw

etcdctl role add catalog-rw
etcdctl role grant-permission catalog-rw readwrite /apps/catalog/ --prefix
etcdctl user add catalog
etcdctl user grant-role catalog catalog-rw

etcdctl role get billing-rw
etcdctl user get billing
```

Review the role output before activation. A missing `--prefix` grants access to only one key. Conversely, a grant beginning at an empty prefix or using an overly broad range can defeat application isolation.

Provision each application's credentials and client configuration before changing the cluster-wide switch. Then enable authentication:

```bash
etcdctl auth enable
etcdctl --user root auth status
```

The second command should authenticate successfully through the password prompt. Retain a tested administrator session while verifying application access. Future role and user management commands require a user with the root role.

## Test Allowed and Denied Operations

Use disposable keys beneath the application prefixes. Each `--user billing` command prompts for that user's password:

```bash
etcdctl --user billing put /apps/billing/rbac-check ok
etcdctl --user billing get /apps/billing/ --prefix
etcdctl --user billing del /apps/billing/rbac-check

# These two commands should fail with permission denied.
etcdctl --user billing get /apps/catalog/ --prefix
etcdctl --user billing put /apps/billing-archive/rbac-check denied
```

Also test the real client's watches and transactions. A range request must be authorized for its whole requested range; etcd does not return the authorized portion of an otherwise forbidden broad request. A client that watches `/apps/` and filters events locally needs its watch narrowed to the permitted prefix.

If an application uses leases, exercise lease creation, attached keys, keepalive, and cleanup through that identity. Do not assume that a successful standalone `put` proves the entire application's access pattern works.

## Operate the Boundary Deliberately

For certificate identities, etcd can map a client certificate's Common Name to a user when client certificate authentication is enabled. Create the matching user, optionally with `--no-password`, and grant its roles. This identity mechanism does not carry through the gRPC gateway or gRPC proxy as an end-user certificate identity; use their documented authentication behavior. See the [transport security model](https://etcd.io/docs/v3.7/op-guide/security/).

RBAC restricts key access, but it does not provide separate CPU, memory, disk, or quota budgets for each application. One application's excessive writes or long-lived history can still affect shared cluster performance. Keep workload limits and maintenance ownership separate from the permission design.

The v3 authentication switch also does not apply v3 RBAC to the HTTP metrics and health handlers. Bind those listeners appropriately and control their network access. During credential rotation, establish and test the replacement identity before revoking the old one, then verify that denied operations remain denied.

## Conclusion

Use slash-terminated prefixes, separate identities, and narrowly scoped roles. Test the application's actual ranges, watches, transactions, and leases after enabling authentication. Treat permission enforcement and shared-resource management as two distinct operational responsibilities.

## Official Documentation

- [etcd role-based access control](https://etcd.io/docs/v3.7/op-guide/authentication/rbac/)
- [etcd authentication design](https://etcd.io/docs/v3.7/learning/design-auth-v3/)
- [etcd transport security](https://etcd.io/docs/v3.7/op-guide/security/)
- [etcdctl commands for users and roles](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdctl/README.md)
