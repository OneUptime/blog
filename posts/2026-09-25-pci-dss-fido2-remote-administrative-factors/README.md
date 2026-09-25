# How to Validate FIDO2 Authentication Factors for PCI DSS Remote and Administrative Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Authentication, MFA

Description: Validate FIDO2 possession and user verification, enforce the appropriate PCI DSS MFA rules, and test enrollment, fallback, remote access, and administrative sessions.

---

A FIDO2 login can provide phishing resistance and multiple authentication factors in one interaction. It can also be configured in ways that prove possession without verifying the individual through a PIN or biometric. Counting prompts or security-key touches is therefore a poor way to assess MFA.

Validate the authenticator, relying-party policy, enrollment process, and fallback paths together. The same product can support several authentication modes with different properties.

## Map the access to the right requirement

Use [PCI DSS v4.0.1](https://www.pcisecuritystandards.org/document_library/) to distinguish three access cases:

| Requirement | Relevant access |
| --- | --- |
| 8.4.1 | Non-console access into the CDE by personnel with administrative access |
| 8.4.2 | Access into the CDE, subject to its applicability notes |
| 8.4.3 | Remote network access from outside the entity's network that could access or impact the CDE |

[PCI SSC FAQ 1595](https://www.pcisecuritystandards.org/faqs/1595/) permits FIDO2-compliant synced passkeys as phishing-resistant authentication under the 8.4.2 applicability note. [FAQ 1596](https://www.pcisecuritystandards.org/faqs/1596/) makes clear that 8.4.1 and 8.4.3 still require an additional factor, such as a PIN, password, or biometric.

That additional factor can be part of a correctly configured multi-factor authenticator. The requirement does not mean every FIDO2 login must add a separate website password screen. Verify the factors actually used and their protection rather than drawing conclusions from the interface.

## Distinguish presence from verification

Possession of the private credential provides the “something you have” property. A PIN can supply knowledge; a biometric can supply inherence. Merely touching a key to indicate presence does not establish either of those additional factors.

The [W3C WebAuthn specification](https://www.w3.org/TR/webauthn-3/#sctn-authentication-factor-capability) distinguishes user presence from user verification and explains how authenticators can be multi-factor capable. A signed user-verification flag is part of the evidence, but it must be interpreted through the complete registration and authentication protocol.

For a custom relying party, use a maintained WebAuthn library. Require user verification for the relevant operations, validate it server-side, and follow the specification's enrollment trust requirements, including the handling of initial user verification. A client-side `userVerification: "required"` setting alone is not a complete server implementation.

For an identity-provider deployment, export the method policy and obtain documentation explaining how its authenticator flow enforces the required verification. Do not assume every credential bearing a FIDO label behaves identically.

## Establish the individual binding

Document how the initial authenticator is registered to the employee or vendor. Verify the identity proofing and approval path, who may reset authentication methods, and whether a new credential can be added using weaker recovery access.

Inventory permitted authenticator models and relevant capabilities. For synced credentials, examine the account and device protections surrounding synchronization and recovery. For shared workstations, verify that another person's biometric or knowledge of a shared device PIN cannot become an undocumented route into the account.

Preserve evidence of method registration and changes without collecting private keys, PINs, or biometric data. The aim is an accountable binding between an individual and an accepted authenticator.

## Test the complete login decision

Build an approved test matrix using non-production accounts:

| Scenario | Expected result for the protected path |
| --- | --- |
| Enrolled credential with successful required verification | Access subject to authorization |
| Presence-only authenticator | Cannot satisfy a policy requiring the extra factor |
| Verification canceled or failed | No protected access |
| Replayed authentication response | Rejected |
| Unapproved origin or relying-party context | Rejected by the validated protocol |
| Alternate password or recovery route | Cannot silently bypass the required policy |

Where a managed platform does not expose protocol-level test controls, use its supported testing methods and supplier evidence. Do not modify production authentication traffic or enroll rogue authenticators to manufacture evidence.

Inspect logs for the individual, target resource, actual method, policy decision, and timestamp. Test a fresh session, an existing session, a direct administrative endpoint, and the relevant remote-access client. Prove that the factor result governs the resource, not just a landing page.

## Review bypass and failure behavior

Requirement 8.5.1 addresses replay resistance, different factor types, successful completion before access, and tightly controlled MFA bypass. Document any permitted bypass with management authorization and a limited period. Test restoration of the normal policy after the exception ends.

A help-desk recovery flow that always falls back to a password can undermine the carefully configured primary path. Lost devices, unavailable identity providers, vendor support access, and emergency administration belong in the same review.

Finish with an evidence packet linking each access case to the authenticator mode, factor explanation, enforced policy, enrollment controls, and observed tests. That gives the assessor a concrete implementation to evaluate instead of a statement that the organization “uses passkeys.”
