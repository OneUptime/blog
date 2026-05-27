# Validation Summary: How to Use Ansible to Deploy Helm Charts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- kubernetes.core Ansible collection
- Helm 3
- Kubernetes
- Helm chart repositories
- ingress-nginx Helm chart
- kube-prometheus-stack Helm chart
- Bitnami Redis and ExternalDNS Helm charts
- cert-manager Helm chart

## Sources Consulted
- Ansible kubernetes.core collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/
- Ansible kubernetes.core.helm module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/helm_module.html
- Ansible kubernetes.core.helm_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/helm_repository_module.html
- Ansible kubernetes.core.helm_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/helm_info_module.html
- Helm upgrade command documentation: https://helm.sh/docs/helm/helm_upgrade/
- cert-manager Helm installation documentation: https://cert-manager.io/v1.13-docs/installation/helm/
- ingress-nginx chart index and chart package: https://kubernetes.github.io/ingress-nginx/index.yaml
- prometheus-community chart index and kube-prometheus-stack package: https://prometheus-community.github.io/helm-charts/index.yaml
- Bitnami chart index and Redis/ExternalDNS chart packages: https://charts.bitnami.com/bitnami/index.yaml
- Jetstack chart index: https://charts.jetstack.io/index.yaml

## Issues Found
- The prerequisites listed Ansible 2.12+ for the current `kubernetes.core` collection. Current official collection documentation lists ansible-core 2.16.0 or newer, so this was updated to ansible-core 2.16+.
- The prerequisites and install command listed the Python `kubernetes` library. The official `kubernetes.core.helm` and `kubernetes.core.helm_repository` module requirements list Helm and PyYAML, so this was corrected to `PyYAML` and `pip install PyYAML`.

## Review Notes
The playbook and values examples parse as valid YAML. The Ansible module parameters used in the examples are current and documented. The pinned chart versions referenced in the post are still present in their respective chart indexes as of 2026-05-27. Helm and Ansible were not installed locally in this workspace, so validation used official documentation, chart indexes, downloaded chart packages, and YAML parsing rather than live `helm template` or `ansible-playbook` execution.
