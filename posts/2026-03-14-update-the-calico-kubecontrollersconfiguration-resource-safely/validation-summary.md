# Validation Summary: Safely Updating the Calico KubeControllersConfiguration Resource in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- KubeControllersConfiguration
- calicoctl
- kubectl

## Sources Consulted
- Calico KubeControllersConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Calico kube-controllers configuration documentation: https://docs.tigera.io/calico/latest/reference/kube-controllers/configuration
- Calico calicoctl get documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl apply documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl validate documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico calicoctl node documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico BGP status documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i

## Issues Found
- The introduction overstated the direct impact of KubeControllersConfiguration by saying it could break BGP peerings. Updated it to describe the kube-controllers behaviors that the resource actually controls.
- The review checklist asked whether the change required a Felix or BGP restart. Updated it to focus on calico-kube-controllers and host endpoint settings.
- The apply step implied `calicoctl apply` alone was the validation step. Added `calicoctl validate -f kubecontrollersconfiguration.yaml` before applying.
- The monitoring and verification commands checked `calico-node` and Felix logs. Updated them to check `calico-kube-controllers`, which is the component configured by KubeControllersConfiguration.
- The troubleshooting section referred to Felix crashloops for this resource. Updated it to check calico-kube-controllers instead.
- The BGP troubleshooting heading implied KubeControllersConfiguration is a BGP-related resource. Reworded it to apply only when BGP resources were changed alongside this update.
- The "no effect" troubleshooting text said unknown fields are silently ignored by kubectl. Replaced this with guidance to use `calicoctl validate` and corrected the resource-name requirement to `default`, which is the only supported KubeControllersConfiguration name.
- The multi-cluster comparison example exported `FelixConfiguration` instead of `KubeControllersConfiguration`. Updated the example to compare kube-controllers configuration.
- The RBAC check used an invalid combination of `kubectl auth can-i` arguments and checked GlobalNetworkPolicy instead of KubeControllersConfiguration. Updated it to check whether the current identity can update `kubecontrollersconfigurations.crd.projectcalico.org`.

## Review Notes
The examples assume Calico is installed in the `calico-system` namespace, which is common for operator installs. Manifest-based installs may use `kube-system`; future revisions could mention adjusting the namespace for the installation method.
