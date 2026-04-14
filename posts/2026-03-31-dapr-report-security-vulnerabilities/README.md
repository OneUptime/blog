# How to Report Security Vulnerabilities in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Security, Vulnerability, Disclosure, Open Source

Description: Learn how to responsibly report security vulnerabilities in Dapr using the CNCF coordinated disclosure process, GitHub private advisories, and security best practices.

---

## Why Responsible Disclosure Matters

Security vulnerabilities in distributed systems like Dapr can affect thousands of production deployments. Dapr follows a coordinated disclosure policy to ensure issues are patched before public announcement. Bypassing this process by posting vulnerabilities publicly before a fix is available puts users at risk.

## Where to Report Vulnerabilities

Do not open a public GitHub issue for a security vulnerability.

The primary way to report a vulnerability is by emailing the Dapr security team:

```bash
# Email address for security reports
security@dapr.io
```

Include a descriptive subject line and write the issue description in English with example configuration or code demonstrating reproduction.

Alternatively, use GitHub's private security advisory feature:

1. Navigate to `https://github.com/dapr/dapr/security/advisories`
2. Click "Report a vulnerability"
3. Fill in the advisory form with reproduction steps, affected versions, and impact assessment

## What to Include in Your Report

A high-quality report speeds up triage and patching. Include the following:

```bash
# Example report checklist
- Affected component: dapr runtime / CLI / SDK / component
- Dapr version(s): 1.12.x, 1.13.x
- Attack vector: network / local / physical
- Attack complexity: low / high
- Steps to reproduce:
  1. Start Dapr with default configuration
  2. Send crafted HTTP request to sidecar port 3500
  3. Observe unauthenticated state access
- Proof of concept code (if available)
- Suggested fix (optional)
```

## Understanding the Disclosure Timeline

After you submit a report, expect the following timeline:

| Phase | Timeframe |
|-------|-----------|
| Acknowledgment | Ideally within 3 working days |
| Triage, patching, and announcement | Within 30 days |
| Public disclosure | After patch release |

## CVE Assignment

For confirmed vulnerabilities, Dapr maintainers work with GitHub and MITRE to assign a CVE identifier. You can request attribution as the reporter in the advisory.

## Checking Existing Advisories

Review published advisories to avoid duplicate reports:

```bash
# Browse published security advisories
gh api repos/dapr/dapr/security-advisories --jq '.[].ghsa_id'
```

## Bug Bounty

Dapr does not currently offer a paid bug bounty program, but reporters are publicly acknowledged in the security advisory and release notes.

## Summary

Report Dapr security vulnerabilities privately by emailing security@dapr.io or through GitHub security advisories. Include reproduction steps, affected versions, and impact assessment. Dapr follows coordinated disclosure with acknowledgment ideally within 3 working days and full resolution (triage, patching, and announcement) within 30 days.
