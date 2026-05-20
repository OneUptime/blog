# Validation Summary: How to Manage Feature Stores with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Feast
- Redis
- BigQuery
- Python
- YAML

## Sources Consulted
- Feast feature repository configuration docs: https://docs.feast.dev/reference/feature-repository/feature-store-yaml
- Feast v0.36 registry docs: https://docs.feast.dev/v0.36-branch/getting-started/concepts/registry
- Feast Redis online store docs: https://docs.feast.dev/master/reference/online-stores/redis
- Feast BigQuery offline store/API docs: https://rtd.feast.dev/en/master/feast.infra.offline_stores.html
- Feast entity and feature view docs: https://docs.feast.dev/getting-started/concepts/feature-view
- Feast v0.36 CLI reference: https://docs.feast.dev/v0.36-branch/reference/feast-cli-commands
- Feast CLI source reference for `plan`, `serve`, and `materialize-incremental`: https://rtd.feast.dev/en/v0.34.1/_modules/feast/cli.html
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/
- Argo CD resource hooks: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The Feast server container passed `-c /feast-repo` without explicitly invoking `feast serve`. I changed the container command to run `feast -c /feast-repo serve ...`, matching Feast's CLI structure.
- The init container ran `feast apply` after changing directory. I updated it to `feast -c /feast-repo apply`, which matches the documented global `--chdir` option.
- The example feature repository used directory names with hyphens while later snippets needed Python imports. I changed `feature-views` and `feature-services` to `feature_views` and `feature_services`.
- The Python feature examples referenced undefined objects (`user_purchase_source`, `user_features`, and `product_features`) and used an older entity style. I added the missing imports/source definition and updated the entity example to use `join_keys`.
- The materialization CronJob mounted only `feature_store.yaml`, then attempted to run Feast from `/feast-repo` without feature definitions. I added an `emptyDir`, copied the bundled `/features` repo into it, and used `feast -c /feast-repo materialize-incremental`.
- The PreSync validation example had the same missing feature repository setup as the CronJob. I added the repo volume, copied `/features` into it, mounted the Feast config, and used `feast -c /feast-repo plan`.

## Review Notes
The snippets remain illustrative and assume the custom `myregistry/feast-loader:v1.0.0` image includes Feast with the needed extras, cloud credentials, and feature definitions under `/features`. For production, credentials should be injected through Kubernetes Secrets or workload identity rather than hard-coded in ConfigMaps.
