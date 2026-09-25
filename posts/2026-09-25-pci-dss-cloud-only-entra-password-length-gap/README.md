# How to Address PCI DSS Password-Length Gaps in Cloud-Only Entra ID

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Microsoft Entra ID, Authentication

Description: Assess cloud-only Entra password-policy gaps against PCI DSS, enforce suitable passwordless access, and document remaining paths without assuming an eight-character exception.

---

A cloud-only Microsoft Entra deployment can accept a long password without enforcing the PCI DSS minimum on every password creation and reset path. Asking staff to choose longer passwords does not establish a system-enforced control.

Treat the issue as a mismatch between the authentication architecture and the applicable requirement. First verify the current Microsoft capability; then choose and test a design that closes the gap.

## Establish what Entra actually enforces

Microsoft's [combined password-policy documentation](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-password-ban-bad-combined-policy) states that cloud-managed passwords have an eight-character minimum and a 256-character maximum. Most settings cannot be changed. Complexity generally requires three of four character categories, which does not necessarily require a number in every password.

Record the documentation date, account type, and relevant tenant behavior. Distinguish cloud-only users from accounts synchronized from Active Directory, external users, local operating-system accounts, and workload identities. Changing an on-premises policy has no effect on a genuinely cloud-only account that does not use that authority.

A banned-password list addresses weak choices, but it is not a supported mechanism for implementing an arbitrary minimum length. Avoid scripts that inspect plaintext passwords or attempt to detect length from password hashes.

## Map the precise PCI DSS gap

[PCI DSS v4.0.1 Requirement 8.3.6](https://www.pcisecuritystandards.org/document_library/) requires at least 12 characters for applicable passwords, with an eight-character allowance if the system does not support 12, and requires numeric and alphabetic characters.

Do not automatically equate “the minimum cannot be configured” with “the system does not support 12 characters.” Entra accepts longer passwords. The standard's exception should not be self-declared from a portal limitation; document the technical facts and obtain the assessment determination for the implementation.

Likewise, MFA changes the applicability of the periodic-change requirements described in [FAQ 1590](https://www.pcisecuritystandards.org/faqs/1590/). That FAQ does not remove password-length requirements whenever a password is one factor in MFA.

Include password history and reset behavior in the broader review. Fixing the most visible length gap should not obscure other differences between the platform policy and the applicable control set.

## Evaluate an enforced passwordless design

Microsoft's [PCI DSS Requirement 8 guidance](https://learn.microsoft.com/en-us/entra/standards/pci-requirement-8) directs organizations toward passwordless methods and marks several password-specific controls not applicable in that context. Read the table with that architectural assumption. It is not a declaration that every tenant using password authentication automatically meets those requirements.

Select a supported authentication method suited to the access, such as appropriately configured FIDO2 passkeys or Windows Hello for Business. Inventory the relying applications and confirm they can enforce the chosen method. A passwordless registration campaign does not stop users selecting another sign-in option.

Use [Conditional Access authentication strengths](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-strengths) to require the allowed method combination for the relevant users and resources. Confirm licensing and platform prerequisites, pilot the policy, inspect report-only results, and then enforce it with a tested recovery process.

For non-console access into the cardholder data environment (CDE), including administrative access, and for external remote network access that could access or impact the CDE, verify compliance with Requirements 8.4.1–8.4.3 and their applicability notes. Requirement 8.4.2 has an exception for accounts authenticated only with phishing-resistant factors; [FAQ 1596](https://www.pcisecuritystandards.org/faqs/1596/) confirms that 8.4.1 and 8.4.3 still require an additional factor.

## Test the routes users actually take

Create a matrix before changing production enforcement:

| Route | Test objective |
| --- | --- |
| Browser sign-in to protected application | Password plus an unapproved factor cannot satisfy the required strength |
| Desktop and command-line client | The same resource policy is enforced |
| Direct application or local login | Federation cannot be bypassed |
| Enrollment and recovery | Identity is verified before a replacement factor becomes usable |
| Emergency access | Recovery works with documented, controlled permissions |

Use test accounts and synthetic application data. Check existing sessions as well as fresh authentication, and verify the sign-in logs show the policy and method that authorized the resource.

Some applications maintain independent passwords even when Entra supplies SSO. Review those stores and fallback forms individually. Protecting the tenant login does not change a database administrator password, a jump-host local account, or a vendor's separate support login.

## Resolve residual password paths explicitly

If a required application cannot use the chosen passwordless design, document alternatives: a supported authentication authority that enforces the required password policy, an application upgrade, or an architectural change that removes the password-based access.

Where a legitimate constraint remains, evaluate the appropriate PCI DSS assessment route with the assessor and compliance-accepting entity. A customized approach or compensating-control process has its own eligibility, documentation, and testing obligations. Extra MFA or a strong written password policy is not automatically an accepted substitute.

Maintain a closure record for each path: previous gap, new enforcement, test result, owner, and remaining exception. Recheck new applications, policy exclusions, and recovery changes so a later convenience setting cannot reintroduce the original password gap.
