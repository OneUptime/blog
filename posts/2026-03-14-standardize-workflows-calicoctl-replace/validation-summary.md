# Validation Summary: How to Standardize Team Workflows Around calicoctl replace

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes network policy resources
- GitHub Actions
- GitHub CODEOWNERS
- GitHub CLI
- Bash
- Python YAML/JSON parsing

## Sources Consulted
- Calico documentation: calicoctl replace: https://docs.tigera.io/calico/latest/reference/calicoctl/replace
- Calico documentation: calicoctl get: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl validate: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico documentation: GlobalNetworkPolicy resource: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: network policy behavior: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- GitHub documentation: CODEOWNERS: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- GitHub documentation: workflow syntax: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- GitHub CLI manual: gh run list: https://cli.github.com/manual/gh_run_list
- Project Calico release binary check for `calicoctl-linux-amd64` v3.27.0 and v3.31.0: https://github.com/projectcalico/calico/releases

## Issues Found
- The prerequisites and GitHub Actions examples used `calicoctl` v3.27.0 while the post's review checklist requires `calicoctl validate`. The v3.27.0 binary does not include the `validate` subcommand. Updated the prerequisite and install examples to v3.31.0, which includes `validate`.
- The sample `GlobalNetworkPolicy` described a bare egress `Allow` rule as "Allow established connections". An unqualified Calico egress allow rule allows matching egress traffic broadly; it is not an established-connection match. Removed that misleading rule and comment.
- The drift detection script assumed `calicoctl get -o json` returns a single JSON object with `.spec`. The official calicoctl docs describe JSON/YAML output as a list of resource dictionaries. Updated the script to parse the returned list, detect an empty result as drift, support namespaced resources, and exit non-zero when drift is found.

## Review Notes
The GitHub Actions example still assumes the runner has Kubernetes credentials and suitable Calico RBAC configured through the deployment environment. That is a deployment-specific prerequisite rather than a syntax error.
