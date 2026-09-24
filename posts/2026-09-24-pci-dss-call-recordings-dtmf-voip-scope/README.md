# How to Scope Call Recordings, DTMF, and VoIP for PCI DSS and Reduce Card Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Security, Networking

Description: Trace spoken card data and DTMF across telephony systems, prevent sensitive authentication data from being recorded, and validate payment-call scope reduction.

---

A call can produce much more than an audio file. Payment information may also appear in DTMF events, agent screen recordings, transcripts, troubleshooting captures, and quality-assurance exports. Suppressing one recorder does not establish that the rest of the call path is free of card data.

Begin by mapping each representation of the payment details and each system that can receive it.

## Draw the voice and data paths together

Include the carrier handoff, session border controller, PBX, IVR, agent endpoint, recording service, payment application, transcription service, and archival destination. Mark where the caller speaks a PAN and where keypad input becomes machine-readable digits.

DTMF can travel as audio or as telephone-event signaling. A design that mutes audible tones may still expose digits to another component. Ask the telephony provider to identify the handling of both forms, including failure and fallback routes.

PCI SSC [FAQ 1153](https://www.pcisecuritystandards.org/faqs/1153/) explains that VoIP carrying payment account data is subject to applicable PCI DSS controls. For inbound calls, the merchant's scope begins when the traffic reaches its infrastructure; it does not extend backward into infrastructure the caller controls.

Record the security responsibilities for outsourced call handling as well. A provider's compliance evidence must cover the actual service and implementation you use.

## Separate PAN from sensitive authentication data

A PAN may be stored for a justified purpose if applicable protections are met. Card verification codes such as CVV are sensitive authentication data (SAD), with a different rule.

PCI SSC [FAQ 1210, updated June 2025](https://www.pcisecuritystandards.org/faqs/1210/), states that retaining these codes in digital audio after authorization violates Requirement 3.3.1, even if encrypted. The FAQ prioritizes suppressing the data during collection and immediate secure deletion if prevention is not possible.

It also describes a compensating-control process when legitimate technical or business constraints prevent secure deletion. That involves documented justification, risk assessments annually and after significant changes, securing SAD under applicable PCI DSS requirements, controls preventing SAD access and call recording queries, and validation during annual PCI DSS assessments. It is not a blanket exemption for recordings that are difficult to search, nor permission to retain CVV for convenience.

Treat any such constraint as an assessment issue requiring a defensible resolution. Do not build a routine payment process around keeping SAD.

## Choose where to remove card data

Three architectures deserve different tests:

| Architecture | Intended reduction | Critical verification |
|---|---|---|
| Recorder pause and resume | Keeps payment details out of a recording | Every recorder and transcription path actually pauses |
| DTMF suppression with hosted payment capture | Prevents agents and downstream systems receiving digits | Digits cannot be reconstructed from any delivered stream |
| Transfer to a payment provider's IVR | Moves collection into the provider environment | Merchant bridges, recorders, and fallback flows do not still receive data |

These are design patterns, not automatic scope determinations. Components that handle account data or can affect its security may remain in scope.

For pause and resume, prefer an application-driven state change with acknowledgement from the recording system. A button click without confirmation is weak evidence that suppression happened. Decide how the system behaves when the recorder cannot confirm the pause: blocking the payment segment is safer than silently continuing.

Avoid relying on agents to remember every suppression step during a busy call.

## Test a complete call, including failures

Create a test matrix using synthetic payment details from your payment provider's test environment. Exercise successful payments, declined payments, retries, transfers, supervisor conferences, hold and resume, disconnections, and recorder outages.

For each case, inspect the artifacts actually retained:

- Primary and secondary audio recordings.
- Agent desktop recordings and screenshots.
- IVR event logs and DTMF-related diagnostics.
- Transcripts, search indexes, summaries, and exports.
- Backup and recovery copies of those artifacts.

Compare timestamps across the payment application and recorder to verify the whole collection window is suppressed. Include the caller starting to speak details before the payment workflow begins. Give agents a clear procedure for interrupting unsolicited disclosure and routing it into the approved payment flow.

Confirm that test traffic reaches the same integrations and storage destinations as ordinary calls. A sandbox that bypasses transcription cannot validate production transcription behavior.

## Control permitted recordings throughout their lifecycle

For any retained recording containing PAN, document the business purpose, access roles, encryption, retention, disposal, and export restrictions. Use a reference ID in support tickets instead of attaching the recording.

The [PCI DSS v4.0.1 standard](https://www.pcisecuritystandards.org/document_library/) supplies the broader storage, access, logging, and third-party requirements; telephony suppression addresses only part of that control set.

Monitor changes to recording policies, transcription subscriptions, and payment routing. An apparently harmless quality-assurance integration can introduce a new storage location.

Finally, keep a reviewed call-flow diagram, provider responsibility matrix, configuration evidence, test results, and remediation records. Those artifacts make the scope decision explainable and help the next telephony change preserve the same protection.
