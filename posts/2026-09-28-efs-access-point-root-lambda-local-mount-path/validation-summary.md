# Validation Summary: EFS Access Point Root vs Lambda Local Mount Path: Which Path Your Code Uses

## Status

validated

## Post Type

Technical guide with AWS CLI commands, a Lambda configuration fragment, and a Python handler example.

## Technologies Covered

- Amazon Elastic File System (EFS), access points, and NFS directory views
- AWS Lambda file system configuration and published versions
- AWS CLI and JMESPath response queries
- POSIX user identity, ownership, and permissions
- Python standard library: pathlib, os, and json

## Sources Consulted

- [EFS access-point root directory behavior and creation](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html)
- [EFS access-point POSIX identity enforcement](https://docs.aws.amazon.com/efs/latest/ug/enforce-identity-access-points.html)
- [Lambda EFS configuration](https://docs.aws.amazon.com/lambda/latest/dg/configuration-filesystem-efs.html)
- [AWS CLI: efs describe-access-points](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-access-points.html)
- [AWS CLI: lambda get-function-configuration](https://docs.aws.amazon.com/cli/latest/reference/lambda/get-function-configuration.html)
- [Lambda FileSystemConfig API](https://docs.aws.amazon.com/lambda/latest/api/API_FileSystemConfig.html)
- [Lambda function versions](https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html)
- [Python pathlib](https://docs.python.org/3/library/pathlib.html)
- [Python json](https://docs.python.org/3/library/json.html)
- [Python os](https://docs.python.org/3/library/os.html)

## Issues Found

No technical issues found.

## Review Notes

- Confirmed that the access-point root selects the EFS subtree, while Lambda's local mount path determines the path used by application code. All file mappings in the table are consistent, including the independently authorized full-root administrative mount. Repeating the server-side prefix would address a nested directory under the access-point root.
- Verified both AWS CLI command names, flags, response fields, and query expressions against the command references. The example resource identifiers are placeholders. The unqualified Lambda command inspects the current function configuration; inspecting a published version or alias requires a qualified function name or `--qualifier`, consistent with the accompanying guidance.
- Confirmed the JSON field names, access-point ARN format, and `/mnt/shared` local path against the Lambda API. The example is appropriately described as a configuration fragment. Published versions retain their configuration when `$LATEST` changes.
- Confirmed that access-point identity enforcement replaces client POSIX IDs for permission evaluation. Root directory creation information applies when EFS creates a missing directory on mount and does not reset an existing directory's metadata. Automatic creation requires ownership and permissions to be supplied; otherwise a missing root causes mounting to fail.
- The sharing examples correctly distinguish local names from the underlying EFS directory. The diagnostic advice to compare existing sentinel files and avoid creating duplicate directory trees is consistent with that mapping.
- The three AWS documentation links in the post resolve to the intended official resources. No deprecated APIs or incorrect version-specific statements were identified.
- Local checks passed: Bash syntax validation with `bash -n`, JSON parsing, Python compilation, and execution of the unchanged handler against a temporary `2026/result.json` file using `REPORT_ROOT`. The handler returned the expected parsed report.
- No live AWS API calls, Lambda deployments, or EFS mounts were performed. Network connectivity, deployed IAM/POSIX permissions, and actual shared-storage reads and writes remain deployment-specific checks. The local handler test validates application behavior, not EFS integration.
- README.md was left unchanged because no technical corrections were necessary.
