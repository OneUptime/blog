# How to Decide Which PCI DSS User Accounts Still Need Password Rotation After MFA Rollout

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Authentication, MFA

Description: Decide password-rotation applicability per access path after MFA rollout, including connected systems, service-provider customers, fallback logins, and machine accounts.

---

An MFA rollout can remove the periodic password-change requirement for covered user access, but “MFA enabled for the company” is not a sufficient assessment conclusion. A password-only local login, management interface, or recovery path can survive behind a successful identity-provider deployment.

Evaluate the authentication implementation for each in-scope system component and account population. Keep the decision separate from password length, account lifecycle, and response to compromised credentials.

## Start with the correct requirement

[PCI SSC FAQ 1590](https://www.pcisecuritystandards.org/faqs/1590/) explains that Requirements 8.3.9 and 8.3.10.1 apply to password-only authentication, and do not apply to in-scope system components where MFA is used. For applicable single-factor password access, the defined approach permits either a change at least every 90 days or dynamic analysis of account security with automatic real-time access decisions.

Requirement 8.3.10.1 concerns service-provider customer access. Requirement 8.3.9 concerns other applicable user access, including service-provider personnel. Since the March 2025 effective date has passed, do not use the older customer guidance-only requirement as a substitute.

This is an applicability analysis, not a general claim that long-lived passwords are always safe. Your organization can maintain stricter policies where its risks or obligations justify them.

## Build an access-path inventory

Use one row for each materially different implementation:

| Population and path | Observed authentication | Decision to investigate |
| --- | --- | --- |
| Staff through enforced identity-provider policy | Password plus independent second factor | MFA coverage evidence |
| Local appliance administrator | Password only | Rotation or qualifying dynamic control |
| Service-provider customer portal | Password only | Requirement 8.3.10.1 |
| Automated reconciliation account | Workload credential | Application/system-account controls |
| Emergency recovery login | Depends on recovery design | Explicit exception and credential controls |

Add system owner, scope classification, enforcement point, bypass routes, last test, and assessment rationale. A group being targeted by a conditional-access policy is useful configuration evidence, but test whether the application actually requires that policy on every relevant route.

Include connected-to and security-impacting systems outside the CDE. PCI SSC's [FAQ on single-factor access outside and within the CDE](https://www.pcisecuritystandards.org/faqs/1591/) explains why these password-only cases can still exist. It also notes that access to an individual component inside the CDE may use a password after MFA was used to enter the CDE.

Therefore, a gateway screenshot alone does not settle how downstream password-only authentication is classified. Document the full access architecture and the control applied to the component being assessed.

## Prove MFA enforcement

Use a representative test identity for each access population and attempt the normal login plus alternate routes: direct URLs, SSH, local console where applicable, old clients, service-provider support interfaces, and password recovery.

Check whether “remember this device,” trusted-location exclusions, existing sessions, or administrator exemptions alter the security boundary. Their effect depends on the implementation; record what is actually required before protected access is granted.

For required MFA, verify independent factor types, replay resistance, completion of all factors before access, and controlled, time-limited bypasses under [PCI DSS v4.0.1 Requirement 8.5.1](https://www.pcisecuritystandards.org/document_library/). Enrollment in MFA is not proof that MFA was enforced for the tested access.

Retain sign-in evidence identifying the user, target, authentication method, policy result, and time. Avoid storing passwords, OTPs, or recovery secrets in the evidence packet.

## Evaluate the dynamic-analysis alternative honestly

Where passwords remain the only factor, a monitoring dashboard is insufficient to demonstrate the alternative to periodic changes. The implementation must analyze account security dynamically and automatically determine resource access in real time.

Write down the signals used, the decision point, the resulting action, and the resources covered. Test a supported risky scenario with an approved test account and verify that access actually changes. A weekly review of suspicious logins or an alert awaiting manual investigation is a different control.

Keep uncovered systems on the applicable rotation policy while the dynamic approach is being evaluated. Do not switch a directory-wide expiration setting based on a feature purchase that has not been deployed to every affected resource.

## Keep other credential controls intact

MFA does not exempt passwords used as authentication factors from the length and complexity requirements in 8.3.6. It also does not eliminate identity verification for resets, protection of authentication factors, or instructions to change suspected compromised passwords.

Automated application and system accounts need their own review under Requirement 8.6, including risk-based credential changes and changes on suspected compromise under 8.6.3. Do not force a machine account into a human MFA classification or infer that removing staff password expiration changes its obligations.

Finally, obtain a documented applicability decision per population, preserve unresolved paths, and assign an owner for drift detection. Revisit the decision when an application adds a local login, a vendor changes federation behavior, or an emergency account is used.
