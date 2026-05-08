# Validation Summary: How to Validate Calico IPAM Checks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico IPAM
- `calicoctl`
- Kubernetes
- `kubectl`
- Bash
- Python `ipaddress`

## Sources Consulted
- Calico Open Source `calicoctl ipam check` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico Open Source `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source IP address management overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Python `ipaddress` standard library documentation: https://docs.python.org/3/library/ipaddress.html

## Issues Found
- The script checked for the string `IPAM is consistent`, but current Calico examples and troubleshooting output use `Check complete; found 0 problems` for a clean `calicoctl ipam check` result. Updated the check and surrounding wording to use the final problem count.
- The `calicoctl ipam show` parsing for `IPs in use` did not match the documented table output, whose header is `IPS IN USE` and whose data is pipe-delimited. Updated the parsing to sum the `IPS IN USE` values from `IP Pool` rows and to derive utilization from documented table percentages.
- The running pod count used `grep -c Running`, which can be affected by display text. Updated it to use Kubernetes' documented `--field-selector=status.phase=Running`.
- The post implied Calico IPAM allocations should match running pods exactly. Updated the claim to a rough cross-check because Calico IPAM can include node tunnel IPs, while hostNetwork pods or pods using another IPAM plugin may not consume Calico pod IPs.
- The IPPool capacity calculation subtracted two addresses and only handled IPv4 prefixes. Calico's own `ipam show` examples count the full pool size, and IPPools can be IPv4 or IPv6. Updated the snippet to use Python's `ipaddress.ip_network(...).num_addresses`.

## Review Notes
The examples are still intentionally lightweight shell checks. For production automation, parsing `calicoctl` table output is more brittle than consuming structured output where a command supports it; however, `calicoctl ipam show` documents table output rather than JSON output, so the revised parsing stays within the post's current approach.
