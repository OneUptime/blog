# Validation Summary: Validating Results After Running calicoctl cluster diags

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico cluster diagnostics
- Kubernetes
- Shell scripting
- Python / PyYAML

## Sources Consulted
- Calico documentation: calicoctl cluster diags, https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags
- Calico documentation: calicoctl user reference and resource aliases, https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico documentation: Resource definitions, https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: FelixConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The validation script used `du -h $BUNDLE` without quoting the bundle path. Quoted it so paths with spaces are handled consistently with the surrounding `tar` command.
- The validation script did not check whether `tar tzf` failed. Added an explicit failure path so corrupt or non-gzip tar files are reported as validation failures instead of being treated as missing resources.
- The analysis script iterated over `find` output using command substitution and used an ungrouped `find` expression. Replaced this with a `while read` loop and grouped `find` predicates so YAML and JSON files are selected reliably.
- The resource count used `grep -c "^  name:"`, which misses Calico resources stored as YAML lists with deeper indentation. Broadened the pattern to count indented `name:` fields.
- The IP pool and GlobalNetworkPolicy checks stored multi-line file lists in scalar variables and passed them unquoted to `grep`. Changed them to Bash arrays populated with `mapfile` and passed them to `grep` safely.
- The policy check described any `action: Deny` in a GlobalNetworkPolicy as a default-deny policy. Updated the wording to report explicit deny rules instead, because a deny action is not by itself proof of a default-deny posture.
- The prerequisites mentioned Python 3 for analysis scripts even though the scripts are Bash and the Python one-liner requires PyYAML. Updated the prerequisite to mention PyYAML specifically.
- The troubleshooting note said missing policy files will be empty. Updated it to say the file may be empty or absent, which is a safer statement for diagnostic bundles.

## Review Notes
The documented `calicoctl cluster diags` command is current in the Calico Open Source documentation and produces a `.tar.gz` diagnostic bundle. The resource names checked in the script are valid Calico resource aliases, but the exact diagnostic bundle contents can vary by Calico version, datastore, enabled components, and RBAC permissions.
