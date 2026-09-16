# How to Preserve Drone Test Reports and Build Artifacts After Ephemeral Workspaces Disappear

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, CI/CD, AWS S3, Testing, DevOps

Description: Publish Drone reports and artifacts to durable storage with explicit failure handling, unique upload identities, checksums, and retention controls.

A report saved under `/drone/src/reports` is available to later steps in the same pipeline. It is not an archive. Drone removes the workspace when the pipeline finishes, so the upload must happen before cleanup.

Treat reports, release artifacts, and Drone's own logs as different outputs. Each needs an owner, retention policy, and a way to connect it to the build that produced it.

## Choose what must survive

List raw test reports, coverage data, screenshots, packaged binaries, image digests, and release manifests. Decide which are diagnostic and which are required to establish release eligibility. A failed upload of an optional screenshot may warrant a warning; a missing release manifest should prevent promotion.

Drone's [workspace documentation](https://docs.drone.io/pipeline/docker/syntax/workspace/) explains its ephemeral lifecycle. Its [server blob storage](https://docs.drone.io/server/storage/blob/) can move server-managed large text such as logs to S3, but enabling that setting does not automatically upload arbitrary files produced by tests.

Use private durable storage for build outputs. For the example below, provision an S3 bucket with encryption, bounded retention, and credentials restricted to the appropriate prefix. Separate production artifact permissions from credentials available to untrusted pull requests.

## Upload under a unique identity

A build number identifies a repository's build, but an upload attempt also needs an identity when work is retried. Use a hierarchy containing repository, build, stage, and an independently generated upload ID. Put the commit and checksums inside an index so readers can verify what they downloaded.

The following standalone script assumes `reports/` contains the approved files, Python 3 and AWS CLI v2 are installed, and AWS authentication is configured. Save it as `ci/upload_reports.py`:

```python
import hashlib
import json
import os
from pathlib import Path
import subprocess
import uuid

reports = Path('reports')
if reports.is_symlink() or not reports.is_dir():
    raise SystemExit('reports must be a real directory')
if (reports / '_complete.json').exists():
    raise SystemExit('_complete.json is reserved for the upload index')
files = sorted(p for p in reports.rglob('*') if p.is_file())
if not files:
    raise SystemExit('no reports to upload')
if any(p.is_symlink() for p in reports.rglob('*')):
    raise SystemExit('symlinks are not allowed in report artifacts')

upload = uuid.uuid4().hex
prefix = '/'.join([
    'reports', os.environ['DRONE_REPO'], os.environ['DRONE_BUILD_NUMBER'],
    os.environ['DRONE_STAGE_NUMBER'], upload,
])
base = 's3://' + os.environ['REPORT_BUCKET'] + '/' + prefix
index = {
    'repository': os.environ['DRONE_REPO'],
    'build': os.environ['DRONE_BUILD_NUMBER'],
    'commit': os.environ['DRONE_COMMIT_SHA'],
    'upload': upload,
    'files': [],
}
for path in files:
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    relative = path.relative_to(reports).as_posix()
    subprocess.run(['aws', 's3', 'cp', str(path), base + '/' + relative,
                    '--only-show-errors'], check=True)
    index['files'].append({'path': relative, 'sha256': digest.hexdigest()})

index_path = Path('artifact-index.json')
index_path.write_text(json.dumps(index, indent=2) + '\n')
subprocess.run(['aws', 's3', 'cp', str(index_path), base + '/_complete.json',
                '--only-show-errors'], check=True)
print('Artifact index:', base + '/_complete.json')
```

The script reserves the top-level `_complete.json` filename for its completion index and rejects a report producer that creates it. The script deliberately uploads the completion index last. Consumers should accept an upload only after finding that index and verifying its expected file set. The [AWS CLI copy interface](https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html) provides the individual object transfers; the completion convention is an application design, not an S3 multi-object transaction.

Keep report producers stopped while hashing and uploading. Concurrent writes can make a checksum describe different bytes from the uploaded file. Reject unexpected file types and enforce size limits according to your reporting policy. The symlink check is intended for a trusted, quiescent workspace and is not a sandbox against hostile code changing files concurrently.

## Run collection after success or failure

Add an upload step after the test/report steps with `when.status` including `success` and `failure`, as described in Drone's [step conditions](https://docs.drone.io/pipeline/docker/syntax/conditions/). When using a dependency graph, explicitly list every producer the upload must wait for.

Keep the real test exit codes. Making tests ignore failure merely to reach the uploader can turn broken tests green. Also accept that cancellation, a killed runner, or a failed clone can prevent any later step from running. Long-running jobs that need crash resilience should upload bounded checkpoints during execution, with incomplete attempts clearly marked.

Use an image containing the required Python and AWS tools, and pin it in your deployment configuration. Provide credentials through approved Drone secret bindings or an external identity mechanism. Restrict upload-capable steps to trusted events, repositories, and branches; a malicious test can read credentials if it shares their execution environment.

## Make retrieval and retention verifiable

Print the non-secret index location into the build log or publish it to an authorized reporting system. Readers should check repository, commit, build, upload ID, and file checksums before treating a download as evidence for a release. A checksum detects accidental corruption, but an untrusted writer can replace both data and index; restrict writes or sign release metadata where appropriate.

Set lifecycle rules for diagnostic reports separately from release artifacts. Align artifact and manifest retention so a release record cannot outlive all its deployable bytes without warning. Partial uploads lacking a completion index should expire too.

Test a successful upload, a failed transfer midway through the file list, and a retry. Verify that the failed attempt has no valid completion index and that a retry creates a distinct prefix. Finally, retrieve the files after the Drone workspace has disappeared. That is the test that proves the artifacts were actually preserved.
