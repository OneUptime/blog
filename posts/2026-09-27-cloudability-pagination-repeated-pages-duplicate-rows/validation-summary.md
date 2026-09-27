# Validation Summary: How to Stop Repeated Pages and Duplicate Rows in Cloudability API Exports

## Status

validated

## Post Type

Technical troubleshooting guide with a Python implementation.

## Technologies Covered

- IBM Cloudability commercial V3 cost reporting API
- Token pagination, report grouping, and cost reconciliation
- Python 3, Requests, JSON, SHA-256, and pathlib
- HTTP Basic authentication, timeouts, and retry handling
- Durable staging and checkpointing

## Sources Consulted

- [IBM cost-report endpoint](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point): report parameters, sort syntax, response structure, pagination, and page sizing. Direct retrieval returned HTTP 403; the official page's indexed content was accessible through targeted searches.
- [IBM getting started with Cloudability API V3](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=api-getting-started-cloudability-v3): API key authentication and regional endpoints.
- [Requests quickstart](https://requests.readthedocs.io/en/latest/user/quickstart/): structured query parameters, JSON responses, and HTTP errors.
- [Requests advanced usage](https://requests.readthedocs.io/en/latest/user/advanced/): sessions and connect/read timeout tuples.
- [Requests authentication](https://requests.readthedocs.io/en/latest/user/authentication/): Basic authentication tuples.
- [Python truth value testing](https://docs.python.org/3/library/stdtypes.html#truth-value-testing): false-valued objects and Boolean operations.
- [Python JSON](https://docs.python.org/3/library/json.html): serialization and decoding.
- [Python hashlib](https://docs.python.org/3/library/hashlib.html): SHA-256 and hexadecimal digests.
- [Python pathlib](https://docs.python.org/3/library/pathlib.html): writing text files and replacing destinations.
- [Python decimal](https://docs.python.org/3/library/decimal.html): decimal arithmetic for monetary reconciliation.
- [RFC 6585, section 4](https://www.rfc-editor.org/rfc/rfc6585.html#section-4): HTTP 429 and Retry-After.

## Issues Found

1. **Malformed pagination could silently terminate traversal.** The original `or {}` and `if not next_token` accepted invalid false-valued data, including `false`, `0`, and empty arrays, as successful termination. Added an explicit pagination-object check and restricted terminal tokens to absent/null or empty-string values. Other non-string tokens now fail before output is written.
2. **The example finalized output before reconciliation.** It replaced `cost-rows.json` immediately after traversal despite the conclusion requiring reconciliation before publication. Changed the output to `cost-rows.staged.json` and clarified in the existing introductory paragraph that this file must be reconciled before publication. No new sections or production reconciliation framework were added.

## Review Notes

- Verified the synchronous cost-report route, date and measure parameters, sorting, view selection, top-level results array, and token traversal. IBM documents 10,000-row automatic pagination and a larger 64,000-row setting for `limit=0`.
- IBM's pagination prose specifies `token`, while a later curl example uses `tokenId`. Retained `token` to follow the explicit pagination instructions; no authenticated tenant request was available to resolve this documentation inconsistency experimentally.
- The sample host is the US commercial endpoint. Other regions require their corresponding host; GovCloud requires a different authentication method. API access and a permitted view are prerequisites.
- Parsed the extracted Python example and ran 21 isolated simulated-response cases. Covered successful multi-page traversal, fixed query parameters, current-token replacement, supported terminal representations, malformed pagination and tokens, repeated pages, repeated tokens, invalid results, HTTP failure, and exhaustion of the 10,000-page budget. Failure cases produced no staging output; an existing published file remained unchanged in every case.
- Tests used a simulated Requests session and temporary directories. They verify client control flow, not live Cloudability behavior. No credentials or live API calls were used.
- The page checksum detects identical ordered pages, not partial overlap or reordered duplicates. The post correctly requires review against all grouping dimensions rather than automatic row removal.
- Fixed query parameters do not independently guarantee that underlying billing data remains immutable during a traversal. Reconciliation remains necessary; the example does not implement it.
- Retry/checkpoint guidance is a production design requirement, not functionality provided by the diagnostic script. Production handling should respect Retry-After when provided and make page staging and checkpoints transactional or idempotent as described.
- No deprecated Python or Requests APIs were identified. There are no terminal commands or separate configuration snippets in the post.
