# Validation Summary: Using the Calico KubeControllersConfiguration Resource in Production Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico KubeControllersConfiguration
- Calico FelixConfiguration
- Calico Typha
- Calico IP pools and IPAM
- Kubernetes CRDs, RBAC, kubectl, and calicoctl

## Sources Consulted
- Calico KubeControllersConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl installation and usage notes: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The post implied that multiple KubeControllersConfiguration resources or per-node/per-environment controller configurations could be used. Calico documents this resource as a singleton named `default`, so the text was corrected to explain that node selectors apply to host endpoint templates under `spec.controllers.node.hostEndpoint.templates[*].nodeSelector`.
- The small-cluster verification example suggested checking a node object for an effective KubeControllersConfiguration. That resource configures calico-kube-controllers, not per-node effective configuration, so the command was changed to inspect the `default` configuration and the calico-kube-controllers pod.
- The scale guidance referred to managing many KubeControllersConfiguration resources. Since only one object is used, that was changed to monitoring the calico-kube-controllers pod after reconciliation setting changes.
- The scale guidance described reconciliation intervals as reducing API server load. The resource documentation describes these intervals in terms of reconciliation with the Calico datastore, so the wording was changed to datastore load.
- Several examples used `calicoctl get kubecontrollersconfiguration -o yaml` where the resource is specifically named `default`. These were made explicit with `calicoctl get kubecontrollersconfiguration default -o yaml`.
- The monitoring section tied Felix liveness/readiness endpoints to Prometheus metrics. Felix health endpoints are controlled by the Felix health port, so the wording was corrected.
- Troubleshooting suggested checking Felix logs for KubeControllersConfiguration reload behavior. This was changed to calico-kube-controllers logs.
- The RBAC example combined `kubectl auth can-i` action checking with `--list` and used an internal CRD API group form. It was corrected to check `create globalnetworkpolicies.projectcalico.org --all-namespaces`.

## Review Notes
- `calicoctl node status` is valid, but Calico notes that some node-related subcommands may not work when run away from a host node.
- Direct `kubectl` management of Calico APIs depends on whether the Calico API server or native v3 CRDs are available. The post already uses `calicoctl` for Calico resources, which remains the recommended path for validation and defaulting.
