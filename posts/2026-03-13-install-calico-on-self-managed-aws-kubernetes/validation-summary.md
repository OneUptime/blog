# Validation Summary: Install Calico on Self-Managed AWS Kubernetes

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes and kubeadm
- kubectl
- calicoctl
- AWS EC2 security groups
- VXLAN, BGP, and Kubernetes network policy

## Sources Consulted
- Calico install documentation for self-managed Kubernetes: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico system requirements and network ports: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico network policy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico calicoctl datastore configuration documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Kubernetes kubeadm init reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- AWS CLI authorize-security-group-ingress reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html

## Issues Found
- Updated the Calico install commands from v3.27.0 to v3.32.0 and added the explicit `v1_crd_projectcalico_org.yaml` CRD install step, matching the current official operator installation flow.
- Corrected the monitoring command from invalid `kubectl watch --for=condition=Ready tigerastatus/calico --timeout=300s` to `watch kubectl get tigerastatus`, which is the command shown in Calico's current operator install docs.
- Corrected the `calicoctl` environment variables from `CALICO_DATASTORE_TYPE` and `CALICO_KUBECONFIG` to the documented `DATASTORE_TYPE` and `KUBECONFIG`.
- Clarified that BGP TCP 179 is not required for VXLAN-only routing and added `bgp: Disabled` to the Calico installation example so the configuration matches the guide's VXLAN-only intent.
- Reworded the AWS VPC CNI comparison to refer to pod-IP allocation constraints rather than "license limitations."
- Clarified that Typha TCP 5473 is only needed when Typha is enabled or deployed by the operator.

## Review Notes
The network policy examples are syntactically valid Calico `projectcalico.org/v3` policies. The `production` namespace must exist before applying them with Kubernetes tooling. The guide is now validated against current Calico 3.32 documentation as of 2026-05-13.
