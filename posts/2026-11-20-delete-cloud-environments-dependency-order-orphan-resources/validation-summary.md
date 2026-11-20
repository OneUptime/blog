# Validation summary

Reviewed AWS documentation for EC2 termination, EBS volumes and snapshots, NAT gateway cleanup, Elastic IP allocations, and CloudFormation retention. Checked Python 3.11 graphlib documentation for ordering and cycle detection. Sources are listed in validation.json and linked next to the article claims.

Executed the published planner using Python 3.11.13. Eight local scenarios passed: baseline dependency ordering and image retention, no retention, retained VM dependency closure, duplicate ID rejection, unresolved dependency rejection, nonboolean retention rejection, cycle rejection, and empty inventory. Verified published code equals the tested file. Mermaid structure contains six nodes and four relationships, including one historical dotted edge; no graphical rendering was performed. The generated social image was visually inspected and has readable, unclipped text.

No cloud resources were queried or deleted. These tests validate local planning logic, not inventory completeness, AWS permissions, actual service transitions, backups, or cost cessation. The article deliberately separates service deletion from observation and final survivor accounting.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
