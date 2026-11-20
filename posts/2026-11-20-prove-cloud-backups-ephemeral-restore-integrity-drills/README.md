# Prove Cloud Backups Work with Isolated Restore Drills

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Backup, Disaster Recovery, Cloud Automation

Description: Test cloud backups in temporary isolated environments, validate known data and application behavior, measure recovery objectives, and verify cleanup.

A successful backup job proves that the backup service completed its task. It does not prove that your team can recover the application, decrypt its data, or restore service within the required time.

A useful restore drill creates a temporary recovery environment, checks data against independent expectations, exercises the application, and removes the test resources. Keep the restore result, validation result, recovery timing, and cleanup result separate. One green status should not hide three unanswered questions.

This guide uses AWS Backup restore testing as a concrete orchestration example and a local Python integrity checker for a small static fixture. The same evidence model applies to Azure and other clouds, but their restore APIs and supported resource types differ.

## Define what a passing drill means

Start with the service owner's recovery objectives. Recovery point objective, or RPO, describes the tolerated data-loss window. Recovery time objective, or RTO, describes how long service recovery may take. Write down exactly where your drill's timer starts and ends; a cloud restore-job duration usually excludes application preparation and validation.

| Check | Evidence required |
|---|---|
| Restore | Selected recovery point produces the intended resource |
| Integrity | Known data matches an independent backup-time expectation |
| Application | An isolated read or harmless transaction works |
| Freshness | Recovered business timestamp satisfies the RPO |
| Duration | Measured recovery path satisfies the agreed RTO |
| Cleanup | Created resources are removed or explicitly retained for investigation |

Select recent and older recovery points over time. Include encrypted backups, different storage classes, and representative database sizes. Testing the same small recent backup every day provides narrow evidence.

## Isolate before starting the restore

Use a dedicated recovery account or environment with reviewed network settings. Prevent the recovered application from sending customer emails, charging accounts, publishing production events, or joining the live cluster. Disable scheduled writers and replace external integrations with controlled test endpoints before application startup.

