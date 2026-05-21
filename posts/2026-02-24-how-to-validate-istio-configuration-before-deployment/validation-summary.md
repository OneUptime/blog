# Validation Summary: How to Validate Istio Configuration Before Deployment

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio and `istioctl`
- Kubernetes and `kubectl`
- Kubernetes CustomResourceDefinitions
- kubeconform
- OPA Gatekeeper
- pre-commit
- GitHub Actions
- Conftest
- Bash and Python YAML parsing

## Sources Consulted
- Istio `istioctl analyze` documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio configuration analysis messages: https://istio.io/latest/docs/reference/config/analysis/
- Istio `InvalidGatewayCredential` analyzer message: https://istio.io/latest/docs/reference/config/analysis/ist0161/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes API dry-run documentation: https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run
- kubeconform documentation: https://github.com/yannh/kubeconform
- kubeconform installation documentation: https://kubeconform.mandragor.org/docs/installation/
- Gatekeeper documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- pre-commit documentation: https://pre-commit.com/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- actions/checkout documentation: https://github.com/actions/checkout
- Conftest installation documentation: https://www.conftest.dev/install/

## Issues Found
- The offline `istioctl analyze` examples omitted `--use-kube=false`. Updated the file and directory examples, plus the pre-commit hook, so they actually work without a live cluster.
- The analyzer examples used an incorrect severity/code combination for missing resources and a stale `IST0104` credential example. Updated the example output to use current Istio analyzer codes, including `IST0161` for invalid or missing gateway credentials.
- The post said the `istioctl analyze` exit code is non-zero when errors are found. Updated this to "analyzer issues" because Istio can return a failure when analyzer messages are emitted, including non-error findings.
- The Kubernetes server-side dry-run explanation said it validates against all admission webhooks. Updated the wording to dry-run-compatible webhooks, matching Kubernetes dry-run side-effect rules.
- The GitHub Actions example pinned Istio `1.22.0`, which is no longer supported. Updated it to `1.30.0`, the current supported release listed by Istio documentation at review time.
- The GitHub Actions example used `kubeconform` and `conftest` without installing them, and later diffed against `origin/main` without fetching enough history. Added installation steps and `fetch-depth: 0`.
- The VirtualService weight section implied weights must add up to 100. Updated it to describe this as a team policy convention, because Istio treats route weights as relative proportions.

## Review Notes
The Gatekeeper example is a simple policy illustration and is valid for legacy Rego syntax. For new Gatekeeper deployments, teams may prefer the newer `targets[].code` form for Rego v1 policies, but the existing snippet is still usable as written.
