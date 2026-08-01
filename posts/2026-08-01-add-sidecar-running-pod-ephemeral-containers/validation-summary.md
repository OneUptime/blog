# Validation Summary: Adding Sidecars to Running Pods: Immutability and Ephemeral Containers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Pods and Pod immutability
- Kubernetes Deployments, StatefulSets, DaemonSets, and Jobs
- Sidecar and native sidecar containers
- Ephemeral containers and the `pods/ephemeralcontainers` subresource
- `kubectl patch`, `kubectl debug`, and Deployment rollout commands
- Mutating admission webhooks

## Sources Consulted
- [Kubernetes: Pods—Pod Update and Replacement](https://kubernetes.io/docs/concepts/workloads/pods/#pod-update-and-replacement)
- [Kubernetes: Ephemeral Containers](https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/)
- [Kubernetes: Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Kubernetes: kubectl debug reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/)
- [Kubernetes: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes: Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Admission Webhook Good Practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/)
- [Kubernetes v1.25 release announcement](https://kubernetes.io/blog/2022/08/23/kubernetes-v1-25-release/)
- [Kubernetes kubectl debug implementation](https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/debug/debug.go)

## Issues Found
- The introduction grouped Jobs with controllers whose Pod templates can be updated to roll out replacement Pods. A Job's Pod template cannot generally be changed to add a container. Replaced `Job` with `DaemonSet` in that list and clarified that adding a sidecar to a Job requires creating a new Job from the updated manifest. Kubernetes 1.36 permits limited scheduling and resource changes for eligible suspended Jobs, but those exceptions do not permit adding a container.

## Review Notes
- The Deployment manifest is valid `apps/v1` configuration and its Pod-template change triggers a new ReplicaSet and rolling update with the shown strategy.
- The JSON Patch is syntactically valid and is correctly expected to fail because ordinary Pod updates cannot append to `spec.containers`.
- The ephemeral-container limitations, Kubernetes 1.25 stability statement, `--target` runtime caveat, static-Pod limitation, and persistence behavior were verified against official documentation.
- The `kubectl debug --copy-to` example correctly modifies the existing `app` container in the copied Pod because `--container=app` names an existing container; `--image` and the command after `--` replace that container's image and command in the copy.
- Image names and digests in the examples are placeholders and must be replaced with real registry references and valid SHA-256 digests before use.
