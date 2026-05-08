# Validation Summary: How to Document OpenStack Kuryr with Calico for Operations Teams

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenStack Kuryr-Kubernetes
- OpenStack Neutron
- Project Calico for OpenStack
- Calico Felix, BIRD, and WorkloadEndpoint resources
- Kubernetes and kubectl
- OpenStackClient CLI
- Bash
- Mermaid sequence diagrams

## Sources Consulted
- OpenStack Kuryr-Kubernetes integration design: https://docs.openstack.org/kuryr-kubernetes/latest/devref/kuryr_kubernetes_design.html
- OpenStack Kuryr-Kubernetes Network Policy documentation: https://docs.openstack.org/kuryr-kubernetes/2023.2/devref/network_policy.html
- OpenStack KuryrPort CRD usage documentation: https://docs.openstack.org/kuryr-kubernetes/stein/devref/port_crd_usage.html
- OpenStack Kuryr containerized installation documentation: https://docs.openstack.org/kuryr-kubernetes/latest/installation/containerized.html
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- OpenStackClient port command documentation: https://docs.openstack.org/python-openstackclient/2026.1/cli/command-objects/port.html
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The integration sequence diagram showed Neutron sending endpoint and security updates directly to Felix. Calico's OpenStack integration uses the Calico Neutron driver to translate Neutron state into Calico datastore data, which Felix reads. Updated the diagram and interaction list to include the Calico datastore between Neutron and Felix.
- The Neutron component description implied a direct API layer between Kuryr and Calico. Updated it to describe Neutron as the API layer used by Kuryr and the Calico driver as the backend implementation that writes Calico state.
- The Felix responsibility list said Felix manages route distribution via BIRD. Updated this to state that Felix works with BIRD, while BIRD propagates local workload routes over BGP.
- The troubleshooting script grepped Calico workload endpoints even when the pod had no IP, which would match every line. Added a guard so the Calico lookup runs only when `POD_IP` is set.
- The runbook and verification snippets used `openstack port list --device-owner kuryr:bound`, but Kuryr pod port device owners are deployment-specific and official examples show values such as `trunk:subport`. Replaced the generic count with KuryrPort CRD counts, which Kuryr documentation describes as the Kubernetes-side tracking objects for Neutron resources.

## Review Notes
The examples assume Kuryr is deployed as Kubernetes resources in `kube-system` and uses the `app=kuryr-controller` label. That is valid for the documented containerized deployment pattern, but operators should adjust namespace and labels to match their environment.
