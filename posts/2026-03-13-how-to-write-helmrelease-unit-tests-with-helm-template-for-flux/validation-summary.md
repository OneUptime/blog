# Validation Summary: How to Write HelmRelease Unit Tests with helm template for Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux HelmRelease
- Kubernetes
- Helm
- ingress-nginx Helm chart
- yq
- Bash
- GitHub Actions

## Sources Consulted
- Helm `helm template` command documentation: https://helm.sh/docs/v3/helm/helm_template/
- Helm `helm pull` command documentation: https://helm.sh/docs/helm/helm_pull/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease valuesFrom guide: https://v2-0.docs.fluxcd.io/flux/guides/helmreleases/
- yq select operator documentation: https://mikefarah.gitbook.io/yq/operators/select
- yq GitHub Action and installation documentation: https://github.com/mikefarah/yq
- ingress-nginx chart 4.11.3 values and templates: https://github.com/kubernetes/ingress-nginx/tree/helm-chart-4.11.3/charts/ingress-nginx
- Azure setup-helm action releases: https://github.com/Azure/setup-helm/releases

## Issues Found
- The Linux yq install command wrote to `/usr/local/bin` without elevated privileges. Updated it to use `sudo` for both download and chmod.
- `kubectl` was listed as a prerequisite, but the tutorial commands do not use it. Removed it from the prerequisites.
- The all-HelmRelease script checked a version-suffixed chart directory even though `helm pull --untar --untardir` expands the chart under the chart name. Updated the script to use a version-specific parent directory and template from the actual expanded chart path.
- The all-HelmRelease script treated omitted chart versions as `null`, even though Flux allows `spec.chart.spec.version` to be omitted. Updated the script to omit the Helm `--version` flag when no version is set.
- The all-HelmRelease script did not default a missing HelmRelease metadata namespace to `default`. Updated the yq expression to match Flux's target namespace defaulting behavior.
- The `valuesFrom` example passed inline values before external values, which reverses Flux's merge priority. Updated the `helm template` command to pass external values first and inline `spec.values` last.
- The `valuesFrom` example referenced `/tmp/inline-values.yaml` without creating it. Added the extraction command.
- The `valuesFrom` HelmRelease example omitted the required `spec.interval` field. Added `interval: 30m`.
- The GitHub Actions workflow used `mikefarah/yq@master` as a standalone install step, but that action usage does not install the `yq` binary for later shell steps. Replaced it with an explicit binary install command.
- The best-practice note recommended `--dry-run` for server-side validation without the required Helm context. Updated it to mention `helm template --validate` and `--dry-run=server`.

## Review Notes
- The article assumes the local Helm repository alias matches `spec.chart.spec.sourceRef.name`; this works for the examples after the workflow adds matching repositories.
- The core ingress-nginx 4.11.3 example was rendered locally with Helm 3.20.0, and the expected namespace, replica count, service type, and resource limits appeared in the rendered output.
