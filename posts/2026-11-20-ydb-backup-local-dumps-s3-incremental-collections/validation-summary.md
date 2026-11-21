# Validation review

Checked all CLI flags against actual YDB CLI2.35.0 help, including detailed src/dst item aliases, credential profiles, consistency level, restore ACL selection and concurrency. Verified that restore dry-run checks existing schemas and that replace removes existing objects. Reviewed tagged YDB26.2.1.16 collection creation, full/incremental backup and restore documentation, including latest-chain restoration and existing-path failure.

Shell examples passed bash syntax checking. All recovery examples use a separate recovery profile; there are no destructive production cleanup commands or embedded credentials. Data timestamps, chain integrity, target paths and application validation are explicit operational checks.

No live database or object-storage operations ran. CLI help review does not validate deployed server support, permissions, backup completeness or restore duration. Mermaid structure passed with six nodes and seven edges, without rendering. The generated1280x720 image was visually reviewed and is legible and unclipped.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
