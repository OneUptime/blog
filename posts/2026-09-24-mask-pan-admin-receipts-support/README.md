# How to Mask PANs Correctly in Admin Screens, Receipts, and Support Tools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Data Security, Access Control

Description: Mask PAN on the server, separate display rules from storage truncation, and verify receipts, exports, and privileged reveal workflows.

---

Mask PAN before it leaves the trusted service that is authorized to handle it. If the browser receives a full card number and merely replaces digits with asterisks, the number remains available in network responses, application state, developer tools, and possibly browser extensions.

Start with the smallest display that supports the task. A card brand and last four digits are often enough to identify a payment method or confirm a refund.

## Understand the display limit

PCI DSS Requirement 3.4.1 limits ordinary PAN display to the BIN and last four digits, with access to additional digits restricted to personnel with a legitimate business need. The BIN may be six or eight digits; do not assume “first eight” is correct for every card. [PCI SSC FAQ 1492](https://www.pcisecuritystandards.org/faqs/1492/) explains the distinction and the need for documented justification.

Treat that limit as a maximum, not a default target. A customer-support workflow that needs only the last four digits should not expose the BIN merely because the maximum permits it.

Also check applicable payment-brand and legal restrictions for receipts. [FAQ 1146](https://www.pcisecuritystandards.org/faqs/1146/) notes that these can be stricter than the PCI DSS display rule.

## Separate display masking from stored truncation

Masking hides digits in a displayed representation. Truncation permanently removes digits from the stored representation. Hiding a PAN on a screen does not protect an unencrypted full PAN stored in the database.

Likewise, a truncation format permitted for storage is not automatically the right display format. [PCI SSC FAQ 1091](https://www.pcisecuritystandards.org/faqs/1091/) gives brand- and PAN-length-dependent truncation formats; use it for the storage decision rather than extrapolating from a UI screenshot.

Keep a clear contract between services:

```text
ordinary support response:
  payment_method_id
  brand
  last4
  expiration, only if needed by the workflow

restricted PAN response:
  separate endpoint and permission
  explicit business justification
  auditable access decision
```

A token identifier is useful for joining support records. It avoids handing several tools different pieces of the PAN that could later be combined.

## Render from safe metadata

Where possible, build the UI from provider-supplied last-four metadata. A simple renderer should accept only that field, rather than accepting a full PAN and assuming every caller uses it correctly.

```python
import re


def card_label(last4: str) -> str:
    if not isinstance(last4, str) or not re.fullmatch(r"[0-9]{4}", last4):
        raise ValueError("Expected exactly four display digits")
    return f"Card ending in {last4}"
```

This function validates a presentation input; it does not establish that the surrounding system is outside PCI scope. The service receiving the metadata must still be assessed for its permissions and connections.

Keep full PAN out of HTML attributes, hidden inputs, accessibility labels, tooltip text, client-side stores, and diagnostic messages. Check downloadable CSV files and print templates separately from the interactive page.

## Build a deliberate reveal workflow

Some roles may need more than the ordinary display. Document the business reason, obtain management approval, and grant a distinct server-enforced permission. Avoid letting a general “administrator” role reveal card data simply because it can manage users.

Require the operator to identify the relevant case or operation. Recheck authorization on every reveal request. Record the requester, record identifier, time, purpose, and outcome in an audit event without copying the PAN into that event.

Limit response caching and prevent routine analytics or session recording from capturing the revealed value. Consider shorter display durations and additional authentication where they reduce the workflow's risk. These are engineering safeguards, not substitutes for the required access justification.

## Audit every output channel

Build a matrix of role and output type: support agent screen, customer receipt, finance report, processor export, email template, PDF, CSV, and clipboard action. Test ordinary users, privileged users, expired sessions, and direct API calls.

Inspect both what appears visually and what the response contains. A browser screenshot alone cannot demonstrate server-side masking. Verify that a failed authorization does not return the sensitive fields with a hidden or disabled presentation flag.

Review combinations of representations. Different truncation formats, hashed PAN, and partial values can make reconstruction easier when joined. [FAQ 1117](https://www.pcisecuritystandards.org/faqs/1117/) explains why access to multiple formats changes the scope analysis.

Complete the work with one centrally enforced display policy and explicit exceptions. That gives support, finance, and engineering the same answer about which digits a particular role may see, including when the information leaves the primary application.
