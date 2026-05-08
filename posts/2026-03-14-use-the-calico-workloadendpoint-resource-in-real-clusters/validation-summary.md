# Validation Summary: Using the Calico WorkloadEndpoint Resource in Production Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico WorkloadEndpoint
- Calico FelixConfiguration
- Calico KubeControllersConfiguration
- Calico Typha
- Kubernetes
- kubectl
- calicoctl

## Sources Consulted
- Calico WorkloadEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico calicoctl installation and usage guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico FelixConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico KubeControllersConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The post implied that users should customize WorkloadEndpoint fields directly. Calico documentation says WorkloadEndpoint lifecycle is generally handled by an orchestrator-specific plugin such as the Calico CNI plugin, and calicoctl is generally recommended only for viewing this resource type. I changed the guidance to emphasize observing generated WorkloadEndpoint resources and tuning higher-level Calico configuration resources instead.
- The post suggested using node selectors in WorkloadEndpoint manifests. WorkloadEndpoint does not have a nodeSelector field. I changed the guidance to use selector-scoped FelixConfiguration for node-label-based Felix settings and WorkloadEndpoint labels for policy selection.
- Several `calicoctl get workloadendpoint` examples omitted `-A`, which would only show the default namespace. I added `-A` where the post discusses cluster-wide production review or monitoring.
- The scale section referred vaguely to increasing reconciliation intervals. I clarified that reconciliation tuning applies to Calico Kubernetes controller settings and added a command to inspect `kubecontrollersconfiguration`.
- The Felix health endpoint text tied readiness and liveness checks to Prometheus metrics. Felix health endpoints are controlled by Felix health settings, with port 9099 as the default health port when enabled. I changed the wording accordingly.
- The troubleshooting section referred to WorkloadEndpoint configuration being "applied" and to node selectors matching nodes. I changed this to checking that WorkloadEndpoint resources are present and that selector-scoped FelixConfiguration resources match intended nodes.
- The RBAC check command combined `kubectl auth can-i VERB RESOURCE` with `--list`, which is not the documented usage pattern. I replaced it with a direct `kubectl auth can-i create ...` check.
- The events command was described as reviewing audit-log changes. Kubernetes events are not audit logs. I changed the comment to describe it as reviewing recent Calico-system events.

## Review Notes
The post is now technically valid as a production-oriented operational guide, but it remains important that readers understand WorkloadEndpoint is usually an observed Calico data-plane resource in Kubernetes rather than a primary configuration surface. Direct WorkloadEndpoint management should be limited to cases where the Calico deployment and datastore mode explicitly support it.
