# How to Keep an Embedded Payment iFrame Eligible for SAQ A

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Web Security, JavaScript

Description: Keep provider-hosted payment fields isolated, satisfy the current SAQ A script eligibility criterion, and test integration changes that can expand scope.

---

An iframe can support SAQ A eligibility when the compliant payment provider supplies the payment collection elements and the merchant meets the remaining criteria. The important property is who delivers and handles those elements, not whether a border or provider logo appears around the form.

PCI SSC's [FAQ 1438](https://www.pcisecuritystandards.org/faqs/1438/) distinguishes provider payment elements inside the iframe from merchant content outside it. Use that distinction to review the integration before adding custom validation, analytics, or error recovery.

## Establish a supported integration baseline

Start from the provider's current embedded-checkout documentation. Record the SDK version or supported loading method, iframe origins, initialization options, and required browser security settings. Keep a copy of the integration instructions relevant to the deployed version in your evidence repository.

Build a simple responsibility table:

| Function | Expected owner | Evidence to inspect |
| --- | --- | --- |
| PAN and verification-code fields | Provider | Browser frame origin and provider documentation |
| Card-data validation | Provider component | Callback schemas and SDK behavior |
| Payment-method reference | Provider generates; merchant stores | API schema and database model |
| Cart, delivery details, order total | Merchant application | Server-side validation and authorization |
| Parent-page scripts | Merchant and approved suppliers | Script inventory and change controls |

Styling the surrounding merchant page does not require moving sensitive inputs into merchant HTML. Use the provider's supported appearance options instead of copying its payment form markup.

## Verify that raw card data stays inside the provider boundary

Inspect a test transaction with browser developer tools and provider-approved synthetic data. Check which origin hosts every card field, where submissions go, and what values reach parent-page callbacks.

Search your application code for card-number inputs, payment-field serializers, request-body logging, and listeners that forward arbitrary messages from the iframe. For cross-origin messaging, validate the exact expected origin and message structure; accept only the documented fields your application needs.

Review unusual states. An iframe-loading failure must not reveal a merchant-owned emergency card form. A custom “retry payment” panel must still use the provider component. A mobile layout must not substitute ordinary inputs simply because the embedded form renders badly.

## Address the current script eligibility criterion

SAQ A changed in January 2025. Its individual questions for payment-page script management and change detection were removed, and a script-attack eligibility confirmation was added. This change did not remove the underlying controls from PCI DSS. See the [PCI SSC announcement](https://blog.pcisecuritystandards.org/important-updates-announced-for-merchants-validating-to-self-assessment-questionnaire-a).

For embedded forms, [FAQ 1588](https://www.pcisecuritystandards.org/faqs/1588/) describes two ways to support that confirmation: suitable protective techniques, or qualifying assurance from the compliant provider that its correctly implemented solution protects against the relevant script attacks. Techniques associated with Requirements 6.4.3 and 11.6.1 are examples rather than the only possible approach.

Translate the chosen approach into deployable controls. Keep an authorized inventory of scripts on the parent page, remove unnecessary tag-manager and analytics access, restrict who can publish changes, and monitor changes that could replace the iframe or alter the payment journey.

A content security policy can help constrain resources, but one policy header is not evidence that every attack path is addressed. Likewise, same-origin browser isolation does not prevent a malicious parent script from displaying a fake form over the genuine one.

## Obtain specific provider evidence

If relying on provider confirmation, record the named product, integration mode, relevant configuration, and implementation instructions. A generic statement that the provider is PCI compliant does not explain whether the protection applies to your embedded form.

Compare your implementation against the conditions. Custom scripts, unsupported nesting, proxying provider content, or disabling security options can make a previously relevant assurance inapplicable. Route these changes through a review that explicitly checks the SAQ A assumptions.

Keep the provider's AOC and a responsibility matrix alongside this record. The merchant still needs evidence for controls it operates, including access management for systems that publish the checkout page.

## Test and maintain the boundary

Create a release check covering all checkout templates, locales, devices, retry screens, and experiments. Confirm the expected frame origins and absence of merchant card inputs. Use a controlled staging exercise to verify that an unauthorized script or changed iframe destination triggers the chosen monitoring process.

Do not forget external scanning. PCI SSC's [June 2026 FAQ 1604](https://www.pcisecuritystandards.org/faqs/1604/) explicitly includes merchant pages containing provider iframes in SAQ A ASV-scan applicability, including nested iframe arrangements.

The resulting evidence packet should explain field ownership, provider coverage, script protection, scan coverage, and change review. That packet is what makes the eligibility decision repeatable after the next checkout redesign.
