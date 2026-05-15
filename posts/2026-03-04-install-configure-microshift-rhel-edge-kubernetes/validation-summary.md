# Validation Summary: How to Install and Configure MicroShift on RHEL for Edge Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat build of MicroShift
- Kubernetes
- OpenShift CLI
- CRI-O
- firewalld
- YAML configuration

## Sources Consulted
- Red Hat build of MicroShift 4.21: Installing with an RPM package: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.21/html-single/installing_with_an_rpm_package/installing_with_an_rpm_package
- Red Hat build of MicroShift 4.21: Configuring MicroShift: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.21/html-single/configuring/index
- Red Hat build of MicroShift 4.16: Networking and firewall settings: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.16/html-single/networking/networking
- Kubernetes kubectl create deployment reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Red Hat Ecosystem Catalog: ubi9/httpd-24 container image: https://catalog.redhat.com/en/software/containers/ubi9/httpd-24/61a60c3e3e9240fca360f74a

## Issues Found
- The repository enablement commands were pinned to MicroShift 4.16 and `x86_64`. Updated them to MicroShift 4.21 and `$(uname -m)`, matching current Red Hat documentation and avoiding an architecture-specific command.
- The prerequisites said `RHEL.x`, which was imprecise. Updated this to a supported RHEL 9 release and added `subscription-manager release --set=9.6`, which Red Hat documents for MicroShift 4.21.
- The installation steps omitted the required Red Hat pull secret setup under `/etc/crio/openshift-pull-secret`. Added the documented copy, ownership, and permission commands so MicroShift can authenticate to pull required images.
- The MicroShift `config.yaml` example used `clusterNetwork` as a list of objects with a `cidr` key. Updated it to a list of CIDR strings, which matches the documented MicroShift configuration schema.
- The firewall section described all ports as required and labeled the trusted-source rules as Kubernetes API server rules. Updated the wording to distinguish required host network pod access from optional external API server and NodePort access.

## Review Notes
The firewall commands and local kubeconfig path match Red Hat MicroShift documentation. The NodePort and API server firewall ports are optional for external access rather than mandatory for every local-only installation, but the commands are valid for the access pattern described in the post.
