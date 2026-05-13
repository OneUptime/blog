# Validation Summary: How to Configure Flagger Canary Max Weight and Step Weight

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Kubernetes
- Canary deployments
- Traffic shifting
- Kubernetes custom resources
- kubectl
- Istio VirtualService

## Sources Consulted
- Flagger official documentation: How it works - https://docs.flagger.app/usage/how-it-works
- Flagger official documentation: Deployment strategies - https://docs.flagger.app/main/usage/deployment-strategies
- Flagger source code: Canary API types - https://github.com/fluxcd/flagger/blob/main/pkg/apis/flagger/v1beta1/canary.go
- Kubernetes official documentation: kubectl JSONPath support - https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes official documentation: kubectl command reference - https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post described `maxWeight` as a strict traffic ceiling and stated that a non-divisible `maxWeight` / `stepWeight` combination would produce a smaller final step. Flagger's official rollout weight documentation shows that Flagger can advance to the next configured step above `maxWeight` before promotion, such as 20%, 40%, 60% for `maxWeight: 50` and `stepWeight: 20`. Updated the wording to describe `maxWeight` as a promotion threshold, clarified the non-divisible case, and changed the rollout duration formula to use `ceil(maxWeight / stepWeight)`.

## Review Notes
- The example YAML uses the current `flagger.app/v1beta1` Canary API fields for `analysis.maxWeight`, `analysis.stepWeight`, `analysis.stepWeights`, `thresholdRange`, and `status.canaryWeight`.
- `kubectl` was not installed in the local environment, so CLI syntax was verified against official Kubernetes documentation instead of local `kubectl --help` output.
