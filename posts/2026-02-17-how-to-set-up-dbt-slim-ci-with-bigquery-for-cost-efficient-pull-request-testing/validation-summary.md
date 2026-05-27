# Validation Summary: How to Set Up dbt Slim CI with BigQuery for Cost-Efficient Pull Request Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- dbt Core
- dbt BigQuery adapter
- BigQuery
- Google Cloud Storage
- Google Cloud Build
- GitHub Actions
- Google Workload Identity Federation

## Sources Consulted
- dbt docs: Defer: https://docs.getdbt.com/reference/node-selection/defer
- dbt docs: Node selector methods and state selection: https://docs.getdbt.com/reference/node-selection/methods
- dbt docs: Graph operators: https://docs.getdbt.com/reference/node-selection/graph-operators
- dbt docs: BigQuery configurations: https://docs.getdbt.com/reference/resource-configs/bigquery-configs
- Google Cloud docs: BigQuery setup for dbt: https://docs.getdbt.com/docs/local/connect-data-platform/bigquery-setup
- Google Cloud docs: Cloud Build build config schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud docs: Cloud Build substitutions: https://docs.cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud docs: BigQuery pricing: https://cloud.google.com/bigquery/pricing
- google-github-actions/auth README: https://github.com/google-github-actions/auth
- google-github-actions/setup-gcloud README: https://github.com/google-github-actions/setup-gcloud

## Issues Found
- Cloud Build examples installed `dbt-bigquery` in one container step and then expected `dbt` to be available in later `python:3.11` steps. Cloud Build steps run in separate containers, so the examples were changed to install dbt in the same step that invokes dbt.
- The Cloud Build CI example copied the production manifest into `target-prod/manifest.json` without first creating `target-prod`. Added `mkdir -p target-prod`.
- The Cloud Build CI example used a PR-specific dataset in `profiles.yml` but did not pass `PR_NUMBER` into dbt. Added `PR_NUMBER=$_PR_NUMBER`, using Cloud Build's GitHub pull request substitution.
- The GitHub Actions Workload Identity Federation example lacked the required `id-token: write` permission. Added the job permissions block.
- The GitHub Actions example used `google-github-actions/auth@v2` and `gsutil`. Updated the auth action to `v3`, added `setup-gcloud@v3`, and replaced `gsutil cp` with `gcloud storage cp` because the auth action documents that `gsutil` does not use its exported credentials.
- The CI BigQuery profile used `method: service-account` with a static keyfile path, which does not match the keyless Cloud Build and GitHub Workload Identity Federation examples. Changed the CI target to `method: oauth` so it can use application default credentials from the CI environment.
- The deferral explanation implied dbt always resolves unselected refs to production. Clarified that dbt defers unselected nodes only when they do not already exist in the target environment, unless `--favor-state` is used.
- The cost example used older `$5/TB` BigQuery on-demand pricing. Updated it to `$6.25/TiB` on-demand analysis pricing and adjusted the example costs.
- The troubleshooting section said an outdated manifest means dbt thinks nothing changed. Reworded this because stale manifests can produce incorrect selections rather than only false negatives.

## Review Notes
The tutorial remains intentionally simplified. In production, teams should also verify IAM permissions for reading production relations, writing CI datasets, reading the artifact bucket, and deleting CI datasets.
