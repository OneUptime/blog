# Validation summary

Official release and registry documentation were reviewed for image-index selection, architecture labels, crane flags and upstream image layout. Registry inspection and local archive inspection were performed; no container execution is claimed.

## Checks performed

- Fetched actual v0.14.0 image index with crane v0.20.6; confirmed four Linux architecture entries and attestation entries
- Fetched linux/amd64 config and exercised index jq projection
- Inspected retained official AMD64 root filesystem ELF header: machine 62
- Three Bash examples passed syntax checks; YAML selector parsed and asserted
- Seven-node seven-edge Mermaid structurally reviewed
- 1280x720 social image visually reviewed

## Limitations

- No Kubernetes workload launched or exec format error reproduced
- No ARM64 executable or runtime tested; index metadata alone does not prove execution
- Cluster read commands and scheduling fragment not exercised against a live cluster
- Mermaid not rendered

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
