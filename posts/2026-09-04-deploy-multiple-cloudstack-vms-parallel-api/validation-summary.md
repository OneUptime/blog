# Validation Summary: How to Deploy Multiple CloudStack VMs in Parallel Through the API

## Status
validated

## Post Type
Technical tutorial and operational guide.

## Technologies Covered
- Apache CloudStack 4.23 API, VM deployment, asynchronous jobs, resource placement, and VM lifecycle.
- Apache CloudMonkey (`cmk`).
- Python 3, Requests, HMAC-SHA1 API signatures, URL encoding, and JSON state persistence.
- Bash, Unix filesystem durability, TLS, and guest health checks.

## Sources Consulted
- CloudStack API version index: https://cloudstack.apache.org/api/
- CloudStack deployment API: https://cloudstack.apache.org/api/apidocs-4.23/apis/deployVirtualMachine.html
- CloudStack async result API: https://cloudstack.apache.org/api/apidocs-4.23/apis/queryAsyncJobResult.html
- CloudStack VM listing API: https://cloudstack.apache.org/api/apidocs-4.23/apis/listVirtualMachines.html
- CloudStack destruction API: https://cloudstack.apache.org/api/apidocs-4.23/apis/destroyVirtualMachine.html
- CloudStack async job listing: https://cloudstack.apache.org/api/apidocs-4.23/apis/listAsyncJobs.html
- CloudStack events: https://cloudstack.apache.org/api/apidocs-4.23/apis/listEvents.html
- CloudStack preflight APIs: https://cloudstack.apache.org/api/apidocs-4.23/apis/listZones.html , https://cloudstack.apache.org/api/apidocs-4.23/apis/listServiceOfferings.html , https://cloudstack.apache.org/api/apidocs-4.23/apis/listTemplates.html , https://cloudstack.apache.org/api/apidocs-4.23/apis/listNetworks.html , https://cloudstack.apache.org/api/apidocs-4.23/apis/listSSHKeyPairs.html , https://cloudstack.apache.org/api/apidocs-4.23/apis/listCapacity.html
- CloudStack volume and NIC APIs: https://cloudstack.apache.org/api/apidocs-4.23/apis/listVolumes.html , https://cloudstack.apache.org/api/apidocs-4.23/apis/listNics.html
- CloudStack Programmer Guide (HTTP requests, signing, asynchronous commands): https://docs.cloudstack.apache.org/en/latest/developersguide/dev.html
- CloudStack VM administration and lifecycle: https://docs.cloudstack.apache.org/en/latest/adminguide/virtual_machines.html
- CloudMonkey official README and usage wiki: https://github.com/apache/cloudstack-cloudmonkey/blob/main/README.md , https://github.com/apache/cloudstack-cloudmonkey/wiki/Usage
- Requests response and exception behavior: https://requests.readthedocs.io/en/latest/user/quickstart/
- Requests TLS verification and CA bundles: https://requests.readthedocs.io/en/latest/user/advanced/#ssl-cert-verification
- Python filesystem operations: https://docs.python.org/3/library/os.html
- Python URL encoding: https://docs.python.org/3/library/urllib.parse.html
- Linux fsync manual (directory entry durability): https://man7.org/linux/man-pages/man2/fsync.2.html

## Issues Found
1. **Lookup scope and pagination:** `listall=true` without a project could adopt another account's VM, and a single page could miss exact matches. Changed the driver to caller scope with optional explicit project scope and pagination through an empty result page.
2. **Project CLI queries:** Reconciliation and volume/event checks omitted project scope despite the run example using a project. Added project filters where supported, account-scope alternatives, and instructions to inspect all pages. Clarified project preflight listings and capacity permissions.
3. **Resource identifier wording:** UUIDs were described as immutable while the post also discussed custom IDs. Removed the universal immutability claim and clarified that `customid` sets a resource identifier rather than attaching an arbitrary correlation tag.
4. **Crash durability:** Flushing a temporary file and renaming it did not ensure the directory entry reached disk. Added directory fsync and specified a pre-created protected local Unix state directory supporting that operation.
5. **Continuation identity:** Only the batch name was checked on restart, allowing changed deployment inputs or credentials to reuse the ledger. Added a persisted deployment plan and API identity check. Explicitly required one writer per batch because the driver has no distributed lock or server-side idempotency mechanism.
6. **Submission errors:** An explicit API error was treated as proof of no side effects, while non-2xx errors actually raised Requests exceptions first. Conservatively mark API errors uncertain and explain HTTP-error handling and reconciliation.
7. **Partial failure:** The original loop continued submitting remaining VMs after failed jobs. Stop new submissions on recorded failure while polling already accepted jobs. Explained that failed entries are skipped and require archived, controlled ledger reconciliation before continuation.
8. **VM UUID extraction:** Added the completed deployment result's nested VM ID as a fallback alongside the acceptance ID and job instance ID.
9. **Reconciliation status and evidence:** Replaced the vague instruction to record a VM as reconciled with explicit existing/succeeded/pending handling. Added retention and event-keyword limitations so absent listings are not treated as conclusive proof of non-acceptance.
10. **Runtime prerequisites and defaults:** Specified Python 3 invocation, Requests installation, Bash for the credential example, and that four outstanding jobs is the default. Clarified that the driver does not inject an SSH key or user data.
11. **CloudMonkey async behavior:** CloudMonkey defaults to blocking on asynchronous commands. Added `cmk set asyncblock false` before destruction so the subsequent job-ID polling example matches the CLI behavior.
12. **Duplicate diagnosis:** Replaced an overly categorical cause list with possible causes, including concurrent batch writers. A changed batch ID creates different names and does not by itself explain duplicate exact names.

## Review Notes
- Confirmed that the official 4.23 API references exist and returned HTTP 200. The web browser retrieval failed for some API pages; direct HTTPS retrieval successfully verified their parameter tables.
- The signing algorithm, percent-encoding of spaces, asynchronous status handling, HTTPS verification, and non-immediate expunge option agree with official documentation. Placement still depends on host eligibility, configured overcommit, networks, storage, and resource limits.
- Extracted and compiled the Python example and checked every Bash block with `bash -n`.
- Ran local simulated checks for canonical encoding, pagination with an exact match on a later page, caller/project query scope, ledger save/load, changed-plan rejection, bounded successful deployment, and partial failure. All passed; the partial-failure simulation submitted only the initial bounded pair and polled both to completion.
- No live CloudStack environment or credentials were supplied. Actual VM boot, placement, networking, application health, and rollback were not executed or certified.
- The example assumes one writer, consistent API identity, durable local storage, and manual reconciliation of uncertain requests. Polling remains fixed at ten seconds; backoff and health-check deadlines are operator guidance rather than implemented features. CloudMonkey's asyncblock setting persists in its configuration.
- Expunge timing is governed by cloud policy. Separately attached volumes and external dependencies still require explicit review before cleanup.
