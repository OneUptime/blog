# How to Checkpoint Kubernetes Jobs Across Spot Evictions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Spot, Batch Processing, Amazon S3, AWS

Description: Persist deterministic chunk results in S3 so replacement Kubernetes Job Pods resume completed work safely after Spot interruption or abrupt node loss.

---

Kubernetes retries failed Jobs, but it does not automatically restore application progress. A replacement Pod starts a new process. To avoid repeating hours of work, the application must make useful progress durable before the node disappears.

A practical starting point is to split deterministic work into bounded chunks and persist each completed chunk independently. This tutorial demonstrates that pattern with S3 and a single-completion Kubernetes Job. It also handles duplicate execution, which Kubernetes allows even when `parallelism` and `completions` are both one. [Kubernetes Job execution](https://kubernetes.io/docs/concepts/workloads/controllers/job/)

## Define what a checkpoint proves

The example calculates the sum of squares for 20 chunks of 100 integers. Each S3 object contains the final result for one chunk. Its key includes a stable run ID and an algorithm/input version. Replacements use the same run ID; Pod UIDs must not become part of the recovery key.

For real data, replace `squares-v1` with an immutable input manifest digest plus the algorithm version. Otherwise a deployment could accidentally reuse results from different input or code.

This design tolerates duplicate computation because a chunk is deterministic and has no external side effects. For payments, email, or database mutations, use transactional deduplication or fencing at the destination. Writing a checkpoint after a side effect does not make that side effect exactly once.

## Write completed chunks atomically

Save this as `worker.py`:

```python
import json
import os
import signal
import sys
import time

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

stopping = False


def stop(signum, frame):
    global stopping
    stopping = True


signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
s3 = boto3.client("s3", config=Config(
    connect_timeout=3, read_timeout=10,
    retries={"mode": "standard", "total_max_attempts": 2},
))
bucket = os.environ["CHECKPOINT_BUCKET"]
prefix = f"checkpoints/{os.environ['RUN_ID']}/squares-v1"
total = 0

for chunk in range(20):
    if stopping:
        sys.exit(143)
    key = f"{prefix}/{chunk:04d}.json"
    expected = {"chunk": chunk, "sum": sum(
        n * n for n in range(chunk * 100, (chunk + 1) * 100)
    )}
    try:
        saved = json.loads(s3.get_object(Bucket=bucket, Key=key)["Body"].read())
        if saved != expected:
            raise ValueError(f"Unexpected checkpoint: {key}")
        print(f"resume: chunk {chunk}", flush=True)
    except ClientError as error:
        if error.response["Error"]["Code"] != "NoSuchKey":
            raise
        # Stand-in for bounded, deterministic processing.
        time.sleep(5)
        try:
            s3.put_object(
                Bucket=bucket, Key=key,
                Body=json.dumps(expected).encode(),
                ContentType="application/json", IfNoneMatch="*",
            )
        except ClientError as conflict:
            if conflict.response["Error"]["Code"] != "PreconditionFailed":
                raise
            other = json.loads(s3.get_object(Bucket=bucket, Key=key)["Body"].read())
            if other != expected:
                raise ValueError(f"Conflicting checkpoint: {key}")
        print(f"committed: chunk {chunk}", flush=True)
    total += expected["sum"]

print(f"complete: {total}", flush=True)
```

An S3 conditional write with `If-None-Match: *` rejects an existing key with `412 Precondition Failed`. That allows one completed result to win when two attempts overlap. Other failures remain errors; the code never treats authentication or network failures as missing checkpoints. [S3 conditional writes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html)

The signal handler only sets a flag. It does not perform network I/O inside the handler. The current bounded chunk can finish and upload; the next iteration exits with a retryable nonzero status. If the machine vanishes before upload, that one chunk runs again.

## Package and authorize the worker

A minimal build file is:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir boto3==1.43.91
COPY worker.py .
ENTRYPOINT ["python", "-u", "worker.py"]
```

Build and push this image to your registry, then substitute its immutable digest in the Job below. The SDK's [PutObject reference](https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/put_object.html) documents the `IfNoneMatch` parameter. Lock dependencies according to your image maintenance process.

Use a workload IAM role through EKS Pod Identity or IRSA. For this example, use a dedicated checkpoint bucket: grant `s3:GetObject` and `s3:PutObject` for its checkpoint prefix and `s3:ListBucket` on the bucket ARN. Missing-key responses depend on the caller's bucket permissions, so verify `NoSuchKey` with the actual workload role; prefix conditions on `ListBucket` do not necessarily provide that behavior for `GetObject`. [S3 GetObject permission behavior](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html) Add the necessary KMS permissions if the bucket uses a customer-managed key. Do not embed access keys in the image.

## Configure replacement behavior

The following assumes a preconfigured service account named `checkpoint-worker` and a Kubernetes version supporting stable Pod failure policy:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: checkpoint-demo
spec:
  completions: 1
  parallelism: 1
  backoffLimit: 6
  activeDeadlineSeconds: 1800
  podFailurePolicy:
    rules:
      - action: Ignore
        onPodConditions:
          - type: DisruptionTarget
            status: "True"
  template:
    spec:
      serviceAccountName: checkpoint-worker
      restartPolicy: Never
      terminationGracePeriodSeconds: 60
      containers:
        - name: worker
          image: registry.example.com/checkpoint-worker:replace-with-your-build
          env:
            - name: CHECKPOINT_BUCKET
              value: replace-with-your-bucket
            - name: RUN_ID
              value: demo-2026-09-10
          resources:
            requests:
              cpu: 250m
              memory: 128Mi
```

Add your cluster's Spot selector and toleration if required. The failure policy prevents failures marked `DisruptionTarget` from consuming `backoffLimit`; it does not classify every crash or arbitrary deletion as a disruption. The active deadline still limits total Job duration. [Kubernetes Pod failure policy](https://kubernetes.io/docs/tasks/job/pod-failure-policy/)

## Prove recovery from abrupt loss

Run the worker locally once with a test bucket and interrupt it after several `committed` messages. Run it again with the same environment. Completed chunks should report `resume`, and the final result should be `2664667000`.

Then test the container in staging with a scoped Spot interruption experiment. Compare the final 20 objects and total with an uninterrupted run. Also simulate an abrupt stop that cannot execute cleanup; periodic checkpoints should still limit repeated work to uncommitted chunks.

Record checkpoint upload duration, repeated chunk count, and time until the replacement starts. Reduce chunk size when lost computation is expensive; increase it when request overhead dominates. Expire abandoned prefixes with a retention policy after downstream output is safely published.

## Conclusion

Recoverable Jobs need stable work identities, durable progress, and duplicate-safe outputs. Save progress during normal execution and use termination handling only to reduce the final amount of repeated work.

## Official Documentation

- [Kubernetes Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Pod failure policy](https://kubernetes.io/docs/tasks/job/pod-failure-policy/)
- [S3 conditional writes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html)
- [Boto3 PutObject](https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/put_object.html)
- [EKS Pod Identity](https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html)
