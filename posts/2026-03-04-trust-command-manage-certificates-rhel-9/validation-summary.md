# Validation Summary: How to Use the trust Command to Manage Certificates on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- p11-kit `trust` command
- RHEL system-wide CA trust store
- `update-ca-trust`
- PKCS#11 trust policy
- OpenSSL certificate inspection

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Using shared system certificates: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/using-shared-system-certificates_securing-networks
- p11-kit Trust Policy Module documentation: https://p11-glue.github.io/p11-glue/p11-kit/manual/trust-module.html
- `trust(1)` manual page for p11-kit: https://manpages.debian.org/unstable/p11-kit/trust.1.en.html
- Local `trust list --help`, `trust extract --help`, and `trust anchor --help` command output

## Issues Found
- The introduction said `trust` can set specific trust purposes. The reviewed command surface supports `--purpose` for filtering `list` and `extract`, not for `trust anchor --store`, so this was changed to say it can filter by purpose.
- The feature list claimed `trust` can modify trust flags and block certificates directly. This was narrowed to changing trust anchors and inspecting blocklisted certificates, matching `trust anchor` and `trust list --filter=blocklist`.
- The `trust list` example was described as listing all trusted CA certificates. By default, `trust list` lists trust policy entries, while `--filter=ca-anchors` lists CA anchors, so the comment was corrected.
- The granular trust example used the invalid command `trust anchor --store --purpose=email`. Because `trust anchor` does not accept `--purpose`, the example was replaced with guidance to use an OpenSSL trusted certificate or p11-kit trust policy file and run `update-ca-trust extract`.
- The blocklist and manual-copy workflow used ambiguous `update-ca-trust` wording. These examples now use `update-ca-trust extract`, matching Red Hat documentation.
- The single-certificate extraction example used an invalid placeholder PKCS#11 URI. It was changed to a syntactically plausible `pkcs11:id=%AA%BB%CC...;type=cert` placeholder.
- The relationship section implied `trust anchor --store` literally runs `update-ca-trust`. The wording and diagram were adjusted to say it stores the anchor and refreshes trust outputs without asserting the internal implementation.

## Review Notes
The post is technically relevant and useful after the corrections. Some advanced trust-policy workflows, such as creating `.p11-kit` files or OpenSSL trusted certificate files, are only mentioned briefly; a future post could cover those in detail.
