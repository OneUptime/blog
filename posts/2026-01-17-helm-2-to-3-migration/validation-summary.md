# Validation Summary: Migrating from Helm 2 to Helm 3

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Helm 2
- Helm 3
- Helm 2to3 plugin
- Kubernetes
- Tiller
- Helm charts and CRDs
- GitHub Actions
- GitLab CI

## Sources Consulted
- Helm documentation: Migrating Helm v2 to v3 - https://helm.sh/docs/v3/topics/v2_v3_migration/
- Helm documentation: Changes Since Helm 2 - https://helm.sh/docs/v3/faq/changes_since_helm2/
- Helm documentation: Charts - https://helm.sh/docs/topics/charts/
- Helm documentation: Chart Hooks - https://helm.sh/docs/topics/charts_hooks/
- Helm documentation: Built-in Objects - https://helm.sh/docs/chart_template_guide/builtin_objects/
- Helm 2 documentation: Built-in Objects - https://helm.sh/docs/v2/chart_template_guide/builtin_objects/
- Helm 2 documentation: helm list - https://helm.sh/docs/v2/helm/helm_list/
- Helm 2to3 plugin README - https://github.com/helm/helm-2to3
- Azure setup-helm README - https://github.com/Azure/setup-helm

## Issues Found
- The post described the 2to3 plugin as current/official without noting its maintenance status. Updated the description, plugin section, and wrap-up to state that the plugin is deprecated and no longer supported, while still being the Helm project's documented migration tool for legacy Helm 2 data.
- The release storage comparison said Helm 2 stores releases as ConfigMaps and Helm 3 as Secrets. Updated the table to say "by default" because Helm 2 could also use Secrets and Helm 3 uses Secrets as the default storage driver.
- The Helm 3 side-by-side install example could overwrite the Helm 2 binary before renaming Helm 3 to `helm3`. Updated the snippet to save the Helm 2 binary first, install Helm 3, rename Helm 3 to `helm3`, and restore Helm 2 as `helm`.
- Several Helm 2 commands used `helm list --all-namespaces`, which is a Helm 3 flag and is not valid for Helm 2. Replaced those examples with `helm list --all`, and updated release enumeration loops to use `helm list --all -q`.
- A `--release-versions-max` example was labeled as migrating a release in a specific namespace. Updated the comment to explain that the flag limits how many release revisions are converted.
- A directory tree was fenced as YAML even though it is not YAML syntax. Changed the code fence to `text`.
- The template example claimed `.Capabilities.KubeVersion.Major` was an integer in Helm 2. Replaced it with semver comparisons using Helm 2's `.Capabilities.KubeVersion.GitVersion` and Helm 3's `.Capabilities.KubeVersion.Version`.
- The GitHub Actions example used an older `azure/setup-helm@v3` action and Helm 3.13.0. Updated it to `azure/setup-helm@v5.0.0` with an explicit Helm 3 pin.

## Review Notes
Helm 2 and the 2to3 plugin are both end-of-life, so this guide is only appropriate for organizations still carrying legacy Helm 2 release data. The article should continue to pin Helm 3 explicitly in CI examples because using a floating "latest" Helm install can select Helm 4 on current tooling.
