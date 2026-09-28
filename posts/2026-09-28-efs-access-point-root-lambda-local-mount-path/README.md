# EFS Access-Point Root vs Lambda Local Mount Path: Why Two Paths Exist and Which One Your Code Uses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EFS, Lambda

Description: Map an EFS access-point root to Lambda local paths so functions read and write the intended shared files without duplicating server-side prefixes.

An EFS access point might use `/applications/reports` as its root while Lambda mounts it at `/mnt/shared`. Both paths are correct. The first selects a directory inside EFS; the second names the place where that selected directory appears inside the function's execution environment.

Your function uses the local path. If a report is stored at `/applications/reports/2026/result.json` in the full EFS namespace, the function opens `/mnt/shared/2026/result.json` through this mount. It does not prepend `/applications/reports` again.

## Follow one file through the mapping

An access point changes the root presented to an NFS client. Paths under the configured EFS directory become paths under `/` in the mounted view. Lambda attaches that view at its configured local directory. [EFS access-point root behavior](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html)

| Concept | Example |
| --- | --- |
| EFS access-point `RootDirectory.Path` | `/applications/reports` |
| Lambda `LocalMountPath` | `/mnt/shared` |
| File path relative to the access point | `2026/result.json` |
| Path passed to Python `open()` | `/mnt/shared/2026/result.json` |
| Same file through an administrative full-root mount at `/efs` | `/efs/applications/reports/2026/result.json` |

The final row applies only to an independently authorized full-root mount. An application restricted to the access point should not assume it can inspect the whole filesystem.

## Inspect the two configuration objects separately

```bash
aws efs describe-access-points \
  --access-point-id fsap-0123456789abcdef0 \
  --query 'AccessPoints[0].{FS:FileSystemId,User:PosixUser,Root:RootDirectory}'

aws lambda get-function-configuration \
  --function-name report-worker \
  --query FileSystemConfigs
```

The first output describes the server-side root and optional enforced POSIX identity. The second contains the access-point ARN and local mount location. Check the deployed function version or alias, because a new configuration on `$LATEST` does not rewrite an existing published version.

Lambda requires its local mount path to begin with `/mnt/`. It configures the mount as part of the function environment; application code does not run the Linux mount command itself. [Lambda EFS configuration](https://docs.aws.amazon.com/lambda/latest/dg/configuration-filesystem-efs.html)

A configuration fragment might be:

```json
{
  "FileSystemConfigs": [
    {
      "Arn": "arn:aws:elasticfilesystem:us-east-1:111122223333:access-point/fsap-0123456789abcdef0",
      "LocalMountPath": "/mnt/shared"
    }
  ]
}
```

This is an illustration of the configuration fields, not a complete function creation request. The access-point ARN supplies the EFS identity of the mount; the local directory name does not need to match any directory name in EFS.

## Keep the local prefix in application configuration

For a Python function that reads reports:

```python
import json
import os
from pathlib import Path

REPORT_ROOT = Path(os.environ.get("REPORT_ROOT", "/mnt/shared"))


def lambda_handler(event, context):
    report_path = REPORT_ROOT / "2026" / "result.json"
    with report_path.open("r", encoding="utf-8") as stream:
        report = json.load(stream)
    return {"report": report}
```

Set `REPORT_ROOT` to the Lambda local mount path. The relative path remains independent of the underlying EFS organizational structure. Use application-controlled relative paths, or validate untrusted path components before joining them.

A frequent mistake is opening `/mnt/shared/applications/reports/2026/result.json`. That requests a nested `applications/reports` directory **inside** the access-point root. If such a directory happens to exist, the code can silently access the wrong dataset instead of raising an obvious missing-file error.

## Diagnose an empty directory without creating new data

First verify the function references the intended access point and filesystem. Then compare a known sentinel file through the Lambda view and an authorized administrative view. Use a distinctive file that already exists; an empty `os.listdir()` result can mean the selected root is genuinely empty.

Do not immediately create the missing server-side prefix from the function. That can produce a second directory tree and make a path bug look fixed while splitting the application's data.

Also check numeric ownership and permissions. A configured access-point user replaces the client's identity for EFS operations. Seeing the right path does not guarantee the effective user can read the file. [Access-point POSIX enforcement](https://docs.aws.amazon.com/efs/latest/ug/enforce-identity-access-points.html)

## Keep directory creation and access boundaries explicit

If the root does not exist, access-point creation information tells EFS how to initialize it on mount. Existing directories keep their existing metadata. This matters after a migration: configuring owner 1001 in creation information does not change a preexisting root owned by 2001.

Two functions can mount the same access point at different local paths and still access the same files. Conversely, two different access points can use the same local path while exposing different EFS directories. Compare access-point ARNs and root paths when investigating sharing, not local directory names alone.

Finish with a read of the known sentinel and an approved unique write probe if the function is a writer. The desired result is a single verified mapping from application path to EFS data, preserved in deployment configuration and function settings.
