# Validation Summary: How to Create a Custom App Catalog in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- Helm 3
- Git
- YAML / Helm chart configuration

## Sources Consulted
- Rancher Manager docs: Creating Apps - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/helm-charts-in-rancher/create-apps
- Rancher Manager docs: Helm Charts and Apps - https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/helm-charts-in-rancher
- Helm docs: Charts - https://helm.sh/docs/topics/charts/
- Helm docs: `helm repo index` - https://helm.sh/docs/helm/helm_repo_index/
- Git docs: `git init` - https://git-scm.com/docs/git-init

## Issues Found
- The post described a Rancher custom catalog as if it were only a Helm repository and then suggested a "standard Helm repository structure" with top-level chart folders. I corrected this to distinguish Rancher's Git repository layout from a traditional Helm repository, which must publish packaged chart archives plus an `index.yaml`.
- The `Chart.yaml` example included `catalog.cattle.io/certified`, which is not part of the current Rancher annotation list in the official docs. I removed it and corrected the explanations for `catalog.cattle.io/namespace` and `catalog.cattle.io/release-name` to note that they set fixed values, not defaults.
- The post said annotations controlled categories. I corrected that guidance to point to the `keywords` field for categories, which matches Rancher's documentation.
- The `questions.yaml` examples used `show_subquestion_if: true`. Rancher's question reference documents this field as a string, with examples like `"true"`, so I updated both occurrences accordingly.
- The Question Types table omitted documented supported types. I added `multiline` and `cloudcredential` to align the table with Rancher's current question-type reference.
- The Git publishing example ran `git push -u origin main` immediately after `git init`, which is not guaranteed to create a `main` branch. I changed it to `git init -b main` so the push target matches the initialized branch.
- The verification and summary text implied the repository would be available across clusters and claimed the chart would show an icon even though no icon metadata was configured in the example. I corrected the wording to reflect Rancher's cluster-scoped repository behavior and the actual metadata shown by the provided chart example.

## Review Notes
- Rancher documentation currently uses both `questions.yaml` and `questions.yml` in different places. The post retains `questions.yaml`, which is consistent with the chart-structure example in Rancher's app-creation docs.
- The post targets Rancher v2.7 or later. I validated the guidance against the current Rancher documentation and noted only behavior that still matches the modern Apps and Repositories workflow.
