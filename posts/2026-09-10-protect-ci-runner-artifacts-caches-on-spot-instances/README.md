# How to Protect CI Runner Artifacts and Caches on Spot Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CI/CD, Spot, AWS, Amazon S3, Backup

Description: Persist CI outputs during execution, use distributed caches, and make interrupted runner retries observable without treating incomplete tests as success.

---

A CI job can produce valuable output long before it exits: compiler logs, successful test shards, screenshots, and intermediate packages. If those files exist only on a Spot runner's local disk, a final artifact-upload step arrives too late when the instance disappears.

The design should distinguish durable results from replaceable acceleration data. Artifacts prove what a build produced. Caches reduce repeated downloads or compilation. A lost cache should slow the next attempt; it should not make the result incorrect.

The concrete examples use GitLab Runner on AWS, a project-owned Linux job image containing Bash, Python, pytest, and AWS CLI, and GitLab 19.1 or later for the interruption retry reason shown below.

## Move caches outside the worker lifecycle

Configure an existing runner's distributed cache in `config.toml`:

```toml
[runners.cache]
  Type = "s3"
  Path = "runner-cache"
  Shared = true

[runners.cache.s3]
  BucketName = "replace-with-cache-bucket"
  BucketLocation = "us-east-1"
  AuthenticationType = "iam"
```

Merge this into the correct registered runner's configuration. Supply the required AWS identity in the cache adapter's execution context; confirm whether your executor uses a runner-manager role, helper credentials, or role assumption. The runner's cache identity is not automatically the same as the application's job identity. [GitLab Runner cache configuration](https://docs.gitlab.com/runner/configuration/advanced-configuration/#the-runnerscache-section)

Use an S3 bucket near the workers and scope permissions to the required cache namespace. `Shared = true` enables sharing across runners; it does not turn a cache into a trusted artifact repository.

Include toolchain and dependency identity in cache keys. For Python, a checked-in lock file is a reasonable input. For compiled outputs, include architecture, compiler version, build options, and operating-system compatibility. Always allow the build to succeed after a cache miss.

## Upload completed test phases during the job

Split a long suite into bounded phases and upload each completed phase. This example assumes `tests/unit` and `tests/integration` exist and `requirements.lock` contains the job's Python dependencies:

```yaml
test:
  image: registry.example.com/ci-python-aws:replace-with-your-build
  variables:
    PIP_CACHE_DIR: "$CI_PROJECT_DIR/.cache/pip"
  cache:
    key:
      files:
        - requirements.lock
    paths:
      - .cache/pip/
  retry:
    max: 2
    when:
      - runner_system_failure
      - runner_interrupted
  script:
    - pip install -r requirements.lock
    - bash ci/run-tests.sh
  artifacts:
    when: always
    paths:
      - reports/
    reports:
      junit: reports/*.xml
    expire_in: 14 days
```

GitLab 19.1 introduced more specific runner failure classifications, including `runner_interrupted`. On earlier versions, remove unsupported reasons and inspect the actual failure classification before selecting retry rules. Retrying infrastructure failures does not justify retrying every deterministic test failure. [GitLab retry reference](https://docs.gitlab.com/ci/yaml/#retrywhen)

Create `ci/run-tests.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${CI_RESULTS_BUCKET:?Set the durable results bucket}"
mkdir -p reports
result_prefix="s3://${CI_RESULTS_BUCKET}/${CI_PROJECT_ID}/${CI_PIPELINE_ID}/${CI_JOB_ID}"
overall_status=0

for suite in unit integration; do
  suite_status=0
  pytest "tests/${suite}" \
    --junitxml="reports/${suite}.xml" \
    >"reports/${suite}.log" 2>&1 || suite_status=$?
  cat "reports/${suite}.log"
  aws s3 cp reports/ "${result_prefix}/" \
    --recursive --exclude '*' --include "${suite}.*" --only-show-errors
  if (( suite_status != 0 )); then
    overall_status=$suite_status
  fi
done

if (( overall_status == 0 )); then
  printf '%s\n' "$CI_COMMIT_SHA" > reports/COMPLETE
  aws s3 cp reports/COMPLETE "${result_prefix}/COMPLETE" --only-show-errors
fi
exit "$overall_status"
```

Provide a workload IAM role that can write only the intended results prefix. The script fails if an upload fails, because claiming a successful durable result without the output would violate this job's contract. Tune retry and request timeouts for your environment.

Each retry gets its own job-ID prefix, so it does not overwrite the interrupted attempt's evidence. The commit SHA and final `COMPLETE` marker distinguish a finished passing attempt from partial files. Downstream automation must check the expected suite inventory and successful job state, not merely the presence of a directory.

## Understand what final artifact settings can guarantee

`artifacts: when: always` requests upload after success or failure, with documented exceptions such as job timeouts. It cannot execute on a machine that no longer exists. `after_script` has the same physical limitation and its own timing constraints. [GitLab artifact behavior](https://docs.gitlab.com/ci/yaml/#artifactswhen), [runner timeouts](https://docs.gitlab.com/ci/runners/configure_runners/#set-script-and-after_script-timeouts)

The S3 uploads complement GitLab's artifact collection. They do not automatically import partial JUnit files into GitLab's test UI. A follow-up reporting job can retrieve completed phase files and publish them while clearly identifying which phases never finished.

For an hour-long test phase, the pattern still risks losing almost an hour. Reduce shard duration, stream logs to a durable destination, and publish artifacts after meaningful boundaries. Keep partially written files separate from completed files until the producer closes them.

## Preserve caches without trusting them

A dependency cache can disappear or be replaced. Revalidate dependencies through the package manager and lock file. Restrict cache write access for untrusted code, and keep protected and unprotected execution contexts separated where required.

Do not publish deployable binaries only into a mutable cache key. Upload release outputs into an artifact or package repository with an immutable version, checksum, and access policy. Container image layers should be pushed to a registry before the pipeline advertises that image as available.

## Test a runner interruption end to end

Run the test job on staging Spot capacity, interrupt it after the unit phase upload, and inspect the S3 prefix from an independent machine. The unit report should remain, the interrupted attempt should lack a successful completion marker, and the retry should have a separate prefix.

Repeat during upload and during a cold-cache run. Measure recovered report coverage, repeated test time, time to a replacement runner, and transfer cost. If uploading every phase costs more than recomputing it, adjust the phase boundary while keeping the final output contract intact.

## Conclusion

Make CI progress durable during execution, keep caches replaceable, and label every attempt clearly. The desired result is a retry that can recover evidence and safely rebuild missing work without confusing partial output with a passing pipeline.

## Official Documentation

- [GitLab distributed cache configuration](https://docs.gitlab.com/runner/configuration/advanced-configuration/)
- [GitLab job artifacts](https://docs.gitlab.com/ci/jobs/job_artifacts/)
- [GitLab CI YAML reference](https://docs.gitlab.com/ci/yaml/)
- [GitLab runner timeouts](https://docs.gitlab.com/ci/runners/configure_runners/)
- [AWS CLI S3 copy](https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html)
