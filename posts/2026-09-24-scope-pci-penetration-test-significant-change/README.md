# How to Scope a PCI DSS Penetration Test After a Significant Change

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PCI DSS, Security, Compliance

Description: Scope a PCI DSS penetration test after a significant change by mapping changed trust boundaries, affected attack paths, segmentation, and retest evidence.

---

A significant change can invalidate the assumptions behind your last penetration test. Moving checkout behind a new identity proxy, changing network segmentation, or replacing payment APIs can expose attack paths that did not exist when the annual report was written.

PCI DSS v4.0.1 Requirements 11.4.2 and 11.4.3 require internal and external penetration testing at least every 12 months and after significant infrastructure or application changes. A vulnerability scan is a separate activity and does not replace these tests. [PCI DSS v4.0.1, Requirements 11.3 and 11.4](https://www.pcisecuritystandards.org/document_library/)

## Classify the change using its security effects

Have the change owner document what changed, why, the deployed components, and the potential effect on account-data security. Consider new services, authentication paths, network routes, dependencies, storage locations, and external access.

Do not classify significance solely by lines of code or release size. A one-line trust-policy change can materially alter access to the cardholder data environment (CDE), while a large content-only update may not. Apply your documented methodology consistently and retain the rationale.

Attach before-and-after architecture and data-flow diagrams. Mark new connections and removed controls. Include supporting systems that can affect the changed application, such as deployment identities or management networks.

## Build an affected-path map

Start with entry points and follow them toward sensitive operations:

```text
Public checkout -> edge proxy -> identity integration -> payment API
Internal support -> admin interface -> privileged operation -> data store
Out-of-scope network -> segmentation boundary -> CDE service
```

For each path, identify the actor, starting privilege, allowed behavior, prohibited behavior, and changed controls. This creates a test scope grounded in the change rather than a generic list of IP addresses.

Include dependencies whose behavior may have changed indirectly. A new proxy can alter trusted headers, origin reachability, logging, and rate limiting. Testing only the new proxy's login page would miss those consequences.

## Align the scope with the documented methodology

Requirement 11.4.1 calls for a methodology covering the CDE perimeter and critical systems, internal and external testing, relevant application and network testing, segmentation validation, recent threats, and remediation handling. Results and remediation records must be retained for at least 12 months. [PCI DSS v4.0.1, 11.4.1](https://www.pcisecuritystandards.org/document_library/)

The change-focused engagement must be justified within that methodology. Do not assume every release requires an identical full retest, but do not use a narrow change ticket to exclude affected critical systems or attack paths. Record what is covered by the engagement and how the broader annual testing obligation remains satisfied.

Internal testing includes starting inside the CDE and from trusted and untrusted internal networks into it. External testing examines exposed perimeters and relevant critical systems accessible through public networks. Provide the tester the information and authorized access needed for those perspectives.

## Add segmentation tests when boundaries change

If segmentation reduces PCI scope, Requirement 11.4.5 requires testing at least every 12 months and after changes to segmentation controls or methods. Service providers have the additional six-month minimum under 11.4.6, also with change-triggered testing. [PCI DSS v4.0.1, 11.4.5 and 11.4.6](https://www.pcisecuritystandards.org/document_library/)

List the relevant source networks, destination systems, protocols, management interfaces, and isolation mechanisms. Test the boundary's effectiveness, including paths created by shared services and administrative access. “The firewall rule looks correct” is configuration evidence, not a substitute for testing whether isolation works.

## Agree on safe execution and independence

Use qualified testers with organizational independence; they do not have to be QSAs or ASVs. Define written authorization, targets, permitted methods, timing, production safeguards, emergency contacts, and stop conditions.

Prefer synthetic accounts and data where they support the objective. If staging is used for part of the work, document the production equivalence and what still requires production verification. A staging environment with different access controls cannot establish the security of those production controls.

Ensure testing occurs after the relevant significant change and that the report identifies the actual tested deployment. Testing an earlier build leaves an evidence gap.

## Close the change with findings and retests

Require an evidence-backed report mapping tested paths to findings, limitations, affected components, and remediation recommendations. Do not accept “no issues” without understanding coverage and constraints.

Correct exploitable vulnerabilities and weaknesses according to the risk assessment, then repeat penetration testing to verify corrections as required by 11.4.4. Link each correction and retest to the change record. [PCI DSS v4.0.1, 11.4.4](https://www.pcisecuritystandards.org/document_library/)

The final package should explain why the change was significant, what security assumptions it affected, how those assumptions were tested, and which evidence demonstrates that discovered weaknesses were corrected.
