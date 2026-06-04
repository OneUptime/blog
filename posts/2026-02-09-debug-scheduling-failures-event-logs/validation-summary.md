# Validation Summary: How to Debug Scheduling Failures with Scheduler Event Logs

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Kubernetes
- kube-scheduler
- kubectl
- Kubernetes Events
- Pod scheduling constraints, taints, tolerations, topology spread constraints, PVC topology
- Prometheus scheduler metrics

## Sources Consulted
- Kubernetes Scheduler documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/
- kube-scheduler command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- Kubernetes Events API reference: https://kubernetes.io/docs/reference/kubernetes-api/events/event-v1/
- Kubernetes deprecated API migration guide for Events: https://kubernetes.io/docs/reference/using-api/deprecation-guide
- Taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Pod topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- StorageClass volume binding mode documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The list of common scheduling failure reasons included resource quota, image pull, and admission webhook failures as reasons the scheduler could not place a Pod. I separated these as similar-looking non-scheduler failures because quotas and admission webhooks happen during API admission, and image pull failures happen after placement.
- Event examples sorted on `.lastTimestamp`, which is deprecated in newer Event APIs. I changed the examples to sort by `.metadata.creationTimestamp` and use `tail -20` for recent events after ascending sort.
- The "Analyzing Scheduler Predicates" section used legacy predicate terminology and described a command as enabling debugging when it only reads events. I updated it to scheduler filter/plugin terminology and corrected the command description.
- The PV topology command looked for zone data in PV metadata labels. I changed it to read zone constraints from PV `spec.nodeAffinity`, where topology-constrained PVs express node requirements.
- The Prometheus scheduler latency query used the outdated `scheduler_scheduling_duration_seconds` metric name. I changed it to `scheduler_scheduling_attempt_duration_seconds`, and clarified that scheduling failures are grouped by `result` and `profile`.
- The troubleshooting tools section described `kubectl debug` as a Krew plugin. I changed it to use the built-in `kubectl debug` command.

## Review Notes
`kubectl` was not installed in the local workspace, so command validation was performed against official Kubernetes command references rather than local `--help` output. Some example scheduler pod names and log patterns remain cluster-dependent, but the commands are plausible for kubeadm-style control plane deployments.
