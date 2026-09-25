# How to Submit Evidence for a Disputed Cross-Site Scripting Finding in a PCI DSS ASV Scan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Vulnerability Scanning, Security

Description: Prepare reproducible technical evidence for a disputed ASV cross-site scripting finding, distinguishing false detection, remediation, and compensating controls.

---

A scanner reporting cross-site scripting may have found an executable injection, an encoded reflection, or a response whose context it misinterpreted. Your dispute should establish which case applies to the exact deployed endpoint. “Our framework escapes output” and “we have a WAF” are starting points for investigation, not proof that the reported behavior is safe.

The ASV Program Guide treats XSS flaws as automatic failures and provides a formal dispute process. The ASV evaluates the evidence and changes the report when justified; the scan customer cannot edit the result. [ASV Program Guide v4.0 r2, Table 1 and Section 7.7](https://www.pcisecuritystandards.org/document_library/)

## Obtain the finding's exact technical context

Request the finding identifier, scan time, hostname, IP, port, path, HTTP method, affected parameter, and detection evidence. Determine whether the report concerns reflected, stored, or DOM-based behavior.

Map the endpoint through its CDN, proxy, load balancer, and application deployment. A request to a hostname may reach a different application version from a direct request to an IP. Capture the relevant Host header, TLS server name, redirects, content type, and response context.

Use an authorized test account and synthetic data. Reproduce only within systems you are permitted to test, following the ASV's instructions and your change process. Keep production session tokens and payment information out of shared evidence.

## Distinguish reflection from execution

Find where the supplied value enters the response and how the browser interprets it. HTML text, attributes, JavaScript strings, and URL values require different defenses. Data safely encoded for one context can remain unsafe in another. OWASP documents context-specific encoding, safe output sinks, and sanitization for intentionally supported HTML. [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

For example, this synthetic response displays markup as text in an HTML body:

```html
<p>Search term: &lt;review-marker&gt;</p>
```

That observation only addresses this output context. It does not establish that the same parameter is safely handled inside an inline script or later assigned to an unsafe DOM sink. Capture the response and relevant rendered behavior, not just a screenshot showing that the page looks normal.

If the disputed response came from a WAF block page, identify that explicitly. Show whether the application was reached, which rule acted, and whether ordinary requests remain available. A dynamic block that prevents inspection may require separate resolution as scan interference.

## Choose the correct disposition

Keep these claims distinct:

| Claim | Evidence needed |
|---|---|
| False positive | Why the reported vulnerable behavior does not exist in the tested context |
| Remediated vulnerability | Original issue, corrective deployment, and successful retest |
| Compensating control | The vulnerability remains, but a formally evaluated control addresses its risk |
| Incomplete reproduction | Missing conditions or evidence that still need investigation |

A successful code fix should be submitted as remediation rather than rewriting history as a false positive. A blocked demonstration is not automatically proof that no vulnerability exists. Likewise, Content Security Policy can reduce impact but should not be presented as a universal substitute for correcting unsafe output handling. [OWASP guidance on other XSS controls](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html#other-controls)

## Build a small, reproducible evidence packet

Include a written explanation and system-generated artifacts. A useful packet has:

```text
Finding and scan identifiers
Affected deployment version and endpoint
Exact reproduction conditions using synthetic inputs
Request and response artifacts, with secrets removed
Output context and technical explanation
Relevant configuration or code-path evidence
Capture time, collector, and method
Requested disposition and supporting retest
```

Explain any redactions so the reviewer understands what was removed and can request a secure alternative if it affects validation. Preserve originals in restricted evidence storage when appropriate. Hashing an artifact can help detect later changes, but does not prove that the original capture was complete or accurate.

Section 7.7 expects written supporting evidence with its collection context. It also requires disputes to be reevaluated for each scan period rather than automatically carried forward. Retain the ASV's conclusion and the evidence it references. [ASV Program Guide, Section 7.7](https://www.pcisecuritystandards.org/document_library/)

## Close the engineering work as well as the dispute

If the finding is confirmed, fix the affected output path, add a focused regression case, deploy it across relevant instances, and arrange the ASV rescan. If it is a false positive, preserve enough context to reproduce the conclusion after the next release.

Keep unresolved questions open until the ASV has a defensible disposition. The useful outcome is a report supported by technical evidence and an application whose behavior is understood, rather than a local exception label detached from the deployed code.
