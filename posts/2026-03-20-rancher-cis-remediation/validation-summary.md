# Validation Summary: How to Remediate CIS Benchmark Failures in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher CIS scans
- RKE2
- Kubernetes API server configuration
- kubelet configuration
- etcd
- Kubernetes NetworkPolicy
- Kubernetes RBAC
- Pod Security Admission / PodSecurityPolicy

## Sources Consulted
- RKE2 CIS Hardening Guide: https://docs.rke2.io/security/hardening_guide
- RKE2 CIS 1.6 Self-Assessment Guide: https://docs.rke2.io/security/cis_self_assessment16
- RKE2 CIS 1.24 Self-Assessment Guide: https://docs.rke2.io/security/cis_self_assessment124
- RKE2 Pod Security Standards: https://docs.rke2.io/security/pod_security_standards
- Rancher CIS Scans documentation: https://documentation.suse.com/cloudnative/rancher-manager/v2.11/en/security/cis-scans/cis-scans.html
- Rancher CIS scan configuration reference: https://documentation.suse.com/cloudnative/rancher-manager/v2.10/en/security/cis-scans/configuration-reference.html
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes well-known labels reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes NetworkPolicy concepts: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubelet authentication and authorization: https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/

## Issues Found

1. **API server remediation mixed unrelated controls.** The `1.2.1` section bundled `audit-log-path` and kubelet client certificate flags under anonymous authentication and used a non-default audit log path. I changed it to verify the live kube-apiserver flags first and only restore `anonymous-auth=false` if the RKE2 default was overridden.

2. **RKE2 default behavior was understated or incorrect in multiple sections.** Official RKE2 guidance says several listed controls already pass by default or when the correct CIS profile is enabled. I added brief notes so the post no longer implies these settings always need to be added manually from scratch.

3. **The etcd ownership remediation was incomplete.** RKE2 requires a host-level `etcd` user and group for CIS ownership checks. I added the documented `useradd` step and changed the ownership command to the documented `etcd:etcd` directory ownership instead of a recursive chown example.

4. **The kubelet remediation omitted the required service restart step.** Changes under `kubelet-arg` do not apply until `rke2-server` or `rke2-agent` is restarted. I added the restart commands.

5. **The network policy example had a broken name check.** The script checked for `default-deny` but created `default-deny-all`, so the existence check was wrong. I fixed the name mismatch, added quoting, and clarified that RKE2 CIS profiles already manage built-in namespaces.

6. **The RBAC wildcard detection commands were unreliable.** The original grep commands looked for JSON-style quoted wildcards in YAML output, which would often miss real matches. I replaced them with a loop that inspects each Role and ClusterRole as JSON before grepping for wildcard strings.

7. **The Pod Security example used the wrong code block type and was missing overwrite-safe labeling.** The block contained shell commands but was marked as YAML, and relabeling existing namespaces can fail without `--overwrite`. I changed the fence to `bash`, added `--overwrite`, and clarified the version split between PSA on newer RKE2 and PSP-based hardening on older `cis-1.6` clusters.

8. **The verification step hardcoded an old scan profile name.** The original manifest assumed `rke2-cis-1.6-profile-hardened`, which is not portable across current RKE2 and Rancher versions. I changed the section to list installed `ClusterScanProfile` resources first and use a matching hardened profile for the cluster version.

9. **The final verification command assumed a specific status field.** The original `jsonpath` example depended on `.status.summary` without confirming that field shape across Rancher/CIS operator versions. I changed it to retrieve the full `ClusterScan` YAML so readers can inspect the current `status` block safely.

## Review Notes
- Current RKE2 releases are hardened-by-default for many CIS checks, and the exact benchmark/profile mapping depends on the Kubernetes/RKE2 version. The generic `profile: cis` setting is the forward-looking option on newer RKE2 releases, while older clusters may still use version-specific profiles such as `cis-1.6` or `cis-1.23`.
- The post still uses CIS section numbers that are most familiar from older RKE2 benchmark mappings. The remediation commands are now accurate, but readers should match the scan profile and profile flag to their cluster version before applying them.
