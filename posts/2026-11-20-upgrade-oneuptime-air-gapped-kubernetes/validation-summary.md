# Validation Summary: Air-Gapped OneUptime Upgrades

## Scope and source review

Reviewed on 20 November 2026. The article proposes a staged upgrade and recovery procedure; it does not claim an executed upgrade path.

- Reviewed official upgrade instructions: one major version at a time, intervening release notes, backups, and version verification.
- Reviewed official backup documentation and its pinned source. Distinguished transactional PostgreSQL backup from ClickHouse table capture; avoided claiming cross-database atomicity. Confirmed Enterprise backup entitlement, encryption-secret dependence, and forward migration during restoration by the running server.
- Reused the reviewed bundle script pinned to 0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e. Example flags and archive naming match its images/save/push interface. Current and target feature values retain upstream references for connected preparation.
- Inspected the published 17.0.0 archive's values.yaml and templates/migrate-job.yaml. Confirmed enabled migrations, regular Job default, runtime schema waiting, and optional pre-upgrade hook. The article explicitly scopes those behaviors to this chart.
- Chart SHA-256: f6ec64764b3fab5ee60a78bdec027fb9eacca6d2d63964c43000bb7ddaf9899a.
- Checked Helm 3 history/get-values/template/upgrade/rollback documentation, including --is-upgrade, --reset-values, --wait, --wait-for-jobs, --timeout, and --atomic semantics.
- Checked kubectl apply --dry-run=server documentation. Distinguished non-persisting API requests from local rendering and actual Helm hook execution.
- Reviewed recovery guidance to ensure release rollback is never presented as reversal of database migrations. No destructive database restoration one-liners are included.

## Checks performed

- Rendered chart 17.0.0 locally with Helm v3.12.3+g3a31588 and --is-upgrade, separately using migrate.hook=false and migrate.hook=true.
- Both renders passed. The migration Job had no Helm hook in default mode and had a pre-upgrade annotation in hook mode.
- The minimal fixtures used community images, image.tag=17.0.0, enabled migrations, and registry.example.internal. All eight unique image references were internal in each render. These fixtures are not a complete production values file and do not establish a supported source-to-target upgrade.
- Checked flags against local Helm help. All six Bash examples passed bash -n syntax checking via standard input.
- Metadata and structure checks passed. Existing author: nawazdhandala. Existing tags: Air-Gapped, Monitoring, Observability.
- Title: 60 characters. Description: 159 characters. Word count: 1386, including metadata and command text, excluding link URLs.
- Generated social-media.png with the existing npm script. Confirmed 1280 x 720 dimensions and visually inspected all three title lines; no clipping or illegibility was observed.

## Limitations

No cluster requests, server-side dry-run, image transfer, publisher-signature verification, real source-to-target upgrade, migration execution, backup, restoration, or Helm rollback was performed. No cold-node or blocked-egress rehearsal was performed. The 30-minute timeout is illustrative, not measured. Data migration compatibility, database engine compatibility, licensing, operational timing, and workload behavior remain release- and environment-specific checks.

Local rendering cannot establish API acceptance or runtime readiness. The reviewed migration-mode rendering is not evidence that a particular rollback is safe. Full repository validation and shared-catalog integration remain with parent review because the repository validator may modify shared files.

## Official sources checked

- https://oneuptime.com/docs/en/installation/upgrading
- https://helm.sh/docs/v3/helm/helm_history/
- https://helm.sh/docs/v3/helm/helm_get_values/
- https://github.com/OneUptime/oneuptime/blob/0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e/HelmChart/AirGap/install.sh
- https://oneuptime.com/docs/en/installation/backups
- https://helm-chart.oneuptime.com/oneuptime-17.0.0.tgz
- https://helm.sh/docs/v3/helm/helm_template/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- https://helm.sh/docs/v3/helm/helm_upgrade/
- https://helm.sh/docs/v3/helm/helm_rollback/
- https://raw.githubusercontent.com/OneUptime/oneuptime/0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e/packages/App/FeatureSet/Docs/Content/en/installation/upgrading.md
- https://raw.githubusercontent.com/OneUptime/oneuptime/0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e/packages/App/FeatureSet/Docs/Content/en/installation/backups.md

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
