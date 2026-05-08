# Validation Summary: Creating the Calico KubeControllersConfiguration Resource in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Calico
- Calico KubeControllersConfiguration
- kubectl
- calicoctl

## Sources Consulted
- Calico KubeControllersConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Calico Kubernetes controllers configuration reference: https://docs.tigera.io/calico/latest/reference/kube-controllers/configuration
- Calico calicoctl apply command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl validate command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico calicoctl installation documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/

## Issues Found
- The manifest set `controllers.node.hostEndpoint.autoCreate` to `Enabled` while describing the fields as defaults. Calico documents the default as `Disabled`, so the manifest and field explanation were updated.
- The example omitted the `namespace` and `serviceAccount` controller blocks. Calico documents omitted controller blocks as disabled, while the default enabled controllers include namespace and service account handling. Added both blocks with the documented `5m` reconciler period.
- The verification command used `kubectl describe kubecontrollersconfiguration.projectcalico.org` without naming the singleton resource. Updated it to describe `default` explicitly.
- The log and restart troubleshooting commands targeted `calico-node`, but this resource configures kube-controllers. Updated them to check and restart the `calico-kube-controllers` deployment.
- The troubleshooting section referred to checking the Calico API server when the immediate issue for `kubectl apply` is usually whether the CRD exists. Updated the check to verify the `kubecontrollersconfigurations.crd.projectcalico.org` CRD.
- The advanced naming guidance could be read as applying to KubeControllersConfiguration even though Calico requires the name `default`. Clarified that custom naming applies only to Calico resources that support custom names.

## Review Notes
The post assumes the Calico components run in the `calico-system` namespace, which is common for operator installs. Manifest-based installs may place kube-controllers in `kube-system`, so readers may need to adjust the namespace for log and rollout commands.
