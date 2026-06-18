# Validation Summary: How to Configure Chaos Engineering with Chaos Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Chaos Mesh
- Kubernetes
- Helm
- Chaos Mesh CRDs: PodChaos, NetworkChaos, StressChaos, IOChaos, TimeChaos, Workflow, Schedule
- Prometheus and Grafana metrics

## Sources Consulted
- Chaos Mesh documentation: Install Chaos Mesh using Helm: https://chaos-mesh.org/docs/production-installation-using-helm/
- Chaos Mesh documentation: Simulate Pod Faults: https://chaos-mesh.org/docs/simulate-pod-chaos-on-kubernetes/
- Chaos Mesh documentation: Simulate Network Faults: https://chaos-mesh.org/docs/simulate-network-chaos-on-kubernetes/
- Chaos Mesh documentation: Simulate Stress Scenarios: https://chaos-mesh.org/docs/simulate-heavy-stress-on-kubernetes/
- Chaos Mesh documentation: Simulate File I/O Faults: https://chaos-mesh.org/docs/simulate-io-chaos-on-kubernetes/
- Chaos Mesh documentation: Simulate Time Faults: https://chaos-mesh.org/docs/simulate-time-chaos-on-kubernetes/
- Chaos Mesh documentation: Serial and Parallel Experiments: https://chaos-mesh.org/docs/run-serial-or-parallel-experiments/
- Chaos Mesh documentation: Define Scheduling Rules: https://chaos-mesh.org/docs/define-scheduling-rules/
- Chaos Mesh official GitHub source and Helm chart templates: https://github.com/chaos-mesh/chaos-mesh

## Issues Found
- The installation block showed two `helm install` commands with the same release name and namespace, which would fail if run sequentially. I clarified that users should choose the command for their container runtime and made the Docker example include the same dashboard security setting as the containerd example.
- The monitoring section used Prometheus metric names and labels that do not match current Chaos Mesh metrics. I changed the active experiment query to `chaos_controller_manager_chaos_experiments{phase="running"}`, changed the event-rate query to `rate(chaos_controller_manager_emitted_event_total[5m])`, and added the controller manager metrics endpoint alongside the Chaos Daemon endpoint.

## Review Notes
The YAML examples use current `chaos-mesh.org/v1alpha1` CRDs and match the current Chaos Mesh 2.8.x documentation and schema patterns. `helm` and `kubectl` were not installed locally, so CLI behavior was verified against official Chaos Mesh documentation and chart source rather than local command output.
