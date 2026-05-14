# Validation Summary: How to Set Up Ansible AWX on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- AWX
- AWX Operator
- Kubernetes
- Minikube
- Kustomize
- kubectl
- Podman
- firewalld
- AWX CLI / awxkit

## Sources Consulted
- AWX Operator basic installation documentation: https://docs.ansible.com/projects/awx-operator/en/latest/installation/basic-install.html
- AWX Operator admin user account configuration: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/admin-user-account-configuration.html
- AWX Operator network and TLS configuration: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/network-and-tls-configuration.html
- AWX Operator database configuration: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/database-configuration.html
- AWX Operator persisting projects directory documentation: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/advanced-configuration/persisting-projects-directory.html
- AWX Operator GitHub repository and release metadata: https://github.com/ansible/awx-operator
- Minikube Podman driver documentation: https://minikube.sigs.k8s.io/docs/drivers/podman/
- Minikube start command documentation: https://minikube.sigs.k8s.io/docs/commands/start/
- Kubernetes kubectl installation documentation: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- AWX CLI reference for job template credential association: https://docs.ansible.com/ansible-tower/3.7.2/html/towercli/reference.html

## Issues Found
- The AWX Operator Kustomize examples pinned the Git ref but did not pin the operator image tag. Added the `images` stanza so the deployed `quay.io/ansible/awx-operator` image matches the selected operator tag.
- The post used AWX Operator `2.12.2`, which is old compared with the latest published operator release listed by the upstream repository. Updated the examples to `2.19.1`.
- The AWX custom resource did not set `service_type`, so the default `ClusterIP` service would not match the later `minikube service` access flow. Added `service_type: NodePort`.
- The readiness wait used a label that does not match the operator-managed resources consistently. Changed it to `app.kubernetes.io/managed-by=awx-operator`, matching the AWX Operator installation documentation.
- The job template creation command passed `--credential` directly to `awx job_templates create`, but AWX CLI uses `awx job_templates associate` for credential association. Split credential assignment into a separate association command.
- The firewall step implied that opening port 8080 is enough for outside access when `kubectl port-forward` binds to localhost by default. Added `--address 0.0.0.0` to the external port-forwarding example.
- The post described AWX Operator deployment as the "supported" path on RHEL. Reworded this to the "standard" AWX path to avoid implying Red Hat product support for upstream AWX.

## Review Notes
The tutorial remains a single-node Minikube-oriented setup and is appropriate for lab or evaluation use. For production, the existing caveat to use a real Kubernetes cluster or OpenShift instead of Minikube is important.
