# Validation Summary: How to Validate Whisker in Calico in Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico Whisker
- Calico Goldmane flow logs API
- FelixConfiguration
- Kubernetes
- kubectl
- Network policies

## Sources Consulted
- Calico Open Source documentation: View flow logs in the Calico Whisker web console - https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Open Source documentation: Enable the flow logs API and Calico Whisker - https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico Open Source documentation: Calico quickstart guide - https://docs.tigera.io/calico/latest/getting-started/kubernetes/quickstart
- Calico Open Source documentation: Felix configuration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Project Calico v3.32.0 CRD manifest - https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/v1_crd_projectcalico_org.yaml
- Kubernetes documentation: kubectl run reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl exec reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: kubectl debug reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Debugging Kubernetes nodes with kubectl - https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The post pointed readers to `http://localhost:8080` for Whisker. Calico's current documentation uses `kubectl port-forward -n calico-system service/whisker 8081:8081` and `localhost:8081`, so the URL and port-forward note were corrected.
- The initial validation commands checked only Whisker pods and treated `flowLogsFlushInterval` as the key indicator for collection. Current Calico Open Source Whisker uses Goldmane as the flow logs API, and Goldmane/Whisker are enabled by default only on new Calico Open Source 3.30+ installations. The checks now validate `tigerastatus`, Goldmane, Whisker, and Felix's Goldmane publishing target.
- The node debug command checked `/var/log/calico/flowlogs/` inside the debug container. Kubernetes mounts the node filesystem at `/host` for node debug pods, so the command now checks `/host/var/log/calico/flowlogs/`.
- The claim that a busy production cluster should show hundreds of flows per minute was too specific without a documented baseline. It was changed to require nonzero recent flows matching expected workload traffic.
- The conclusion said the most common failure is an unset `flowLogsFlushInterval`. This was updated to the more accurate Goldmane/Whisker/Felix publishing failure modes.

## Review Notes
Calico Whisker and Goldmane are marked as tech preview in the current Calico Open Source documentation, so details may change in future Calico releases. The `kubectl run`, `kubectl exec`, and `kubectl debug` command forms are syntactically valid, but the sample traffic commands still require the reader's cluster to have the referenced service, namespace, policy, and RBAC permissions.
