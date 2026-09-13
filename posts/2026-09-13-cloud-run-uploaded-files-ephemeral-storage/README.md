# Why Uploaded Files Disappear on Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloud Run, Google Cloud, Docker, Serverless, Troubleshooting

Description: Separate instance-local scratch files from durable uploads, account for memory-backed paths, and handle scale-out and revision replacement.

---

An upload succeeds, the application returns a filename, and the next request says that file does not exist. Restarting the service seems to erase every upload. The problem is often a storage contract: the application treated an instance-local path as a durable object identifier.

A Cloud Run service can have multiple instances. A later request can reach a different instance or a replacement instance. A pathname such as `/tmp/uploads/report.csv` identifies a file inside one container's filesystem, not a shared file in the service.

## Establish what backs the path

The default writable container filesystem is memory-backed and is lost when the instance stops. Writes to that filesystem consume instance memory. [Cloud Run container filesystem](https://docs.cloud.google.com/run/docs/container-contract#filesystem).

That statement does not describe every possible mounted path. Cloud Run also supports explicitly configured volumes. As of September 2026, its ephemeral disk feature is in Preview; such disks are instance-local and disappear at shutdown, but they are distinct from the default memory-backed filesystem. [Cloud Run ephemeral disk](https://docs.cloud.google.com/run/docs/configuring/services/ephemeral-disk).

Inspect the deployed revision's volume mounts before diagnosing `/tmp`, `/data`, or a custom scratch directory:

```bash
gcloud run services describe upload-api \
  --project=example-project \
  --region=us-central1 \
  --format=export
```

A directory name does not tell you its storage medium. A default `/tmp` path and a separately configured volume mounted below `/tmp` can have different resource behavior.

## Reproduce the instance boundary

Log the process ID and revision when writing and reading a file, then correlate the events with the Cloud Logging instance identifier where available. The process information helps investigate worker behavior, but it does not identify the Cloud Run instance by itself.

```python
import logging
import os

def log_file_operation(operation, object_id):
    logging.info({
        "operation": operation,
        "object_id": object_id,
        "process_id": os.getpid(),
        "revision": os.getenv("K_REVISION"),
    })
```

Compare the write and read events using the platform instance identifier, such as the instanceId label when present, or a marker generated once by the container entrypoint before it starts workers. Different workers in one container share its filesystem despite having different process IDs. Conversely, PIDs can repeat across instances, and a UUID generated before a prefork server starts workers can be inherited. Attribute the missing file to another instance only after correlating instance or container identity. If the same container handled both operations, investigate cleanup, working directories, failed writes, and the exact mounted path. [Cloud Run log fields and viewing logs](https://docs.cloud.google.com/run/docs/logging).

Do not fix the design by lowering maximum instances to one. That can make a test appear reliable while leaving replacement, restart, and deployment loss unresolved. Session affinity likewise should not become a persistence mechanism.

## Return an object identifier after durable storage

For user uploads, save the bytes to durable storage before returning success. Store an object name and relevant metadata in the application's database. A later request should retrieve the object using that identifier, independent of which Cloud Run instance receives it.

This illustrative Python function accepts a bounded in-memory payload and uses Cloud Storage:

```python
from google.cloud import storage

storage_client = storage.Client()

def persist_upload(bucket_name, object_name, payload):
    blob = storage_client.bucket(bucket_name).blob(object_name)
    blob.upload_from_string(
        payload,
        content_type="application/octet-stream",
        if_generation_match=0,
        timeout=60,
    )
    return {
        "bucket": bucket_name,
        "object_name": object_name,
        "generation": blob.generation,
    }
```

Use a server-generated object name tied to your application's upload record. The generation precondition makes this create-only: an existing live object prevents accidental overwrite. Handle an uncertain upload result by inspecting and reconciling the intended object, rather than blindly assigning a new name and creating another copy. [Cloud Storage uploads from memory](https://docs.cloud.google.com/storage/docs/uploading-objects-from-memory), [request preconditions](https://docs.cloud.google.com/storage/docs/request-preconditions).

The runtime identity needs appropriate bucket permissions. For large payloads, prefer streaming or a direct-to-storage upload flow so the server does not hold the full file in RAM. The sample intentionally does not implement authentication, size limits, content validation, or your database transaction.

## Use local storage as bounded scratch space

Some libraries require a local filename. Download the durable input, process it in a unique temporary directory, upload the result, and clean up in `finally`:

```python
from pathlib import Path
from tempfile import TemporaryDirectory

def process_object(download_input, transform, upload_output):
    with TemporaryDirectory(prefix="upload-work-") as directory:
        source = Path(directory) / "input.bin"
        result = Path(directory) / "result.bin"
        download_input(source)
        transform(source, result)
        return upload_output(result)
```

The callbacks represent application-specific operations. Temporary cleanup is useful during normal execution, but correctness must not depend on cleanup running after a crash. Durable input should remain available for a retry, and partial output should not be published as completed.

Estimate peak space for input, output, intermediate files, application buffers, and simultaneous requests. A 50 MiB upload can require much more than 50 MiB during decompression or transformation. Measure the actual library rather than multiplying compressed upload size alone.

## Bound resource use without confusing it with durability

A dedicated in-memory volume can have a size limit, allowing write failures before unbounded scratch use consumes all available memory. The limit does not reserve extra memory or make the files durable. Configure it according to the [in-memory volume guide](https://docs.cloud.google.com/run/docs/configuring/services/in-memory-volume-mounts).

An ephemeral disk can support larger scratch workloads where available, but it still belongs to one instance. Neither a larger memory limit nor a disk volume makes another instance see those files. A shared storage mount has its own consistency and filesystem semantics, which you must verify against the application's locking and rename assumptions.

Test volume-full and memory-pressure behavior. Return a controlled failure, keep the durable input, and make retries safe. A container being killed before reporting success should not leave the database claiming the result is complete.

## Verify the upload lifecycle

In staging, upload an object, deploy a new revision, then retrieve it through the service. Repeat while sending concurrent requests. Confirm that durable uploads remain available, scratch files do not appear in user-facing identifiers, and duplicate operations do not overwrite unrelated objects.

These examples illustrate design and API usage; they have not been deployed to a Cloud Run project.

## Conclusion

Treat local paths as scratch state owned by one instance. Persist uploads and results before acknowledging completion, and retrieve them through durable object identifiers. Then size memory-backed volumes or ephemeral disks for temporary processing without assigning them a persistence guarantee they do not provide.

## Official Documentation

- [Cloud Run filesystem contract](https://docs.cloud.google.com/run/docs/container-contract#filesystem)
- [Ephemeral disk for services](https://docs.cloud.google.com/run/docs/configuring/services/ephemeral-disk)
- [In-memory volume mounts](https://docs.cloud.google.com/run/docs/configuring/services/in-memory-volume-mounts)
- [Upload Cloud Storage objects from memory](https://docs.cloud.google.com/storage/docs/uploading-objects-from-memory)
- [Cloud Storage request preconditions](https://docs.cloud.google.com/storage/docs/request-preconditions)
