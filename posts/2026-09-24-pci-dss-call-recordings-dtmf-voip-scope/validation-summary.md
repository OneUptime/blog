# Validation Summary: How to Scope Call Recordings, DTMF, and VoIP for PCI DSS and Reduce Card Data

## Status
validated

## Post Type
Technical guide. Although there are no executable code examples, commands, or configuration snippets, the post contains implementation details about telephony architecture, recording suppression, failure handling, and validation procedures, so it qualifies for technical review.

## Technologies Covered
- PCI DSS v4.0.1, PAN protection, and sensitive authentication data (SAD).
- VoIP, session border controllers, PBX, and IVR payment systems.
- DTMF audio and RTP telephone-event payloads.
- Call recording, automated pause and resume, hosted payment capture, and payment-provider transfers.
- Transcription, desktop recording, diagnostics, backups, retention, and third-party responsibilities.

## Sources Consulted
- [PCI SSC FAQ 1153: How does PCI DSS apply to VoIP?](https://www.pcisecuritystandards.org/faqs/1153/) — inbound, internal, and external VoIP scope boundaries.
- [PCI SSC FAQ 1210: Are audio/voice recordings permitted to contain sensitive authentication data?](https://www.pcisecuritystandards.org/faqs/1210/) — June 2025 guidance on recording prevention, deletion upon authorization, and compensating controls.
- [PCI SSC Document Library](https://www.pcisecuritystandards.org/document_library/) and [PCI DSS overview](https://www.pcisecuritystandards.org/standards/pci-dss/) — verified the linked official resources.
- [PCI DSS v4.0.1, Requirements and Testing Procedures, June 2024](https://issues.redhat.com/secure/attachment/13274529/PCI-DSS-v4_0_1.pdf) — PCI SSC-authored standard, consulted through a hosted copy because the official PDF download returned HTTP 403. Checked applicability, storage protection, access and logging requirements, and third-party responsibility requirements.
- [PCI SSC: Protecting Telephone-Based Payment Card Data, November 2018](https://www.pcisecuritystandards.org/documents/Protecting_Telephone_Based_Payment_Card_Data_v3-0_nov_2018.pdf) — DTMF masking, hosted collection, recording suppression, and deployment-dependent scope.
- [IETF RFC 4733: RTP Payload for DTMF Digits, Telephony Tones, and Telephony Signals](https://www.rfc-editor.org/rfc/rfc4733) — digit event encoding and transport distinct from audible tone samples.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified that the author link resolves to the intended profile.

## Issues Found
- The compensating-control paragraph described controls merely restricting access and queries. FAQ 1210 requires controls preventing SAD access and call recording queries. Updated that wording and made the same sentence explicit about annual and significant-change risk assessments, applicable SAD protections, and annual PCI DSS assessment validation. This preserves the paragraph structure while accurately summarizing the FAQ's minimum process.

## Review Notes
- FAQ 1153 supports the stated inbound scope boundary; outsourcing does not eliminate the merchant's responsibility to verify provider coverage.
- FAQ 1210 confirms both the June 2025 date and Requirement 3.3.1 reference. Encryption does not make post-authorization CVV storage permissible as an ordinary payment workflow.
- RFC 4733 supports the warning that muting audible tones does not necessarily remove machine-readable digit events. Telephone-event payloads are transported using RTP; the post does not incorrectly claim that they must use a separate signaling connection.
- The three architectures describe intended reductions rather than guaranteed scope exclusions. The warning about components that handle account data or affect its security is appropriate.
- Application-driven suppression, confirmation of recorder state, failure-case testing, and inspection of downstream artifacts are sound engineering recommendations. They are not presented as verbatim PCI DSS mandates.
- The 2018 telephone-payment supplement is supporting architectural guidance, not a replacement for the v4.0.1 standard or the updated FAQ. Its historical requirement numbering should not be substituted for current requirements.
- All links in the post were checked. The document-library link is a valid official landing page rather than a direct PDF link.
- No executable examples required testing. No live telephony environment was supplied, so this review validates the guidance rather than any deployed system's compliance or scope reduction.
