# Validation Summary: How to Set Up Chaos Mesh Experiments for Kubernetes Pod Failure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Chaos Mesh
- Chaos engineering
- Helm
- kubectl
- Kubernetes custom resources
- Kubernetes Deployments, Services, probes, and labels

## Sources Consulted
- Chaos Mesh: Install Chaos Mesh using Helm: https://chaos-mesh.org/docs/production-installation-using-helm/
- Chaos Mesh: Simulate Pod Faults: https://chaos-mesh.org/docs/2.7.2/simulate-pod-chaos-on-kubernetes/
- Chaos Mesh: Simulate Network Faults: https://chaos-mesh.org/docs/next/simulate-network-chaos-on-kubernetes/
- Chaos Mesh: Run a Chaos Experiment: https://chaos-mesh.org/docs/2.6.7/run-a-chaos-experiment/
- Chaos Mesh: Define Scheduling Rules: https://chaos-mesh.org/docs/next/define-scheduling-rules/
- Chaos Mesh: Create Chaos Mesh Workflow: https://chaos-mesh.org/docs/create-chaos-mesh-workflow/
- Chaos Mesh: Configure namespace for Chaos experiments: https://chaos-mesh.org/docs/2.7.2/configure-enabled-namespace/
- Kubernetes: Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes: kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/
- Kubernetes: kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Helm: helm install command reference: https://docs.helm.sh/docs/helm/helm_install/

## Issues Found
- The architecture section incorrectly implied all pod failure behavior terminates pods. Updated it to distinguish `pod-kill`, which kills pods through the Kubernetes API, from `pod-failure`, which makes target pods unavailable for the experiment duration.
- The first PodChaos example used an inline `scheduler` field and described a recurring experiment. Current Chaos Mesh scheduling uses a separate `Schedule` custom resource, so the PodChaos example was corrected to a one-time `pod-kill` experiment and a separate Schedule example was added.
- The post described `pod-kill` durations as if killed pods remain failed for the specified duration. Removed misleading `duration` fields from `pod-kill` examples.
- The API server NetworkChaos example included `target.mode`, but `target` is a selector and does not have a nested `mode` field. Removed the invalid field and clarified that the example depends on matching Kubernetes API server pod labels.
- The pause/resume commands used `chaos-mesh.org/pause`; Chaos Mesh documents `experiment.chaos-mesh.org/pause`. Updated both commands.
- The safety-controls section used `chaos-mesh.org/inject: "false"` as a protection mechanism. Chaos Mesh namespace filtering is opt-in when FilterNamespace is enabled and uses `chaos-mesh.org/inject=enabled`, so the example now annotates an allowed test namespace instead.
- Added a note that non-Docker runtimes require matching `chaosDaemon.runtime` and `chaosDaemon.socketPath` Helm values, as documented by Chaos Mesh.
- Corrected the pause/resume code fence from YAML to Bash.

## Review Notes
The Kubernetes and Chaos Mesh examples are now technically aligned with the consulted documentation. `kubectl` and `helm` were not installed in the local workspace, so command verification was performed against official documentation rather than local CLI help output.
