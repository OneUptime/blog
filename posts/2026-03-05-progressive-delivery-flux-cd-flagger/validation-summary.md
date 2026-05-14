# Validation Summary: How Progressive Delivery Works with Flux CD and Flagger

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flagger
- Kubernetes
- HelmRelease
- OCIRepository
- Istio
- Prometheus
- Canary deployments
- Blue-green deployments
- A/B testing

## Sources Consulted
- Flagger documentation: Introduction: https://docs.flagger.app/main
- Flagger documentation: Install with Flux: https://docs.flagger.app/main/install/flagger-install-with-flux
- Flagger documentation: How it works: https://docs.flagger.app/usage/how-it-works
- Flagger documentation: Deployment strategies: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger documentation: Metrics analysis: https://docs.flagger.app/main/usage/metrics
- Flagger documentation: Webhooks: https://docs.flagger.app/main/usage/webhooks
- Flux documentation: HelmRelease API v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux documentation: Manage Helm releases: https://v2-7.docs.fluxcd.io/flux/guides/helmreleases/

## Issues Found
- Corrected the Flagger workload lifecycle description. Flagger creates a primary copy of the target workload and treats the target workload as the canary, rather than creating the canary as the copied workload.
- Updated the Flux installation example to the current official Flagger-with-Flux pattern using `OCIRepository`, `chartRef`, and CRD create/replace settings.
- Removed `iterations` from the canary traffic-shifting example and corrected the `threshold` comment because `iterations` is used for A/B testing and blue-green analysis, while `threshold` is a failed-check count.
- Corrected the blue-green explanation to distinguish blue-green promotion from traffic mirroring, which requires `mirror: true`.
- Removed query parameters from the A/B testing explanation because the official Flagger deployment strategy documentation describes HTTP header and cookie based routing.
- Corrected the webhook example comment because `type: event` sends rollout events, not only a rollout-complete Slack notification.
- Corrected the workflow wording from creating a canary replica set to updating the canary workload.
- Corrected the `kubectl describe` comment because the command shows details and recent events; it does not watch events in real time.

## Review Notes
The YAML examples were parsed successfully with PyYAML. The examples still assume the surrounding Kubernetes resources exist, including the target Deployment, Prometheus service, Istio configuration, and any notification or test-runner services referenced by webhook URLs.
