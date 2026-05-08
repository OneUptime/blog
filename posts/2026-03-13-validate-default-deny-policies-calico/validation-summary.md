# Validation Summary: How to Validate Calico Default Deny Policies Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico NetworkPolicy resources
- calicoctl
- Kubernetes
- YAML
- yamllint
- jq
- GitHub Actions
- Python / PyYAML

## Sources Consulted
- Calico calicoctl validate documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico calicoctl apply documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico calicoctl installation documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico calicoctl configuration documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- actions/checkout official repository: https://github.com/actions/checkout
- yamllint documentation: https://yamllint.readthedocs.io/
- PyYAML documentation: https://pyyaml.org/wiki/PyYAMLDocumentation

## Issues Found
- The post used `calicoctl apply --dry-run`, but the official `calicoctl apply` reference does not document a `--dry-run` option. Replaced those examples with `calicoctl validate -f`, which is the documented offline validation command for Calico resource files.
- The introduction and prerequisites described dry-run validation. Updated the wording to offline validation through `calicoctl validate`, which matches current Calico documentation.
- The prerequisites listed `kubeval` or `kubeconform`, but the post did not use either tool and the coverage script used `jq`. Updated the prerequisite list to include `jq`.
- The required-field Python example only handled one YAML document per file and ignored `.yml` files. Updated it to use `yaml.safe_load_all`, handle both `.yaml` and `.yml`, skip empty documents, and verify `metadata.name`.
- The traffic coverage script only checked whether any policy had an ingress destination port, so it could report false coverage for the wrong source, destination, or action. Updated the example matrix and `jq` filter to check the policy destination selector, ingress source selector, allow action, and destination port.
- The GitHub Actions example used `actions/checkout@v3` and installed `calicoctl` v3.26.0. Updated the example to `actions/checkout@v4` and Calico v3.32.0, matching the current Calico installation documentation consulted during review.

## Review Notes
The coverage script is still a lightweight static sanity check. It does not prove full reachability because Calico policy behavior can depend on policy order, tiers, other allow or deny policies, profiles, namespace selectors, egress policy, and runtime labels. Staging traffic tests remain necessary, as the post already notes.
