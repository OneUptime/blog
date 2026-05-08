# Validation Summary: How to Standardize Team Workflows Around calicoctl convert

## Status
validated

## Post Type
Tutorial / workflow guide

## Technologies Covered
- Calico Open Source / calicoctl
- Kubernetes NetworkPolicy
- Calico NetworkPolicy
- Bash
- Python
- YAML
- GitHub Actions

## Sources Consulted
- Calico 3.31 calicoctl convert documentation: https://docs.tigera.io/calico/3.31/reference/calicoctl/convert
- Calico 3.31 calicoctl validate documentation: https://docs.tigera.io/calico/3.31/reference/calicoctl/validate
- Calico 3.31 calicoctl get documentation: https://docs.tigera.io/calico/3.31/reference/calicoctl/get
- Calico NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Local `calicoctl` binaries from Project Calico GitHub releases for v3.27.0 and v3.31.0, checked with `convert --help`, `validate --help`, `get --help`, and a sample Kubernetes NetworkPolicy conversion.

## Issues Found
- The post required `calicoctl v3.27 or later` and the GitHub Actions workflow installed v3.27.0, but v3.27.0 does not include the `calicoctl validate` command used by the script, CI workflow, and verification section. Updated the prerequisite to `calicoctl v3.31.x` and changed the workflow download URL to v3.31.0, which supports both `calicoctl convert` and `calicoctl validate`.

## Review Notes
- `calicoctl convert -f ... -o yaml` correctly converts Kubernetes NetworkPolicy resources to Calico v3 NetworkPolicy resources in v3.31.0.
- `calicoctl validate -f ...` is offline in v3.31 and validates converted resource syntax and schema without applying resources to a cluster.
- The conversion script depends on Python's `yaml` module, so teams running it need PyYAML available in the execution environment.
