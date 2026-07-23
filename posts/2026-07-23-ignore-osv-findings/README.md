# How to Ignore OSV Findings Safely with Reasons and Expiration Dates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSV-Scanner, Vulnerability Exceptions, Risk Acceptance, Security Policy

Description: Create narrow, reviewable OSV-Scanner exceptions that carry evidence, ownership, and automatic expiration.

---

An ignore is a risk exception, not a finding deletion. OSV-Scanner's TOML configuration supports a vulnerability ID, optional reason, and optional expiry date. Use all three in a production workflow, keep the evidence outside the config, and let expiration reopen the finding.

## Put the config beside the scanned file

OSV-Scanner looks for `osv-scanner.toml` in the directory of the scanned file. Configuration does not propagate into child directories.

```text
/Cargo.lock
/osv-scanner.toml          applies to Cargo.lock
/services/api/go.mod
/services/api/osv-scanner.toml   applies to go.mod
```

This locality prevents one repository-root exception from silently applying to every nested lockfile.

To force one policy file across all inputs, use:

```bash
osv-scanner scan source \
  --config=/policy/osv-scanner.toml \
  --recursive \
  .
```

The documented behavior is important: `--config` applies that file to all scanned inputs and ignores local `osv-scanner.toml` files. Choose local or central ownership deliberately.

## Ignore one vulnerability ID

Use the exact documented table name:

```toml
[[IgnoredVulns]]
id = "GO-2022-0968"
ignoreUntil = 2026-10-31
reason = "Accepted until the Q4 protocol migration; service does not initiate or host SSH connections. SEC-1842."
```

OSV-Scanner also ignores vulnerabilities considered aliases of the configured ID. Before adding an exception, inspect the complete alias group so the scope is understood.

The reason should state the technical condition, decision owner or ticket, and remediation trigger. Avoid reasons such as “false positive” without evidence.

## Prefer expiry to permanent acceptance

`ignoreUntil` is an exception boundary. Pick a date based on a remediation milestone, compensating-control review, or upstream fix expectation—not an arbitrary distant future.

Test the lifecycle in CI:

1. Run the scan before adding the entry and capture the finding.
2. Add the exception and verify only the intended alias group is suppressed.
3. Temporarily test with a past expiry date and verify the finding returns.
4. Assign automation or an owner to review upcoming expirations.

Do not automatically extend an expired entry. Re-run the applicability analysis against the current package, code, deployment, and advisory record.

## Choose between ID ignores and package overrides

`IgnoredVulns` suppresses a vulnerability and its aliases. OSV-Scanner also supports package overrides:

```toml
[[PackageOverrides]]
name = "internal-example"
version = "1.2.3"
ecosystem = "Go"
vulnerability.ignore = true
effectiveUntil = 2026-10-31
reason = "Private fork is patched; upstream version metadata is unchanged. SEC-1901."
```

This can constrain an exception to a particular package identity and version, but `vulnerability.ignore = true` ignores all vulnerabilities for every package matching the fields—not just one advisory. That may be broader than an ID ignore.

Use a package override only when the package-level condition justifies suppressing every matching vulnerability and all match fields are sufficiently narrow. Otherwise use `IgnoredVulns` and keep package-instance scope in the review record.

## Require evidence before suppression

Reasonable evidence can include:

- an exact installed version and artifact digest;
- call-analysis output plus review of its limitations;
- proof that a required feature, protocol, platform, or configuration is absent;
- a backported patch commit in a private build;
- an upstream data-correction issue for a demonstrably wrong range.

Do not ignore because a severity is low, a fix is inconvenient, or the advisory lacks a CVE. Those are prioritization inputs, not evidence of non-applicability.

If the advisory data is wrong, report it at the authoritative source. A local ignore can be a short-lived bridge, but the durable fix is corrected shared data.

## Audit the effective policy

For each scan, retain the config digest and scanner version. Locate exception entries for review with:

```bash
rg -n '^\[\[(IgnoredVulns|PackageOverrides)\]\]|^(id|name|nameIsRegex|version|ecosystem|group|ignore|vulnerability\.ignore|ignoreUntil|effectiveUntil|reason)\s*=' \
  --glob 'osv-scanner.toml'
```

Also inspect pull requests that modify an exception with the same scrutiny as dependency changes. Require security ownership, evidence links, a maximum duration, and a remediation ticket.

An exception is safe only while its assumptions remain true. Short scope, explicit rationale, and enforced expiration turn suppression into governed risk acceptance instead of invisible debt.

## Official Documentation

- [OSV-Scanner configuration](https://google.github.io/osv-scanner/configuration/)
- [OSV-Scanner output and alias grouping](https://google.github.io/osv-scanner/output/)
- [OSV schema alias definition](https://ossf.github.io/osv-schema/)
- [OSV.dev FAQ: correcting bad source data](https://google.github.io/osv.dev/faq/)
