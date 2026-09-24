# How to Document a PCI DSS Customized Approach with a Controls Matrix and Testing Plan

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PCI DSS, Risk Management, Compliance

Description: Document a PCI DSS customized approach with a requirement-specific controls matrix, risk analysis, independent assessment, and ongoing effectiveness evidence.

---

The PCI DSS customized approach allows an entity to meet an eligible requirement's objective with a different control design. It also requires the entity to demonstrate why that design works. A short exception statement or a generic risk acceptance does not provide that demonstration.

PCI SSC's June 2026 guidance emphasizes mature risk management, complete documentation, and assessor independence. It distinguishes customized controls from compensating controls used when legitimate constraints prevent meeting a defined requirement. [PCI SSC customized-approach guidance announcement](https://blog.pcisecuritystandards.org/pci-ssc-publishes-new-guidance-on-compensating-controls-and-the-customized-approach)

## Check eligibility before designing the alternative

Identify the requirement and its published Customized Approach Objective. Some requirements are ineligible, including quarterly external ASV scanning under 11.3.2. A desired alternative cannot create eligibility where the standard excludes it.

The customized approach is documented in a Report on Compliance by a QSA or ISA under the relevant program rules. Entities completing an SAQ cannot use it within the SAQ; they can choose a ROC assessment instead, subject to their compliance-accepting entity's requirements. [PCI DSS v4.0.1, Appendix D](https://www.pcisecuritystandards.org/document_library/)

Record the systems using the customized control and those continuing to use the defined approach. If different systems use compensating controls for the same requirement, document those instances separately. Do not blend the approaches into one unexplained exception.

## Build the controls matrix around observable behavior

Use the current PCI SSC sample templates as a completeness checklist. The specific layout is optional, but the required information is not. The August 2024 revision is available in the official library. [PCI SSC customized-approach templates](https://www.pcisecuritystandards.org/document_library/)

Your working matrix should answer these questions:

| Area | Information to document |
|---|---|
| Identity | Control identifier, requirement, published objective |
| Implementation | What operates, where, how, and on which population |
| Ownership | Accountable owner and operating teams |
| Timing | Continuous behavior, schedule, and event triggers |
| Security argument | How the objective and equivalent protection are achieved |
| Verification | Tests performed and resulting evidence |
| Maintenance | Drift detection, failure response, and effectiveness review |

Avoid a product name as the entire implementation description. Explain inputs, decision logic, enforcement points, dependencies, and failure behavior. State what an attacker would have to bypass and what evidence would reveal that bypass.

## Write the targeted risk analysis

Requirement 12.3.2 calls for a TRA for each requirement met using the customized approach, senior-management approval of the documented evidence, and performance of the analysis at least every 12 months. This is different from choosing a permitted activity frequency under 12.3.1. [PCI DSS v4.0.1, 12.3.2](https://www.pcisecuritystandards.org/document_library/)

Describe the harm the requirement prevents, the elements of the defined approach you are replacing, and the proposed controls. Compare likelihood and impact under the proposed implementation with the defined approach. Include failure modes: missing telemetry, privilege escalation, stale policies, bypass paths, and unavailable dependencies.

Document the assumptions behind the comparison. If protection depends on complete asset enrollment, include evidence that enrollment is enforced and gaps are detected. If it depends on a person responding within a stated time, provide staffing and response evidence. A theoretical feature is not an operating control.

## Separate internal testing from assessor testing

Create an internal test plan that makes the security argument falsifiable. For every claim, define an authorized test, expected behavior, required observation, and pass criterion. Include negative tests and degraded operation, not only the normal path.

For example, if the design claims unauthorized policy changes cannot persist undetected, test a controlled unauthorized change in an approved environment, inspect the alert, measure response, and verify restoration. Also test what happens when the telemetry channel fails. Do not run potentially disruptive tests against production without the appropriate operational authorization.

The assessor independently develops testing procedures and evaluates the implementation. Your matrix and internal results support that work; they do not replace it. An assessor involved in designing or implementing the control cannot assess that same control, as the 2026 guidance reiterates. [PCI SSC guidance on independence](https://blog.pcisecuritystandards.org/pci-ssc-publishes-new-guidance-on-compensating-controls-and-the-customized-approach)

## Operate the evidence after the assessment

Version the matrix, TRA, configuration, test results, and approvals together. Link architecture changes to a review of the security argument. Track drift and control failures, including the time to detect and correct them.

Before declaring the package ready, ask an independent engineer to explain the objective, implementation, assumptions, and failure response using only the documents. Missing context should become a documentation or control improvement. A customized approach remains credible when its protection can be demonstrated repeatedly as the environment changes.
