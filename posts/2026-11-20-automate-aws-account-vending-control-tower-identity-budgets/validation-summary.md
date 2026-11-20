# Validation summary

Reviewed official AWS documentation for AFT prerequisites, Identity Center assignment creation/status/listing, budget behavior and notification practices, and Control Tower control behavior. Sources are recorded in validation.json and linked beside claims. The article deliberately avoids a guessed AFT module configuration and requires the deployed installation version to govern its request contract.

Using Python 3.11.13 and Boto3 1.40.76, inspected SDK service shapes and executed six botocore Stubber cases: pending, successful expected assignment, failed operation, mismatched account, mismatched request ID, and propagated permission denial. Published code matches the tested file. Mermaid structure has eight nodes and eight edges; no rendered diagram test. Generated image visually reviewed for readable, unclipped title.

No AWS calls or infrastructure changes occurred. Tests do not establish live account provisioning, Identity Center sign-in, effective permissions, control enforcement, notification delivery, or budget accuracy. Durable workflow persistence and reconciliation remain integration requirements.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
