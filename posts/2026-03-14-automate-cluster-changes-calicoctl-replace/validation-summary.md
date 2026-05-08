# Validation Summary: How to Automate Cluster Changes with calicoctl replace

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- GitOps
- GitHub Actions
- Bash
- GNU envsubst
- YAML

## Sources Consulted
- Calico calicoctl replace reference: https://docs.tigera.io/calico/latest/reference/calicoctl/replace
- Calico calicoctl apply overview: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico calicoctl configuration guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- GNU gettext envsubst documentation: https://www.gnu.org/software/gettext/manual/html_node/envsubst-Invocation.html

## Issues Found
- The introduction overstated `replace` as making the entire cluster resource exactly match the input definition. The Calico docs state that replace requires the complete resource spec, while API-defaulted and generated metadata may still exist. Reworded the claim to focus on deterministic replacement of the managed resource spec.
- The description of `apply` said it may create resources unexpectedly. The official calicoctl overview states that `apply` creates a resource if it does not exist and replaces it if it does. Reworded this as documented behavior.
- The sync and templated replacement scripts used Python `import yaml`, which adds an unstated PyYAML dependency in the CI runner. They also checked existence by kind and name without honoring namespaces for namespaced Calico resources. Reworked the examples to run `calicoctl replace -f` and fall back to `calicoctl create -f` only when the replace error indicates the resource does not exist.
- The GitHub Actions validation loop manually walked files. Calico documents recursive directory validation with `calicoctl validate -f <dir> --recursive`, so the pipeline was simplified to use the documented recursive validation mode.
- The template used `${VAR:-default}` expressions inside an `envsubst` input file. GNU envsubst does not perform shell default-value substitutions. Moved defaults into the shell script and changed the template to use plain `${VAR}` references.
- The verification example parsed YAML with PyYAML and used kind/name lookups that could miss non-default namespace resources. Changed it to use `calicoctl get -f "$file" -o yaml`, which is the documented file-based lookup form.

## Review Notes
Current Calico documentation recommends installing the Calico API server and using `kubectl` for most Kubernetes API resource operations in newer releases, while `calicoctl` remains valid and required for specific subcommands. The post remains technically relevant because it is specifically about calicoctl-based automation and uses documented calicoctl commands.
