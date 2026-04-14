# Validation Summary: How to Simulate Sidecar Failures for Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar architecture, building blocks)
- Kubernetes (kubectl, pod lifecycle, container management)
- Chaos Mesh (PodChaos, StressChaos)
- Dapr JavaScript SDK (`@dapr/dapr`)
- curl (HTTP testing)

## Sources Consulted
- Chaos Mesh: Simulate Pod Faults — https://chaos-mesh.org/docs/simulate-pod-chaos-on-kubernetes/
- Chaos Mesh: Define Scheduling Rules — https://chaos-mesh.org/docs/define-scheduling-rules/
- Chaos Mesh: Simulate Stress Scenarios — https://chaos-mesh.org/docs/simulate-heavy-stress-on-kubernetes/
- Dapr JavaScript Client SDK — https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr Health API Reference — https://docs.dapr.io/reference/api/health_api/
- Dapr JS SDK source: IClientHealth interface — https://github.com/dapr/js-sdk/blob/main/src/interfaces/Client/IClientHealth.ts
- Dapr JS SDK source: DaprClient class — https://github.com/dapr/js-sdk/blob/main/src/implementation/Client/DaprClient.ts
- kubectl exec reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- **Removed invalid `scheduler` field from PodChaos YAML (Scenario 2):** The PodChaos spec does not have a `scheduler` field. In Chaos Mesh 2.x, scheduling chaos experiments requires a separate `Schedule` CRD rather than a field within the experiment spec. The `scheduler.cron: "@every 3m"` block was removed to prevent a validation error or silent ignore when applying the manifest. The experiment YAML remains correct as a one-shot chaos experiment.

## Review Notes
- To schedule recurring sidecar kills in Chaos Mesh 2.x, readers should create a `Schedule` resource that wraps the `PodChaos` spec, using `schedule: "@every 3m"` and `type: PodChaos` in the Schedule spec. The blog could mention this in a future update.
- The `kubectl get events --field-selector reason=BackOff | grep daprd` command uses the correct event reason (`BackOff`), but the `grep daprd` may not always match because Kubernetes event messages for container back-off may not include the container name in all cases.
- The Dapr JS SDK `client.health.isHealthy()` method was verified against the SDK source code (`IClientHealth` interface). It is a valid async method returning `Promise<boolean>`.
- The `DaprClient` constructor signature `{ daprHost: '127.0.0.1', daprPort: '3500' }` is correct per current SDK documentation. Port 3500 is the default Dapr HTTP port.
- All Chaos Mesh fields (`random-max-percent` mode, `expressionSelectors`, `containerNames`, `stressors.memory.workers`, `stressors.memory.size`) verified correct against official documentation.
