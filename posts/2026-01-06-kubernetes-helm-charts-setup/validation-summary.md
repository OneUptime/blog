# Validation Summary: How to Set Up Helm Charts for Your Kubernetes Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm 3 (CLI, chart structure, templating, hooks, dependencies, OCI registries)
- Kubernetes (Deployments, Services, Ingress, Jobs, Pods, ServiceAccounts, HPA)
- Go template language (Sprig functions: `default`, `trunc`, `trimSuffix`, `toYaml`, `nindent`, `quote`, `sha256sum`, `fail`)
- Bitnami chart repository / Artifact Hub
- helm-docs
- cert-manager (Ingress TLS annotation example)
- AWS S3 / OCI registries (ghcr.io) for chart distribution

## Sources Consulted
- Helm official docs — Installing Helm: https://helm.sh/docs/intro/install/
- Helm official docs — Charts: https://helm.sh/docs/topics/charts/
- Helm official docs — Chart Template Guide: https://helm.sh/docs/chart_template_guide/
- Helm official docs — Chart Hooks: https://helm.sh/docs/topics/charts_hooks/
- Helm official docs — Chart Tests: https://helm.sh/docs/topics/chart_tests/
- Helm official docs — Registries (OCI): https://helm.sh/docs/topics/registries/
- Helm official docs — Helm Commands (CLI reference): https://helm.sh/docs/helm/
- Helm `get-helm-3` install script: https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
- Kubernetes recommended labels: https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- Bash reference manual — line continuation / quoting behavior (verified empirically with `bash -n` and execution)

## Issues Found
1. **Broken bash line continuation in the "Install with Environment Values" example** (the `helm install ... -f values.yaml \ # Base values` block). Inline `#` comments were placed *after* the `\` line-continuation characters. In bash, a backslash only escapes the immediately following character; when followed by spaces and a comment the newline is no longer escaped, so the line terminates and the remaining flags (`-f values-production.yaml`, `-n production`) are parsed as separate commands. I confirmed this empirically (`-b: command not found` style errors on execution). **Fix:** moved the explanatory text into standalone comment lines above the command and removed the inline trailing comments so the command parses and runs correctly. No semantic change to the command itself.

## Review Notes
- The `_helpers.tpl` snippet references `include "myapp.chart"` inside `myapp.labels`, but the `myapp.chart` helper definition is not shown in the excerpt. This is consistent with the post's flow (the reader runs `helm create myapp` first, which generates the full `_helpers.tpl` including `<chart>.chart`), so it is an intentional curated subset rather than an error. No change made.
- Bitnami chart version constraints (`postgresql: "12.x.x"`, `redis: "17.x.x"`) are older than the current Bitnami releases and serve as illustrative SemVer-constraint syntax examples rather than version recommendations. Additionally, since the Bitnami catalog changes in 2025 ("Bitnami Secure Images"), many charts are now primarily distributed via the OCI registry `oci://registry-1.docker.io/bitnamicharts`. The `https://charts.bitnami.com/bitnami` HTTP repo URL still resolves and the examples remain syntactically valid; readers should pin to currently available versions. No change made.
- `- {{ .Values.slack.webhookUrl }}` in the post-install notification Job is unquoted. It renders fine for a plain URL; quoting (`| quote`) would be marginally safer but is not required. No change made.
- All CLI commands, flags, hook annotations (`helm.sh/hook`, `helm.sh/hook-weight`, `helm.sh/hook-delete-policy`), the `apiVersion: v2` Chart format, networking `apiVersion: networking.k8s.io/v1`, and OCI push/install commands are current and correct for Helm 3.
