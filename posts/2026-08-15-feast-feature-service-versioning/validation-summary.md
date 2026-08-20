# Validation Summary: Version Feast Feature Services Without Breaking Models

## Status
validated

## Post Type
Technical deployment and MLOps guide

## Technologies Covered
- Feast 0.65.0
- Feast Python SDK
- FeatureService, FeatureView, Entity, and On-Demand Feature View (ODFV)
- Feast CLI, registry reconciliation, and deletion
- Historical and online feature retrieval
- Online stores, materialization, PushSource, and the Feast feature server
- Model versioning, canary deployment, A/B testing, and rollback

## Sources Consulted
- [Feast v0.65.0 release](https://github.com/feast-dev/feast/releases/tag/v0.65.0)
- [Feast feature retrieval and FeatureService guidance](https://docs.feast.dev/getting-started/concepts/feature-retrieval)
- [Feast FAQ: model and feature versioning](https://docs.feast.dev/getting-started/faq)
- [Running Feast in production](https://docs.feast.dev/how-to-guides/running-feast-in-production)
- [Feast registry documentation](https://docs.feast.dev/getting-started/components/registry)
- [Feast CLI reference](https://docs.feast.dev/reference/feast-cli-commands)
- [Feast 0.65.0 CLI repository reconciliation implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/repo_operations.py)
- [Feast 0.65.0 FeatureStore implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/feature_store.py)
- [Feast 0.65.0 FeatureService implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/feature_service.py)
- [Feast 0.65.0 feature and referenced-view resolution](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/utils.py)
- [Feast on-demand feature view reference](https://docs.feast.dev/reference/beta-on-demand-feature-view)
- [Feast PushSource reference](https://docs.feast.dev/reference/data-sources/push)
- [Feast type system](https://docs.feast.dev/reference/type-system)
- [Feast alpha FeatureView versioning](https://github.com/feast-dev/feast/blob/v0.65.0/docs/reference/alpha-feature-view-versioning.md)
- [Feast Python feature server](https://docs.feast.dev/reference/feature-servers/python-feature-server)

## Issues Found
- The post repeated the published CLI documentation's claim that removing a declaration and running `feast apply` does not delete the registry object. The released Feast 0.65.0 implementation contradicts that page: the CLI computes a full repository-to-registry diff, collects absent objects for deletion, and calls `FeatureStore.apply` with `partial=False`. The post now warns that omitted objects and associated infrastructure can be removed, tells readers to keep rollback definitions declared, and recommends reviewing `feast plan` before a separate retirement change.
- Creating only a new FeatureView name is insufficient when changing an entity join key if the same Entity name is mutated, because retrieval resolves that Entity from the live registry. The post now requires a new Entity name as well as a new FeatureView name for an entity or join-key identity change.
- The additive-field paragraph stated that infrastructure always changes. It now accurately says the FeatureView schema changes and deployment infrastructure may be updated.
- The rollout sequence said to "push FeatureViews," but Feast pushes values through a configured PushSource. The wording now distinguishes materializing FeatureViews from pushing values through PushSources.
- A FeatureService stores projections and does not by itself contain all Entity, TTL, or ODFV implementation details. The manifest guidance now requires resolving the referenced FeatureViews and ODFVs.
- The contract checklist used "full feature names" even though both example retrieval calls use the default `full_feature_names=False`, and it implied Feast array types define fixed model shapes. The checklist now refers to exact output column names and separately requires model-level array length or shape validation.
- The ODFV checklist omitted behavior-changing `singleton` and `write_to_online_store` settings, and the retrieval paragraph incorrectly tied UDF input representation to the historical versus online path. It now records those settings, explains that `mode` and `singleton` define the representation, and distinguishes read-time retrieval tests from write-time ingestion or materialization and stored-result tests. It also notes that historical retrieval recomputes ODFVs.
- The duplicated feature-retrieval documentation link was replaced with the relevant ODFV reference, and the Feast 0.65.0 CLI implementation was added because it is authoritative for the documentation mismatch above.

## Review Notes
- Both Python examples are syntactically correct and use current, non-deprecated Feast 0.65.0 APIs. `FeatureService` projections, `get_feature_service`, historical retrieval with `.to_df()`, and online retrieval with `.to_dict()` are all valid.
- The retrieval examples assume that the surrounding code defines the FeatureStore, FeatureViews, model metadata, historical entity dataframe (including its event timestamp), and online entity rows. That is appropriate for the focused snippets.
- Feast ODFVs remain Beta. Feast's FeatureView versioning is Alpha; FeatureServices resolve the active promoted FeatureView, and versioned historical retrieval is not supported in Feast 0.65.0. Distinct FeatureView names therefore remain the safer strategy when simultaneous serving, rollback, or independent materialization is required.
- The published Feast 0.65.0 CLI and registry pages still say that `feast apply` retains objects omitted from the repository, but the released CLI source deletes them during full reconciliation. This behavior should be rechecked when upgrading Feast.
- All external links in the post returned HTTP 200 during review.
