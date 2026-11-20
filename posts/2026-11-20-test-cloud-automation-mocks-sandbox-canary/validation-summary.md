# Validation summary

Reviewed official botocore Stubber documentation, EC2 StopInstances DryRun semantics, IAM policy evaluation, and AWS Organizations SCP guidance. Sources appear in validation.json and next to the relevant article claims.

Executed the exact published helper and unittest suite using Python 3.11.13 and Boto3 1.40.76. Four cases passed: DryRunOperation interpreted as permission, UnauthorizedOperation as denial, throttling propagated, and unexpected success rejected. SDK expected parameters require DryRun=True. Mermaid eight-node/seven-edge structure checked without rendering. Generated social image visually inspected with readable unclipped title.

No AWS requests occurred. No permissions, stop/start transitions, sandbox recovery, production canary, or cleanup were tested. The article labels these as separate evidence requirements rather than claiming local mocks establish them.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
