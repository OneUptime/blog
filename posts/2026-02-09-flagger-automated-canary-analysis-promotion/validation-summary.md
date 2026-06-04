# Validation Summary: How to Use Flagger for Automated Canary Analysis and Promotion

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Flagger
- Helm
- Istio
- Prometheus
- Flagger Canary, MetricTemplate, and AlertProvider custom resources
- Flagger webhooks and load tester

## Sources Consulted
- Flagger installation documentation: https://docs.flagger.app/install/flagger-install-on-kubernetes
- Flagger deployment strategies documentation: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger how-it-works documentation: https://docs.flagger.app/main/usage/how-it-works
- Flagger metrics analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger webhooks documentation: https://docs.flagger.app/main/usage/webhooks
- Flagger alerting documentation: https://docs.flagger.app/main/usage/alerting
- Flagger monitoring documentation: https://docs.flagger.app/main/usage/monitoring
- Flagger Canary CRD schema: https://raw.githubusercontent.com/fluxcd/flagger/main/artifacts/flagger/crd.yaml

## Issues Found
- The install example omitted the current documented CRD installation step and did not disable Helm CRD creation afterward. Added the `kubectl apply` command for the Flagger CRD and changed the install command to `helm upgrade -i` with `--set crd.create=false`.
- The notification example treated a Slack incoming webhook as a Flagger event webhook and used nested webhook metadata that is not valid for the Canary CRD. Replaced it with an `AlertProvider` plus `analysis.alerts`, and kept the webhook example for pre-rollout testing.
- The session affinity example placed `sessionAffinity` under `spec.service`, but the CRD defines it under `spec.analysis`. Moved the field to the correct location.
- The blue-green example used a non-existent `analysis.strategy.blueGreen` configuration and annotation-based approval. Replaced it with the documented `iterations`-based blue-green pattern and a `confirm-promotion` webhook gate using Flagger load tester approval.
- The multi-cluster example used invalid `service.meshProvider` and misleading `service.backends` usage. Replaced it with the documented Istio multi-cluster Flagger Helm configuration using a control plane kubeconfig secret.
- The monitoring section described `flagger_canary_status` as `0=failed, 1=succeeded`; current docs define `0=running, 1=successful, 2=failed`. Corrected the description and updated the Prometheus alert expression to `flagger_canary_status > 1`.

## Review Notes
The examples remain provider-dependent. Built-in request metrics require the selected mesh or ingress controller and Prometheus setup to expose the metrics Flagger expects, and load tester commands assume the `flagger-loadtester` service is installed in the referenced namespace.
