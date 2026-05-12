# Validation Summary: How to Secure External Access Using AWS Metadata in Cilium

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Cilium (CiliumNetworkPolicy, CiliumClusterwideNetworkPolicy, egressDeny)
- Kubernetes / Amazon EKS
- AWS EC2 Instance Metadata Service (IMDS / IMDSv2)
- Hubble observability
- AWS CLI (`aws ec2 modify-instance-metadata-options`)
- IAM Roles for Service Accounts (IRSA)

## Sources Consulted
- Cilium Policy Enforcement Modes — https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium Policy Language (Layer 3 / CIDR rules, deny policies) — https://docs.cilium.io/en/stable/security/policy/language/
- Cilium Kubernetes constructs in policy (matchExpressions/NotIn) — https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Cilium v2 API types — https://pkg.go.dev/github.com/cilium/cilium/pkg/k8s/apis/cilium.io/v2
- Hubble observe CLI source / flags — https://github.com/cilium/hubble
- AWS CLI Reference — `modify-instance-metadata-options` — https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-metadata-options.html
- AWS docs — Configure IMDS for existing instances — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-IMDS-existing-instances.html

## Issues Found

1. **The "Default-Deny Policy for IMDS" YAML was inverted.** The original used an `egress` rule (an allow-list construct) with `toCIDRSet: 169.254.169.254/32`. In Cilium, adding *any* `egress` section flips the selected endpoints to default-deny egress and allows only what is listed — so the policy as written would have allowed IMDS access and broken all other egress for every pod in the cluster. Rewrote it to use `egressDeny`, which is the correct deny construct (GA since Cilium 1.10).

2. **Allow-rule exception would not have worked.** Cilium deny rules always take precedence over allow rules, so the architecture diagram (deny by default, allow for labeled pods) cannot be implemented by simply adding a CiliumNetworkPolicy allow rule alongside a blanket deny. Updated the deny policy's `endpointSelector` to use `matchExpressions` with `NotIn` on `needs-imds`, so pods labeled `needs-imds=true` are not selected by the deny policy at all, leaving them free to be allowed by the subsequent `allow-imds-for-privileged-pods` policy. Added a short prose note explaining the precedence behaviour.

3. **AWS CLI command did not actually enforce IMDSv2** despite the section title and prose claiming it did. The command only set the hop limit and left `http-tokens` unchanged. Added `--http-tokens required` to the command, which is the flag that enforces IMDSv2 token-based sessions.

## Review Notes
- `apiVersion: cilium.io/v2`, the structure of `CiliumNetworkPolicy`/`CiliumClusterwideNetworkPolicy`, and the allow policy's `toCIDRSet` + `toPorts` block are all correct for current Cilium (1.16/1.17).
- `hubble observe --to-ip <ip> --follow` is valid; both `--to-ip` and `--follow` are documented flags.
- The allow policy `allow-imds-for-privileged-pods` will also flip `needs-imds=true` pods into egress default-deny (only IMDS allowed). In a real cluster these pods would typically need additional egress allow rules; this is a design caveat rather than a technical error in the snippet itself.
- For most modern EKS workloads, IRSA (or EKS Pod Identity) is the recommended way to provide AWS credentials and removes the need to grant IMDS access at all. Readers should treat the `needs-imds=true` carve-out as a legacy compatibility path.
- AWS now also exposes `aws ec2 modify-instance-metadata-defaults` for account-region-wide IMDS defaults — worth mentioning in a future revision.