Check restore metadata rather than trusting defaults. AWS Backup can infer network and resource settings; some resource types allow explicit overrides. A restored resource in a default network is not automatically isolated. Review the supported override keys for the exact resource type, including subnet, security groups, identity, and encryption settings where applicable. [Restore testing inferred metadata](https://docs.aws.amazon.com/aws-backup/latest/devguide/restore-testing-inferred-metadata.html).

Use the real recovery identity to exercise decryption and access requirements. A drill performed with an unusually powerful administrator can conceal permissions missing from the incident runbook. Keep data access narrow even in the isolated environment: restored production data remains production data.

## Trigger validation after the cloud restore completes

AWS Backup restore testing supports periodic plans and resource selections. It starts restore jobs, records their duration, and can remove restored resources after validation finishes or its window closes. Configure the validation window to allow your checks to finish. [AWS Backup restore testing](https://docs.aws.amazon.com/aws-backup/latest/devguide/restore-testing.html).

```mermaid
flowchart LR
    A[Selected recovery point] --> B[Restore into isolated environment]
    B --> C[Cloud restore completes]
    C --> D[Verify resource identity and readiness]
    D --> E[Data and application validation]
    E --> F[Record result and timing]
    F --> G[Cleanup and confirm removal]
```

The `COMPLETED` event is the start of validation, not a reason to report success automatically. AWS documents an EventBridge pattern for this handoff. Scope it to your specific restore testing plan rather than reacting to every restore in the account:

```json
{
  "source": ["aws.backup"],
  "detail-type": ["Restore Job State Change"],
  "detail": {
    "status": ["COMPLETED"],
    "restoreTestingPlanArn": ["REPLACE-WITH-RESTORE-TESTING-PLAN-ARN"]
  }
}
```

Replace the placeholder before deployment. The validation worker should verify the job and created resource, tolerate duplicate triggers, and correlate all results to the restore job ID. [AWS restore validation workflow](https://docs.aws.amazon.com/aws-backup/latest/devguide/restore-testing-validation.html).

With an authorized AWS CLI session, inspect a selected job using:

```bash
aws backup describe-restore-job   --restore-job-id 'REPLACE-RESTORE-JOB-ID'   --region 'eu-west-1' --output json
```

Match the returned resource and recovery point to the drill record before connecting to it. The [describe-restore-job reference](https://docs.aws.amazon.com/cli/latest/reference/backup/describe-restore-job.html) defines this inspection operation. Its command inputs were checked locally using AWS CLI 2.38.1; no cloud restore was run for this article.

## Verify data against a pre-existing expectation

Create a small immutable fixture before the backup: for example, a versioned configuration export and a known document. Record their SHA-256 hashes at that time and retain the manifest in a protected evidence store associated with the recovery point. Do not generate the expected hashes from the restored files; that would only prove the files match themselves.

The following Python 3.11 checker verifies listed regular files beneath a supplied directory. Run it on a frozen, read-only restored fixture without concurrent writers. Its path checks are not a defense against an attacker changing files during validation.

Save it as `verify.py`:

```python
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import sys


def verify(root, expected):
    root = Path(root).resolve(strict=True)
    if not root.is_dir() or not isinstance(expected, dict) or not expected:
        raise ValueError('Invalid fixture or manifest')
    for name, digest in expected.items():
        if not isinstance(name, str) or not name or '\\' in name:
            raise ValueError('Invalid path')
        relative = PurePosixPath(name)
        if relative.is_absolute() or any(p in ('', '.', '..') for p in name.split('/')):
            raise ValueError('Unsafe path')
        if not isinstance(digest, str) or not re.fullmatch(r'[0-9a-f]{64}', digest):
            raise ValueError('Invalid SHA-256')
        candidate = root
        for part in relative.parts:
            candidate = candidate / part
            if candidate.is_symlink():
                raise ValueError('Symlink not allowed in fixture')
        if not candidate.is_file():
            raise ValueError('Expected regular file missing')
        with candidate.open('rb') as stream:
            actual = hashlib.file_digest(stream, 'sha256').hexdigest()
        if actual != digest:
            raise ValueError('Fixture integrity mismatch')
    return len(expected)


if __name__ == '__main__':
    try:
        manifest = json.loads(Path(sys.argv[2]).read_text())
        count = verify(sys.argv[1], manifest)
    except Exception:
        raise SystemExit('Fixture validation failed; details withheld.')
    print(f'Validated {count} fixture files.')
```

The manifest is a JSON object mapping relative paths to lowercase SHA-256 digests. It must come from your trusted backup-time record. The checker rejects empty manifests, unsafe paths, symlinks, missing files, and hash mismatches. Python documents the streaming hash operation in [hashlib](https://docs.python.org/3.11/library/hashlib.html).

After your storage-specific recovery procedure has exposed the fixture safely, run:

```bash
python3 verify.py /mnt/restore-fixture /secure-evidence/fixture-sha256.json
```

Replace both paths. Successful output reports the number of checked files. A failure exits nonzero without dumping filenames or file contents into the orchestration log. Nine local tests covered a valid fixture and eight rejection cases. No live disk mount or cloud storage recovery was tested.

This validates only the listed fixture files. It does not check all files, permissions, database consistency, or whether the backup omitted a table. Use engine-specific integrity checks and business invariants for databases: expected schema version, required records, referential checks, and a known transaction marker. Run those checks against the restored database, with production connections disabled.

## Report success only after the full contract passes

Combine the fixture check with application readiness, business-data freshness, and timing. A healthy HTTP endpoint alone may prove only that a process started. Include a read that depends on recovered data, and verify that it reaches the isolated resource rather than production.

AWS Backup accepts independent validation results through `PutRestoreValidationResult`. For a completed validation workflow, report the actual outcome with the correct job ID. The following is a reporting example for a failed drill, not an instruction to mark a real job without evidence:

```bash
aws backup put-restore-validation-result   --restore-job-id 'REPLACE-RESTORE-JOB-ID'   --validation-status FAILED   --validation-status-message 'Application validation failed; see protected drill record.'   --region 'eu-west-1'
```

Use `SUCCESSFUL` only when every required check passed. The API also supports `VALIDATING` and `TIMED_OUT`; make timeout and worker failure explicit outcomes rather than silent absence. Keep diagnostic details in the protected evidence store. [Validation-result API](https://docs.aws.amazon.com/aws-backup/latest/APIReference/API_PutRestoreValidationResult.html) and [CLI reference](https://docs.aws.amazon.com/cli/latest/reference/backup/put-restore-validation-result.html).

## Verify cleanup independently

Write evidence outside the temporary restore environment before reporting completion. The test resource may be deleted after validation, and its local logs can disappear with it. Preserve the recovery point, job ID, created resource identifiers, test version, timestamps, checks performed, and failures.

Confirm cleanup after the service's deletion workflow, and separately track resources your validator created, such as helper instances or temporary credentials. Give every resource an owner and drill ID. A cleanup failure should alert even when application validation passed.

When a drill fails, keep the backup intact and open a repair task with the failed recovery step. Re-run the affected scenario after the fix. The evidence you want is not a promise that every backup works forever; it is a recent, reproducible demonstration that the selected recovery path restores the required data and behavior within its objectives.
