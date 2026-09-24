# How to Build and Maintain PCI DSS Secure-Configuration Baselines with Documented Exceptions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Security, DevOps

Description: Create versioned hardening baselines for each system role, verify deployed settings, and distinguish benchmark deviations from unmet PCI DSS requirements.

---

A secure-configuration baseline should tell an engineer how to build a system and tell a reviewer how to determine whether that system still matches the approved design. A generic checklist copied into a shared folder rarely does either job well.

Build baselines around actual platform versions and operational roles, then connect each setting to deployment and verification.

## Define the scope of each baseline

PCI DSS v4.0.1 Requirement 2.2.1 calls for configuration standards covering all system components, addressing known vulnerabilities, aligning with accepted hardening standards or vendor recommendations, and updating as new vulnerabilities are identified. It also requires application and verification when new systems enter production, before or immediately after connection.

The [PCI DSS standard](https://www.pcisecuritystandards.org/document_library/) supplies the requirement; a benchmark supplies more detailed settings for a particular product. These are related but different documents.

Maintain separate profiles when roles differ meaningfully: a database server, an administrative workstation, and a container worker node should not inherit every setting identically. Include network appliances, managed service configurations, container images, and supporting security systems in the inventory.

Record the platform release, role, baseline version, owner, upstream guidance version, and associated deployment artifact.

## Translate external guidance into explicit decisions

Use an appropriate source such as the product vendor or the [CIS Benchmarks catalog](https://www.cisecurity.org/cis-benchmarks). Choose guidance for the operating system and product release you actually run.

For each setting, capture the expected state, rationale, implementation method, verification method, and applicability conditions. For example:

| Setting area | Expected decision | Verification |
|---|---|---|
| Default accounts | Remove, disable, or change defaults as applicable | Account and credential configuration |
| Unnecessary services | Only justified services enabled | Effective service and listener inventory |
| Administrative access | Approved secure protocols and restricted identities | Effective authentication and network policy |
| Logging | Required events reach the approved destination | Observed test events |
| Security agents | Required protections present and healthy | Agent inventory and policy state |

Avoid reducing the baseline to a scanner percentage. A high score can hide the one failed setting that exposes administrative access, while a low score may include checks that do not apply to the role.

## Build the baseline into delivery

Store configuration code and its review history in version control. Produce a deployment record that connects a released image or configuration package to the baseline version.

Use a staging environment to verify both security settings and essential application behavior. Tightening filesystem permissions or cryptographic settings can break backup agents, health checks, or external integrations; detect those effects before production rollout.

After deployment, inspect the effective runtime state. A configuration file can look correct while a service still runs with old values, an override changes the result, or a cloud policy takes precedence.

Capture the deployed artifact identity, relevant settings, check results, and unresolved deviations. Review evidence should reference system identifiers, not passwords or other sensitive configuration values.

## Make exceptions precise and temporary

A benchmark deviation needs a concrete explanation: what conflicts with the system's function, what exposure it creates, what alternative settings apply, who accepts responsibility, and when it will be reviewed or removed.

An illustrative record could contain:

~~~yaml
exception_id: CFG-204
system_role: payment-reporting-worker
baseline_version: linux-worker-2026-09
setting: organization-specific-hardening-check
reason: documented dependency incompatibility
scope: two identified worker instances
additional_controls: restricted ingress and dedicated service identity
owner: platform-team
expires_on: 2026-10-15
verification: linked change record and runtime checks
~~~

This record describes governance; it does not itself make an insecure setting compliant.

Distinguish three cases. A benchmark check may genuinely be inapplicable to a role. A different implementation may still meet the PCI requirement. Or the PCI requirement may remain unmet and require remediation or a formally valid assessment approach.

Do not label the third case a routine exception and close it.

## Treat insecure services explicitly

Requirement 2.2.5 addresses insecure services, protocols, or daemons that remain present: document the business justification and implement additional security features that reduce their risk.

That is a specific requirement, not permission to disregard stricter requirements elsewhere. For example, a documented legacy dependency does not nullify applicable requirements for strong cryptography.

When evaluating an exception, identify every affected PCI requirement and whether the proposed additional controls actually satisfy it. A generic statement that the network is internal is insufficient evidence.

## Maintain the baseline as vulnerabilities change

Connect vendor advisories and vulnerability management to baseline changes. A newly identified unsafe default may require updating both the image factory and existing systems.

Detect drift after emergency changes, administrator access, platform upgrades, and automated repairs. Route unapproved changes to an owner rather than automatically overwriting everything without understanding the operational impact.

Keep expired exceptions visible until they are resolved. A practical review packet contains the baseline, upstream references, applied versions, effective-state evidence, drift findings, and active exceptions.

The baseline then becomes an operating agreement between security and engineering: what the system must do, how it is built, and how deviations are discovered and corrected.
