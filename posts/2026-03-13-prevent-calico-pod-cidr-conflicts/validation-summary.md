# Validation Summary: How to Prevent Calico Pod CIDR Conflicts

## Status
validated

## Post Type
Prevention guide / How-to

## Technologies Covered
- Calico (CNI plugin)
- Kubernetes (kubectl)
- calicoctl CLI
- Bash scripting
- IP networking / CIDR planning
- Mermaid (for flowchart)

## Sources Consulted
- Calico official documentation on IPAM and pod CIDRs (https://docs.tigera.io/calico/latest/networking/ipam/)
- `calicoctl ipam check` reference (https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check)
- Kubernetes documentation for `kubectl label` (https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#label)
- RFC 1918 (Private IP address allocations) for 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
- Bash manual for shell scripting syntax (cut, echo, conditionals)
- Mermaid flowchart syntax documentation (https://mermaid.js.org/syntax/flowchart.html)

## Issues Found
No technical issues found.

- Calico's default pod CIDR of `192.168.0.0/16` is accurately stated.
- The `calicoctl ipam check` command is a valid subcommand for IPAM consistency verification.
- The bash validation script is syntactically correct; its simplified first-two-octet comparison is appropriately disclaimed in a comment.
- All cited private ranges (10.x/16, 172.16.0.0/12, 192.168.1.0/24) are valid RFC 1918 allocations.
- `kubectl label node` syntax and `ip route show` usage are correct.
- The Mermaid flowchart uses valid flowchart syntax.

## Review Notes
- The bash script's overlap check only compares the first two octets and would not detect all forms of overlap (e.g., overlapping supernets at /8 or /12, or overlap when prefixes are larger than /16). The post acknowledges this with the inline comment and the "verify with full subnet calculator" message, which is appropriate.
- For more rigorous validation, readers could use tools like `ipcalc`, `sipcalc`, or Python's `ipaddress` module to perform actual subnet intersection checks.
- The advice to avoid Calico's default 192.168.0.0/16 across multiple connected clusters is consistent with current Tigera/Calico best-practice guidance.
- Content is version-agnostic enough that it should remain accurate across current Calico and Kubernetes versions.
