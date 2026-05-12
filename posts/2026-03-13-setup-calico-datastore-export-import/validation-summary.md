# Validation Summary: How to Set Up Calico Datastore Export and Import Step by Step

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Calico (Project Calico)
- `calicoctl` CLI (`datastore migrate` subcommands: `export`, `import`, `lock`)
- etcdv3 datastore
- Kubernetes API datastore (CRD-backed)
- Felix (Calico's per-node agent)
- AWS S3 (for backup storage)
- Bash / shell scripting

## Sources Consulted
- [calicoctl datastore migrate overview — Tigera docs](https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/)
- [calicoctl datastore migrate export — Tigera docs](https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/export)
- [calicoctl datastore migrate import — Tigera docs](https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/import)
- [calicoctl datastore migrate lock — Tigera docs](https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock)
- [Migrate Calico data from an etcdv3 datastore to a Kubernetes datastore — Tigera docs](https://docs.tigera.io/calico/latest/operations/datastore-migration)
- Calico source for the export command (returns "Datastore type must be etcdv3" when run against a non-etcdv3 datastore)

## Issues Found

1. **Step 1 — incorrect "Export from Kubernetes API datastore" example.**
   The post included a second invocation with `DATASTORE_TYPE=kubernetes` to export from a Kubernetes API datastore. `calicoctl datastore migrate export` only supports etcdv3 source datastores and explicitly errors out with "Datastore type must be etcdv3" if run against any other type. I removed the incorrect Kubernetes-export example and added a short note clarifying that this command only works against etcdv3.

2. **Step 4 — incorrect "Regular backup (Kubernetes datastore)" example.**
   The post recommended using `calicoctl datastore migrate export` as a routine backup tool for Kubernetes-backed Calico. Same root cause as above — the command only works on etcdv3 datastores. I updated the example to set `DATASTORE_TYPE=etcdv3` (plus the appropriate ETCD env vars) and added a comment noting that Kubernetes-backed Calico users should back up the Calico CRDs with `kubectl` instead.

3. **Step 3 — small clarity fix.**
   Added a one-line comment noting that the `import` subcommand only targets a Kubernetes API datastore (matching the official documentation), since the surrounding text could otherwise suggest it was a general-purpose import tool.

## Review Notes

- The blog presents Step 1 (Export) before Step 2 (Lock). The official migration workflow in Tigera's documentation is the reverse: lock the etcdv3 datastore *first*, then export, then import, then unlock. Following the post's ordering for a true migration risks data drift between export and lock. I did not reorder the sections (that would be a structural change beyond the scope of fixing technical errors), but a future revision should reorder Step 1 and Step 2 to match the official workflow, or at minimum add a callout that Lock must precede Export for migration use cases.
- The post does not cover the `calicoctl datastore migrate unlock` subcommand, which is the documented final step after a successful import / cluster cut-over. Worth adding for completeness in a future revision.
- The `lock` example omits the ETCD TLS env vars (`ETCD_KEY_FILE`, `ETCD_CERT_FILE`, `ETCD_CA_CERT_FILE`) shown in the export example. For most production etcd deployments those would also be required. Not strictly wrong (depends on how the user's `calicoctl.cfg` is configured), so left as-is, but worth noting.
- The mermaid diagram shows the lock action originating from the exported YAML node; this is a minor diagram quirk rather than a technical inaccuracy in the commands themselves, and was left unchanged.
