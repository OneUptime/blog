# Validation Summary: How to Unit Test Helm Charts Before Deploying with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Helm
- Helm chart templates
- helm-unittest
- Helm values.schema.json validation
- chart-testing (ct)
- kubeconform
- GitHub Actions
- Kubernetes Ingress manifests

## Sources Consulted
- Helm template command documentation: https://helm.sh/docs/helm/helm_template/
- Helm chart template guide and values best practices: https://helm.sh/docs/chart_template_guide/ and https://helm.sh/docs/chart_best_practices/values/
- helm-unittest official documentation: https://github.com/helm-unittest/helm-unittest
- chart-testing official documentation: https://github.com/helm/chart-testing
- helm/chart-testing-action documentation: https://github.com/marketplace/actions/helm-chart-testing
- kubeconform documentation: https://kubeconform.mandragor.org/docs/usage/ and https://kubeconform.mandragor.org/docs/installation/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Azure setup-helm action documentation: https://github.com/marketplace/actions/helm-tool-installer

## Issues Found
- The command labeled "Run with verbose output" used `helm unittest -v ./charts/my-app`. In helm-unittest, `-v` is the short flag for `--values`, not verbose output. Changed it to `helm unittest --debugPlugin ./charts/my-app` and updated the label to "plugin debug output".
- The GitHub Actions workflow used `azure/setup-helm@v3`, while the current documented major version is newer. Updated it to `azure/setup-helm@v5.0.0` and pinned Helm to `v3.19.0` so the Helm 3 plugin installation command shown in the article remains valid.
- The CI workflow introduced chart-testing in the article but linted with `helm lint` instead of `ct lint`. Added the documented chart-testing setup action and changed the lint step to `ct lint --charts "$chart"`.
- The CI workflow invoked `kubeconform` without installing it. Added the documented Linux install command before the validation step.

## Review Notes
The examples are generally accurate for Helm 3 workflows. Argo CD uses Helm primarily to render charts with `helm template`, so running these checks before Argo CD syncs is technically appropriate. The kubeconform step validates rendered manifests against Kubernetes schemas, but it does not cover all admission-controller or custom controller validation rules.
