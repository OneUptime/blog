# Validation Summary: Troubleshoot Node Pool Taints with Cilium

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes
- Cilium
- Helm
- kubectl
- jq
- CNI networking

## Sources Consulted
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes assigning Pods to Nodes documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Helm installation and upgrade documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/

## Issues Found
- The post implied that Cilium commonly needs explicit tolerations for spot, GPU, or custom node pool taints. Current Cilium Helm defaults set the agent toleration to `operator: Exists`, which tolerates all taint keys and effects. I updated the text and Helm values example to frame this as an issue caused by narrowed or overridden tolerations and to restore the broad default.
- The prerequisite "Cilium installed via Helm or operator" was inaccurate because the Cilium operator is a component, not the usual installation method. I changed it to "Helm or the Cilium CLI."
- The `jq` taint listing command assumed every taint has a value. Kubernetes taints may omit values, so I updated the expression to handle value-less taints.
- The Cilium pod lookup used unquoted `grep` against wide output. I replaced it with a `kubectl` field selector on `spec.nodeName`, which is less error-prone.
- The in-pod health check used `cilium status`. Cilium's troubleshooting documentation uses `cilium-dbg status` inside a Cilium pod, so I updated the command.
- The test pod used `nodeName`, which bypasses the scheduler and therefore does not validate `NoSchedule` taint handling. I changed it to use `nodeSelector` with the node hostname label.
- The best practice recommending `tolerationSeconds` for Cilium `NoExecute` tolerations was misleading because setting it would eventually evict the agent. I changed the guidance to avoid `tolerationSeconds` unless eviction is intended.

## Review Notes
The troubleshooting workflow is technically valid after these corrections. The guide still assumes the Cilium agent should run on every node; clusters that intentionally limit Cilium to a subset of nodes would need additional node selector or scheduling context.
