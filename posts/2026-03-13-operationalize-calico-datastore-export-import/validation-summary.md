# Validation Summary: How to Operationalize Calico Datastore Export and Import

## Status
validated

## Post Type
Operational guide / runbook

## Technologies Covered
- Calico (project Calico CNI)
- `calicoctl` CLI (datastore migrate, get subcommands)
- Kubernetes networking (GlobalNetworkPolicy, FelixConfiguration)
- Bash shell scripting (command substitution, redirection)
- Mermaid (flowchart diagram syntax)

## Sources Consulted
- Calico official docs — calicoctl datastore migrate index: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/
- Calico official docs — calicoctl datastore migrate export: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/export
- Calico official docs — calicoctl datastore migrate import: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/import

## Issues Found
No technical issues found.

Verified specifically:
- `calicoctl datastore migrate export` writes to stdout, so the `>` redirection to a dated filename works as shown.
- `calicoctl datastore migrate import -f <file>` is valid — `-f`/`--filename` is the documented flag (required), and `-` loads from stdin.
- `calicoctl datastore migrate lock` exists as a subcommand and the post correctly notes it applies to migration, not backup.
- `calicoctl get felixconfiguration` and `calicoctl get globalnetworkpolicy` are valid resource get invocations.
- Mermaid `flowchart TD` syntax and decision-node bracket form `{Match?}` are valid.
- Bash `$(date +%Y%m%d)` and `$(grep -c ...)` command substitution are correct.

## Review Notes
- The official documentation describes `calicoctl datastore migrate export` specifically as a tool for migrating an etcdv3 datastore to a Kubernetes (KDD) datastore. The post broadens this to "backup or migration." Using the export YAML as a backup snapshot is a legitimate practice, but readers should be aware the command was designed primarily for one-way etcd → KDD migration; pure-KDD restore semantics are not officially guaranteed and may require careful testing of the kind the post itself recommends.
- The verification grep `grep -c '^kind:'` will count anchored `kind:` lines; for calicoctl YAML output kinds are emitted at line start, so this works, but it would miss any resource where `kind:` is indented (not the case for top-level YAML documents).
- `calicoctl get globalnetworkpolicy | wc -l` includes the table header in the count; useful as a rough sanity-check, but exact counts should subtract one line.
