# Validation Summary: How to Use Atlas CLI with CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas CLI
- GitHub Actions
- GitLab CI
- CI/CD pipeline automation
- Atlas clusters, access lists, and search indexes

## Sources Consulted
- [Atlas CLI Environment Variables](https://www.mongodb.com/docs/atlas/cli/current/atlas-cli-env-variables/) — verified `MONGODB_ATLAS_PUBLIC_API_KEY`, `MONGODB_ATLAS_PRIVATE_API_KEY`, `MONGODB_ATLAS_ORG_ID`, `MONGODB_ATLAS_PROJECT_ID`
- [atlas clusters create](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-create/) — verified `--tier`, `--provider`, `--region` flags
- [atlas clusters watch](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-watch/) — confirmed command exists
- [atlas clusters connectionStrings describe](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-connectionstrings-describe/) — verified JSON output includes `standardSrv` field
- [atlas accessLists create](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-accesslists-create/) — verified positional argument usage (entry is a positional arg, not a `--entry` flag)
- [atlas accessLists delete](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-accesslists-delete/) — verified `--force` flag
- [atlas clusters search indexes list](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-search-indexes-list/) — verified `--clusterName`, `--db`, `--collection`, `--output` flags
- [atlas clusters search indexes create](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-search-indexes-create/) — verified `--clusterName`, `--file` flags
- [atlas clusters search indexes update](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-search-indexes-update/) — verified positional indexId argument and `--clusterName`, `--file` flags
- [atlas clusters delete](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-delete/) — verified `--force` flag
- [Install or Update the Atlas CLI](https://www.mongodb.com/docs/atlas/cli/current/install-atlas-cli/) — checked installation methods

## Issues Found
1. **`atlas accessLists create` incorrect flags**: The post used `--type ipAddress --entry "$MY_IP"` flags, but the Atlas CLI `accessLists create` command takes the entry (IP address, CIDR block, or AWS security group ID) as a positional argument, not via `--entry` and `--type` flags. The type is auto-detected from the entry format. Fixed to use `atlas accessLists create "$MY_IP" --comment "..."` instead.

## Review Notes
- The Atlas CLI version used in the installation examples (1.14.0) is outdated. The download URL pattern is correct, but users should check for the latest version at https://www.mongodb.com/try/download/atlascli. The current version is significantly newer. This is not a correctness issue since the pinned version would still work, but a future update may be warranted.
- The download path uses `mongocli` in the URL (`fastdl.mongodb.org/mongocli/...`), which is the legacy naming from when Atlas CLI was part of `mongocli`. This path still resolves but newer releases may use a different path structure.
- The GitHub Actions workflow could benefit from using the official `mongodb/atlas-github-action` for installation, but the manual approach shown is valid.
