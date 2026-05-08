# Validation Summary: How to Roll Back Safely After Using calicoctl create

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Bash
- Python / PyYAML
- YAML

## Sources Consulted
- Calico official calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico official calicoctl create reference: https://docs.tigera.io/calico/latest/reference/calicoctl/create
- Calico official calicoctl delete reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico official calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico official GlobalNetworkSet resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset
- Calico official NetworkSet resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkset
- Calico official NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico official GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy

## Issues Found
- The example scripts used Python's `yaml` module but did not list PyYAML as a prerequisite. Added a PyYAML prerequisite so the scripts have their required dependency documented.
- The tracking wrapper printed a rollback command without `-n` for namespaced resources. Updated it to include the namespace when the created resource metadata includes one.
- The NetworkSet dependency check implied policies reference NetworkSets by object name and used `grep -l` on piped YAML, which would not reliably identify dependent policies. Updated the script to explain that NetworkSets are matched by policy selectors against labels and to show the relevant policy YAML for review.
- The multi-resource rollback comment said reverse order meant "dependencies first", which is not generally guaranteed. Reworded it to state the actual behavior: deleting later-created resources first.
- The auto-rollback wrapper set `TIMEOUT_SECONDS=60` but only slept once for 10 seconds before checking. Replaced it with a loop that retries until the timeout expires.
- The auto-rollback wrapper did not include namespace handling when deleting a namespaced resource. Added namespace extraction and namespaced delete support.
- The verification command used `<deleted-policy-name>` next to shell redirection, which is invalid shell syntax because `<...>` is parsed as input redirection. Replaced it with a shell variable placeholder.

## Review Notes
The corrected examples are syntactically valid Bash. The dependency review for NetworkSets remains intentionally conservative because Calico policies select NetworkSets by labels and selector scope rather than by direct object references.
