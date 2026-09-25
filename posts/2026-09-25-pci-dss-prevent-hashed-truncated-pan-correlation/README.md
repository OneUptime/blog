# How to Prevent Correlation Between Hashed and Truncated PAN Values Under PCI DSS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Data Security, Cryptography

Description: Map join paths between hashed and truncated PANs, implement managed keyed hashing and separation, and test exports, lookup services, and multiple truncation formats.

---

A truncated PAN and a hash can each look safe in isolation while their combination exposes a much smaller search problem. The risk becomes especially concrete when a customer identifier, transaction reference, or timestamp makes it easy to match the two representations.

Review this as a data-flow and authorization problem. A different database table does not create meaningful separation if the same analyst account can query both tables or export them into the same warehouse.

## Identify the requirement and the actual data

[PCI SSC FAQ 1308](https://www.pcisecuritystandards.org/faqs/1308/) explains the additional controls required when hashed and truncated versions of the same PAN, or different truncation formats, coexist. Its examples include segmentation, separate access, avoiding cross-references, secret salts, and monitoring. It explicitly recognizes correctly managed keyed cryptographic hashing under Requirement 3.5.1.1 as a valid additional control.

Those examples are not a universal checklist where selecting one arbitrary item guarantees compliance. The implementation must prevent reconstruction in the actual environment. Secret salt examples also do not remove the current requirement for keyed cryptographic hashing when hashing is used to render PAN unreadable.

Confirm that the value called “truncated” really has digits permanently removed. A screen that displays asterisks while its API returns the full PAN is masking, as explained by [FAQ 1146](https://www.pcisecuritystandards.org/faqs/1146/).

## Draw the join graph

Inventory each representation and the routes connecting it to others:

| Location | Representation | Potential join path |
| --- | --- | --- |
| Fraud service | Managed keyed hash | Payment reference |
| Support database | Limited display digits | Customer and payment reference |
| Analytics export | Copied support fields | Customer identifier |
| Legacy reconciliation store | Historic unkeyed hash | Batch and row reference |

Add replicas, backups, support exports, logs, and incident attachments. Include administrative identities, data-engineering jobs, and key-service permissions. A privileged service that can read a digest, retrieve display digits, and invoke a hashing endpoint deserves particular attention.

Use synthetic records to trace one payment across the graph. List each place where an identifier permits a join, including indirect joins through customer records. Renaming `payment_id` to `external_reference` does not remove the relationship.

## Reduce the information being retained

Ask which operation requires each representation. Support staff may only need a processor reference and last-four display value. An aggregate report may need no card identifier at all. Removing an unnecessary dataset also removes its replicas, exports, access reviews, and deletion burden.

Standardize permitted truncation formats for each use case, following the relevant PAN lengths and payment-brand rules. [FAQ 1117](https://www.pcisecuritystandards.org/faqs/1117/) warns that different truncation formats can expose additional original digits when combined. Two independently approved formats can still create an unacceptable combined view.

Do not treat masking as deletion, and do not replace removed digits with a hash fragment and assume the result is ordinary truncation.

## Protect the hash and its computation service

Use the entire PAN as input to the approved keyed construction and manage its keys separately from ordinary application data. Restrict the key or cryptographic-service operation to narrowly defined workloads.

Then consider the service as a possible guessing oracle. An account denied direct key access may still submit arbitrary candidate PANs and observe their digests. Apply authorization, purpose-specific interfaces, rate controls, and monitoring suited to the legitimate workflow. Do not expose unrestricted bulk hashing through an analytics convenience API.

Where separation contributes to the design, enforce it in network access, identities, storage policies, and export permissions. Check inherited roles and emergency privileges. A segmentation diagram without corresponding permissions is weak evidence.

These are engineering controls to evaluate for the environment; they are not a claim that a particular network layout automatically meets every PCI DSS requirement.

## Test the combined attack paths safely

Use an approved synthetic dataset whose original values are known. Establish the minimum permissions of each real role, then exercise the same query and export paths those roles can use.

Test whether a support role can obtain hashes, whether a fraud role can retrieve broader display digits, and whether an analyst can join separate exports. Attempt access to key material and unrestricted cryptographic operations. Check whether backup restore permissions recreate combined access that production policies prohibit.

Inspect alerting with synthetic correlation-like activity. An alert that nobody investigates is not a demonstrated preventive boundary. Conversely, a denied query should leave an attributable event without copying card data into the log.

Record the datasets, identities, tested routes, expected results, observed results, and remediation. Repeat the review after adding a warehouse connector, changing a truncation format, or exposing a new lookup API.

## Preserve the scope rationale

[FAQ 1089](https://www.pcisecuritystandards.org/faqs/1089/) distinguishes hashing inside the original environment from results transferred into a separate environment. [FAQ 1117](https://www.pcisecuritystandards.org/faqs/1117/) similarly conditions truncated-data scope treatment on separation and other factors. Keep those decisions attached to verified architecture and permissions, not to the presence of a column named `hash` or `last4`.
