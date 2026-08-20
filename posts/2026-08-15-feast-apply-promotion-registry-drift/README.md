# Promote Feast Definitions Without Registry Drift

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feast, feast apply, CI/CD, Registry, Staging, Production

Description: Promote one reviewed feature-repository revision through isolated Feast environments with controlled apply, diff, cache, and deletion steps.

---

`feast apply` reconciles definitions found in a feature repository into one configured Feast environment. Promotion should move the same reviewed definition revision from staging to production while keeping registries, credentials, stores, and projects isolated.

Do not promote by copying a mutable staging registry file into production. The registry contains environment state and materialization metadata, not just source code.

## Make Git the Desired-State Source

Keep Feast objects in a version-controlled feature repository. The production guide recommends CI/CD that plans changes for pull requests and applies them after merge.

One repository can hold environment overlays:

```text
feature-repo/
  definitions/
  environments/
    staging/feature_store.yaml
    production/feature_store.yaml
```

Run Feast from `feature-repo/` and select an overlay with the global option, for example `feast -f environments/staging/feature_store.yaml plan`, so Feast still scans the sibling `definitions/` tree.

The definition package should be identical for a promotion. Environment configuration supplies different:

- Feast project names;
- registry endpoints;
- offline and online stores;
- service endpoints and credentials;
- resource sizes and optional data subsets.

Feast projects are isolated namespaces, and production guidance recommends separate development, staging, and production environments.

## Build Once and Promote the Revision

A safe pipeline records an immutable commit or artifact digest:

```text
pull request
  -> static and import tests
  -> plan against staging
  -> apply commit 8d7b3f1 to staging
  -> historical, materialization, and online canaries
  -> approval
  -> plan commit 8d7b3f1 against production
  -> apply the same commit to production
```

Do not rebuild definitions from a moving branch after staging approval. Store the commit, Feast version, Python lockfile, and plugin versions with deployment evidence.

Where the pinned provider and Feast release support `feast plan`, review its output. Always verify the installed CLI with `feast --help`; provider coverage and command behavior can evolve.

## Know What `apply` Does and Does Not Do

Current CLI documentation says `feast apply`:

1. scans Python files in the repository;
2. validates discovered Feast objects;
3. syncs object metadata to the registry;
4. creates or updates infrastructure through the configured provider.

It can therefore make external infrastructure changes and incur cloud cost. Only the deployment identity should have this authority.

In Feast 0.65.0, CLI `feast apply` treats the parsed repository as desired state: registry objects absent from the repository-managed object set are planned for deletion, and associated infrastructure may be removed. This differs from lower-level `FeatureStore.apply()`, which defaults to `partial=True`; SDK deletion requires `objects_to_delete` with `partial=False`. Gate CLI deletions behind dependency checks and review. Targeted retirement can use `feast delete <OBJECT_ID>` or explicit SDK methods.

Also maintain `.feastignore`. Feast scans Python recursively, so an imperative script stored under the repository can be imported during apply unless excluded.

## Detect Drift Before Apply

Drift can arise from manual applies, an old CI job, registry restoration, or two branches targeting one environment.

Before production apply:

- dump or list registered objects using the pinned CLI;
- compare all user-controlled object-spec fields, including names, feature schemas, sources, entities, TTLs, online and offline flags, transformations, FeatureServices, and permissions, with the desired commit;
- identify registry-only objects separately and review them as proposed deletions before apply;
- confirm the production config resolves the intended project and endpoints;
- fail if another deployment holds the environment lock.

Do not compare raw registry bytes. File ordering, timestamps, environment endpoints, and materialization metadata can differ legitimately. Compare a normalized semantic inventory.

Use a SQL registry when materialization progress is updated concurrently, but retain a deployment mutex. Atomic database writes do not decide which competing definition is correct.

## Validate Staging Like Production

Staging should use the same Feast version, registry type, online-store plugin, entity serialization version, feature server type, and key schema as production. A smaller data set and lower capacity are reasonable; replacing Redis with SQLite may hide plugin-specific failures.

Run:

- point-in-time golden joins at TTL boundaries;
- schema and type probes;
- materialization over a representative interval;
- online canary reads through the server;
- old and new FeatureService compatibility tests;
- replay and rollback exercises.

Promotion verifies the definition against production-like infrastructure. It does not copy staging feature values into production.

## Account for Registry Caches

Registry `cache_ttl_seconds` and feature-server registry refresh settings can delay a new definition. With positive refresh intervals, wait up to the documented propagation bound under normal operation or perform an approved refresh, then verify that each server instance reports or exhibits the new contract. Setting `cache_ttl_seconds` to zero disables SDK-driven expiry; without a separate server refresh interval, an explicit refresh or restart is required.

During rolling deployment, old and new application versions may overlap. Register separately named replacement FeatureServices and FeatureViews before switching consumers. Retain old definitions through rollback.

## Roll Back with the Same Discipline

Reapply a known-good repository revision only after checking whether the failed release created new online infrastructure or wrote incompatible data. Because CLI `feast apply` reconciles deletions, reapplying a pre-release revision can delete objects and associated infrastructure introduced by the failed release. It cannot undo incompatible feature values already written, so review data and infrastructure cleanup separately.

The safest broadly supported schema rollback is often switching consumers between separately named, version-suffixed FeatureServices and FeatureViews, not mutating one name backward.

## Official Documentation

- [Run Feast in production](https://docs.feast.dev/how-to-guides/running-feast-in-production)
- [Feast CLI reference](https://docs.feast.dev/reference/feast-cli-commands)
- [Feast feature repository](https://docs.feast.dev/reference/feature-repository)
- [Feast concepts and environment isolation](https://docs.feast.dev/getting-started/concepts)
- [Feast SQL registry](https://docs.feast.dev/reference/registries/sql)

## Conclusion

Promote one immutable feature-repository revision, not a registry file. Apply it independently to production after production-like staging checks, compare semantic registry state, serialize definition writers, review planned deletions explicitly, and allow for registry cache propagation.
