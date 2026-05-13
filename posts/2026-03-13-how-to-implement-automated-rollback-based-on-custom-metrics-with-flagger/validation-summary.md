# Validation Summary: How to Implement Automated Rollback Based on Custom Metrics with Flagger

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger
- Kubernetes
- Prometheus
- PromQL
- Canary deployments
- MetricTemplate custom resources
- kubectl

## Sources Consulted
- Flagger Metrics Analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger How It Works documentation: https://docs.flagger.app/usage/how-it-works
- Flagger Deployment Strategies documentation: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger Upgrade Guide: https://docs.flagger.app/main/dev/upgrade-guide
- Flagger Istio Canary Deployments tutorial: https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference
- Podinfo deployment manifest: https://raw.githubusercontent.com/stefanprodan/podinfo/master/kustomize/deployment.yaml

## Issues Found
- The rollback test originally said that updating podinfo to `stefanprodan/podinfo:6.2.0` deploys a version that generates errors. Podinfo does not inherently return errors just because that image tag is used. I changed the section to trigger a canary deployment by updating the pod template, then generate HTTP 500 responses against `podinfo-canary` during the analysis, matching the Flagger rollback testing pattern.
- The rollback test used `podinfo=` as the container name in `kubectl set image`. The podinfo Kustomize deployment used by Flagger examples names the container `podinfod`, so I changed the command to `podinfod=ghcr.io/stefanprodan/podinfo:6.2.0`.

## Review Notes
- The MetricTemplate and Canary examples use current `flagger.app/v1beta1` fields, including `spec.analysis`, `templateRef`, and `thresholdRange`.
- The Prometheus label names in the custom queries are application instrumentation dependent. They are valid PromQL examples, but readers must align `namespace`, `pod`, `kubernetes_namespace`, and `kubernetes_pod_name` labels with their actual scrape configuration.
