# Validation Summary: How to Understand Calico Open Source Community Workflows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Kubernetes CNI
- GitHub contribution workflows
- kind
- kubectl
- make
- Go

## Sources Consulted
- Project Calico GitHub repository: https://github.com/projectcalico/calico
- Project Calico CONTRIBUTING.md: https://github.com/projectcalico/calico/blob/master/CONTRIBUTING.md
- Project Calico DEVELOPER_GUIDE.md: https://github.com/projectcalico/calico/blob/master/DEVELOPER_GUIDE.md
- Project Calico SECURITY.md: https://github.com/projectcalico/calico/blob/master/SECURITY.md
- Project Calico releases page: https://github.com/projectcalico/calico/releases
- Calico Open Source kind installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/kind
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Tigera Vulnerability Disclosure Policy: https://www.tigera.io/vulnerability-disclosure/

## Issues Found
- Replaced `kubectl version --short` with `kubectl version` because the current Kubernetes reference for `kubectl version` does not document the deprecated `--short` option.
- Replaced the local Go version check and generic setup wording with checks for Docker, git, and make, matching the Calico developer guide prerequisites.
- Replaced `cd felix && make build`, `make ut`, and `make calico/node` with `make -C felix build`, `make -C felix test`, and `make -C node image`, matching the current Calico developer guide's documented component build and test targets.
- Changed "Each sub-directory has its own Makefile" to "Component directories have their own Makefile targets" because the repository has many non-component directories and the developer guide scopes these targets to project/component directories.
- Replaced the specific branch naming and conventional commits guidance with the documented workflow of creating a feature branch from `master` and using reviewable commits, because the current CONTRIBUTING.md does not require those branch prefixes or Conventional Commits.
- Replaced the DCO sign-off guidance with the current Contributor License Agreement requirement from CONTRIBUTING.md.
- Corrected the security reporting email from `security@tigera.io` to `psirt@projectcalico.org`, matching SECURITY.md.
- Removed the unsupported claim that security reports are acknowledged within 24 hours and replaced it with the documented requirement to include affected versions and reproduction steps.
- Changed release support wording from "N-1 support" to Tigera's documented policy that the most recent two minor Calico versions are generally supported on a rolling basis.

## Review Notes
The guide is intentionally high level. Future improvements could link directly to Calico's current CONTRIBUTING.md, DEVELOPER_GUIDE.md, and SECURITY.md so readers can verify current workflow details before contributing.
