# Validation Summary: How to Set Up MicroShift for Lightweight Kubernetes on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat build of MicroShift
- Kubernetes
- OpenShift CLI (`oc`)
- firewalld
- LVMS CSI storage

## Sources Consulted
- Red Hat build of MicroShift 4.19, Installing with an RPM package: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.19/html-single/installing_with_an_rpm_package/index
- Red Hat build of MicroShift 4.19, Getting ready to install MicroShift: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.19/html-single/getting_ready_to_install_microshift/index
- Red Hat build of MicroShift 4.19, Configuring: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.19/html-single/configuring/index
- Red Hat build of MicroShift 4.19, Networking: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.19/html-single/networking/index
- Red Hat build of MicroShift 4.19, Storage: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.19/html-single/storage/index

## Issues Found
- The repository commands used `rhocp-4.14` and hard-coded `x86_64`. Updated them to the current MicroShift 4.19 repository for RHEL 9 using `$(uname -m)`, and added `subscription-manager release --set=9.6` to match Red Hat's compatibility guidance for MicroShift 4.19.
- The prerequisites said only "Active Red Hat subscription." Updated this to "Active MicroShift subscription," matching Red Hat's stated requirement.
- The install steps omitted the Red Hat pull secret setup required for MicroShift images. Added the pull secret copy, ownership, and permission commands from Red Hat's installation procedure.
- The kubeconfig setup did not remove group/other read permissions. Added `chmod go-r ~/.kube/config`, matching the official access procedure.
- The MicroShift configuration example used `clusterNetwork` as a list of objects with `cidr`. Red Hat's MicroShift `config.yaml` expects `clusterNetwork` as a list of CIDR strings, so this was corrected.

## Review Notes
The firewall rules and basic `oc` verification/deployment commands are technically valid. Ports 80 and 443 are only needed when exposing applications through ingress/router access from outside the host, so future revisions could clarify that they are optional depending on access needs.
