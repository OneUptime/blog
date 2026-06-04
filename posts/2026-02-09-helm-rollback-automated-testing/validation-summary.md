# Validation Summary: How to Implement Helm Chart Rollback Strategies with Automated Testing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Helm
- Kubernetes Deployments, Services, probes, and port-forwarding
- Bash deployment scripts
- GitLab CI/CD
- GitHub Actions
- Slack incoming webhook notifications
- PagerDuty incidents

## Sources Consulted
- Helm rollback command documentation: https://v3.helm.sh/docs/helm/helm_rollback/
- Helm history command documentation: https://helm.sh/docs/helm/helm_history/
- Helm upgrade command documentation: https://v3.helm.sh/docs/helm/helm_upgrade/
- Kubernetes liveness, readiness, and startup probe documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- GitLab CI/CD YAML syntax documentation: https://docs.gitlab.com/ci/yaml/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Azure k8s-set-context action documentation: https://github.com/Azure/k8s-set-context
- GitHub Marketplace documentation for actions/checkout: https://github.com/marketplace/actions/checkout
- PagerDuty incident creation documentation: https://support.pagerduty.com/actions/docs/create-an-incident

## Issues Found
- Helm release storage was described as "secrets or configmaps" without noting the default. Updated the text to say Helm stores release revisions as Kubernetes Secrets by default, or ConfigMaps when configured to use that storage driver.
- The `rollback` block in `values.yaml` looked like native Helm behavior. Clarified that it is configuration consumed by the example deployment scripts.
- The deployment script used `set -e` but called `helm upgrade --install` directly, so a failed upgrade exited before rollback logic ran. Wrapped the upgrade in an `if ! ...; then` block and added rollback handling.
- The deployment script assumed an existing release. Added first-install handling so an empty previous revision does not call `helm rollback`; failed first installs uninstall the failed release instead.
- The smoke-test script only checked LoadBalancer IP and then used ClusterIP as a fallback. ClusterIP is usually unreachable from external CI runners, and LoadBalancers can expose hostnames instead of IPs. Updated the script to support LoadBalancer hostnames and to use `kubectl port-forward` when no external endpoint is available.
- The enhanced smoke-test rollback used `helm history .[-2]` after deployment, which can be wrong or empty on first install. It now captures the previous revision before deployment and handles the no-previous-revision case.
- The GitLab CI smoke-test image did not provide `kubectl`, while the smoke-test script requires it. Updated the CI images to a Kubernetes tool image and installed `jq`, `bash`, and `bc` where needed.
- The GitLab rollback job recomputed `.[-2]` from history, which can select the wrong target after failed or rolled-back revisions. It now stores the pre-deploy revision as an artifact before running the upgrade and uses that artifact during rollback.
- The GitHub Actions sample used older action versions and omitted the `method: kubeconfig` input required by current `azure/k8s-set-context` examples. Updated the action versions and added the method input.
- The GitHub Actions rollback job used `if: failure()` with dependencies. GitHub skips jobs whose dependencies fail unless the job uses a condition such as `always()`. Updated the condition to `always() && failure()`.
- The GitHub Actions rollback step did not handle first installs with no previous revision. Added uninstall fallback for that case.

## Review Notes
- Helm, kubectl, and Ruby were not installed in the local review environment, so CLI behavior was verified against official documentation rather than local `--help` output. Concrete YAML snippets were parsed with PyYAML; Helm template and GitHub expression snippets were reviewed manually because they intentionally contain templating syntax.
- The Kubernetes Deployment manifest remains a partial template excerpt, not a complete standalone Deployment object. That is acceptable in context because the post presents it as the relevant probe portion of a chart template.
