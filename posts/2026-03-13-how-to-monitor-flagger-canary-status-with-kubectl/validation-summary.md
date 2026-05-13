# Validation Summary: How to Monitor Flagger Canary Status with kubectl

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Kubernetes Canary custom resources
- kubectl
- Kubernetes Deployments, Pods, Events, and JSONPath output
- Bash scripting

## Sources Consulted
- Flagger documentation: How it works / Canary status: https://docs.flagger.app/usage/how-it-works
- Flagger CRD definition: https://raw.githubusercontent.com/fluxcd/flagger/main/artifacts/flagger/crd.yaml
- Flagger NGINX canary deployment tutorial: https://docs.flagger.app/main/tutorials/nginx-progressive-delivery
- Flagger Kubernetes blue/green deployment tutorial: https://docs.flagger.app/main/tutorials/kubernetes-blue-green
- Flagger Istio canary deployment tutorial: https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The status phase list omitted `Waiting` and `WaitingPromotion`, which are valid current Flagger Canary status phases in the CRD. Added them to the phase diagram and explanations.
- The post described and queried a generated `my-app-canary` Deployment. Flagger uses the target Deployment as the canary workload and generates a `<name>-primary` Deployment for the stable workload. Updated deployment inspection and image comparison commands accordingly.
- Pod selection commands only selected `app=my-app` or used labels that are not guaranteed on the target Deployment. Updated the primary/canary pod listing to use `app in (my-app,my-app-primary)` and the canary pod command to select the target workload by `app=my-app`.
- The monitoring script listed deployments by `app=$CANARY_NAME`, which would miss the generated primary Deployment when Flagger uses `app=<name>-primary`. Updated it to fetch both `$CANARY_NAME` and `$CANARY_NAME-primary`.
- The failed-canary debugging command used `deploy=canary`, which is not part of Flagger's documented default labels. Updated it to use `app=my-app`.

## Review Notes
The `kubectl events --for` and `--types` flags are valid in the current generated Kubernetes kubectl reference. The post assumes Flagger's default selector convention (`app: <name>`); teams using custom selector labels through Flagger's `selectorLabels` setting may need to adjust the label selectors.
