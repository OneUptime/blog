# Argo Workflows Artifact Upload Failed: Debugging S3, MinIO, GCS, and Azure Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Workflows, Kubernetes, Artifacts, Amazon S3, MinIO, Google Cloud Storage, Azure Blob Storage

Description: Diagnose Argo Workflows artifact upload failures across S3, MinIO, GCS, and Azure by checking executor logs, repository selection, credentials, paths, and storage permissions.

---

An Argo task can print its expected result and exit with code zero while the node still becomes `Error`. Output artifact handling happens around the workload container: after the main process finishes, Argo's executor packages the declared path and uploads it to the selected artifact repository. A missing file, inaccessible Secret, wrong bucket region, TLS problem, or denied object write can therefore fail the node after the application itself succeeded.

The fastest troubleshooting method is to separate the problem into four layers:

1. Did Argo select the repository you intended?
2. Did the workload create the declared local path?
3. Did the executor receive working credentials and network access?
4. Did the storage service accept the operation for the exact bucket, container, and object key?

This guide applies that sequence to Amazon S3, S3-compatible MinIO, native GCS, and Azure Blob Storage.

## Start with the Executor Error

Do not begin with the main container log alone. First inspect the Workflow and discover the Pod layout:

```bash
argo get -n workflows <workflow-name>

kubectl get pods -n workflows \
  -l workflows.argoproj.io/workflow=<workflow-name>

kubectl get pod -n workflows <pod-name> \
  -o jsonpath='{.spec.initContainers[*].name}{"\n"}{.spec.containers[*].name}{"\n"}'
```

In the traditional executor Pod layout, input artifact errors normally appear in the `init` container and output upload errors in the `wait` container. Newer installations may use Argo's init-less layout, where a `supervisor` container performs both pre-main and post-main work. Read whichever infrastructure containers the Pod actually contains:

```bash
kubectl logs -n workflows <pod-name> -c wait
kubectl logs -n workflows <pod-name> -c init
kubectl logs -n workflows <pod-name> -c supervisor

kubectl describe pod -n workflows <pod-name>
```

The relevant error usually identifies the failing layer:

| Error shape | First check |
| --- | --- |
| `stat ... no such file or directory` | Declared `outputs.artifacts[].path` and volume mounts |
| Secret not found or key not found | Secret name, key, and Workflow namespace |
| `AccessDenied`, `403`, or authorization failure | Workload identity and object-store policy |
| `NoSuchBucket`, container not found, or `404` | Repository selection and bucket/container name |
| redirect, region, or signing mismatch | S3 region and endpoint |
| `x509: certificate signed by unknown authority` | Endpoint TLS and custom CA configuration |
| DNS failure, refused connection, or timeout | Service name, NetworkPolicy, proxy, and egress |
| OOM or signal while archiving | Artifact size, compression, and executor resources |

Preserve the complete executor message. A generic Workflow status such as `failed to save outputs` is only the wrapper; the storage SDK error in the infrastructure-container log is the actionable part.

## Confirm Which Repository Argo Selected

Argo can obtain an artifact repository from several places. An explicit `spec.artifactRepositoryRef` wins. Otherwise, Argo can use a default key selected by the `workflows.argoproj.io/default-artifact-repository` annotation on an `artifact-repositories` ConfigMap in the Workflow namespace, and then fall back to controller configuration.

Inspect all three sources:

```bash
kubectl get workflow -n workflows <workflow-name> \
  -o jsonpath='{.spec.artifactRepositoryRef}{"\n"}'

kubectl get configmap -n workflows artifact-repositories -o yaml

kubectl get configmap -n argo workflow-controller-configmap -o yaml
```

A repository catalog can hold several named configurations:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: artifact-repositories
  namespace: workflows
  annotations:
    workflows.argoproj.io/default-artifact-repository: aws-s3
data:
  aws-s3: |
    s3:
      bucket: company-workflow-artifacts
      endpoint: s3.amazonaws.com
      region: eu-west-1
      keyFormat: argo/{{workflow.namespace}}/{{workflow.name}}/{{pod.name}}
      useSDKCreds: true

  minio: |
    s3:
      bucket: argo-artifacts
      endpoint: minio.storage.svc.cluster.local:9000
      insecure: true
      keyFormat: argo/{{workflow.name}}/{{pod.name}}
      accessKeySecret:
        name: minio-artifact-credentials
        key: accessKey
      secretKeySecret:
        name: minio-artifact-credentials
        key: secretKey
```

Select a non-default entry explicitly when testing:

```yaml
spec:
  artifactRepositoryRef:
    configMap: artifact-repositories
    key: minio
```

This eliminates ambiguity. A common incident is editing the controller's S3 settings while the Workflow actually selects a namespace ConfigMap entry, or testing MinIO while an old annotation still selects AWS.

The ConfigMap and referenced credential Secrets must be available where Argo expects them. The official repository configuration notes that credential Secret selectors are resolved in the namespace where the Workflow runs. Do not assume a Secret in the controller's `argo` namespace is visible to a Workflow in `workflows`.

## Verify the Local Output Before Blaming Storage

Consider a minimal output artifact:

```yaml
- name: build-report
  container:
    image: alpine:3.23
    command: [sh, -c]
    args:
      - |
        set -eu
        mkdir -p /work/out
        printf '{"status":"ok"}\n' > /work/out/report.json
  outputs:
    artifacts:
      - name: report
        path: /work/out/report.json
        archive:
          none: {}
```

Check the following:

- The path is absolute and matches the file the process creates.
- The file exists when the main container exits; a temporary-file cleanup trap has not removed it.
- The Argo executor can access that filesystem location with the installation's executor layout.
- A directory output is intentional; Argo archives directories by default.
- `archive.none` is used only when the destination should receive the file or directory without the normal tar/gzip packaging.

Some security contexts and executor arrangements cannot retrieve outputs reliably from the image's writable layer. Argo's official `emptyDir` guidance recommends mounting a shared volume for output parameters and artifacts in that situation:

```yaml
- name: build-report
  volumes:
    - name: out
      emptyDir: {}
  container:
    image: alpine:3.23
    command: [sh, -c]
    args: ['printf "done\n" > /mnt/out/report.txt']
    volumeMounts:
      - name: out
        mountPath: /mnt/out
  outputs:
    artifacts:
      - name: report
        path: /mnt/out/report.txt
```

If `stat` or `open` fails, fix this layer first. No cloud IAM change can make a nonexistent local file upload successfully.

## Amazon S3: Region, Identity, and Object Permissions

For AWS workload identity, configure the repository to use the SDK credential chain and run the Workflow with the correctly annotated or associated service account:

```yaml
# Repository entry
s3:
  bucket: company-workflow-artifacts
  endpoint: s3.amazonaws.com
  region: eu-west-1
  keyFormat: argo/{{workflow.namespace}}/{{workflow.name}}/{{pod.name}}
  useSDKCreds: true
```

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: workflow-runner
  namespace: workflows
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/argo-artifact-writer
```

```yaml
spec:
  serviceAccountName: workflow-runner
```

The executor runs in the Workflow Pod, so the Workflow's service account identity must be able to write the object. If the Argo Server must later display or download artifacts, its identity also needs the corresponding read access.

At minimum, an output-only path generally needs object write access for the allowed prefix. Reading input artifacts needs object read access. Listing, bucket-location discovery, multipart upload, encryption, and artifact garbage collection can require additional operations depending on configuration. Derive the policy from the features you actually use rather than granting the bucket globally.

Check:

- the bucket's real region matches `region`;
- the role trust relationship matches the cluster's workload identity and service account subject;
- the object-resource ARN includes the required prefix and `/*` where appropriate;
- a bucket policy, VPC endpoint policy, organization policy, or KMS key policy is not denying the write;
- server-side encryption requirements are satisfied;
- the Pod can reach the selected S3 endpoint.

`AccessDenied` does not always mean the IAM role lacks `PutObject`. An explicit deny in any applicable policy, or missing permission on a customer-managed KMS key, produces the same top-level symptom.

## MinIO: Endpoint, TLS Mode, and Credentials

MinIO uses Argo's S3 driver, but its endpoint is normally a Kubernetes Service rather than `s3.amazonaws.com`:

```yaml
s3:
  bucket: argo-artifacts
  endpoint: minio.storage.svc.cluster.local:9000
  insecure: true
  accessKeySecret:
    name: minio-artifact-credentials
    key: accessKey
  secretKeySecret:
    name: minio-artifact-credentials
    key: secretKey
```

`insecure: true` means the endpoint uses plain HTTP. It is not a switch to ignore certificate validation. For TLS-enabled MinIO, use `insecure: false` or omit the insecure setting. If MinIO presents a certificate issued by a private CA, store that CA certificate in a Secret and reference it with the driver's `caSecret` fields as documented by Argo.

From a temporary diagnostic Pod in the same namespace and under the same NetworkPolicy, test DNS and TCP reachability:

```bash
kubectl run -n workflows artifact-netcheck --rm -it \
  --image=curlimages/curl --restart=Never -- \
  curl -v http://minio.storage.svc.cluster.local:9000/minio/health/live
```

Use `https://` for a TLS endpoint. This proves only network and TLS reachability, not S3 authorization.

Also verify that:

- the bucket already exists;
- Secret key names match the selectors exactly;
- credentials have write permission for the target prefix;
- the endpoint resolves from Workflow Pods, not only from the controller;
- an ingress or proxy is not rewriting S3 requests unexpectedly.

Do not put `http://` into the S3 `endpoint` value when following Argo's documented S3 repository form; supply the host and port and control transport with `insecure`.

## Native GCS: Choose One Authentication Path

Argo can access Google Cloud Storage through its native GCS driver:

```yaml
gcs:
  bucket: company-workflow-artifacts
  keyFormat: argo/{{workflow.namespace}}/{{workflow.name}}/{{pod.name}}
  serviceAccountKeySecret:
    name: gcs-artifact-credentials
    key: serviceAccountKey
```

The selected Secret key must contain the service account JSON credential. On GKE with Workload Identity configured, Argo's documentation says the `serviceAccountKeySecret` is unnecessary; the Workflow service account must instead be mapped to a Google identity with appropriate bucket permissions.

Check:

- the Workflow Pod uses the intended Kubernetes service account;
- Workload Identity mapping and IAM binding refer to that exact namespace/name pair;
- the Google identity can create objects in the bucket and read them if later consumption is required;
- VPC Service Controls, private access, or egress policy permits the storage API;
- the bucket name, project context, and object prefix are correct.

GCS also offers S3 interoperability. That is a different configuration using Argo's `s3` driver, `storage.googleapis.com`, and interoperability access/secret keys. Do not combine native `gcs.serviceAccountKeySecret` fields with S3 interoperability fields in the same repository object.

## Azure Blob Storage: Endpoint, Container, and Credential Type

For managed identity, use the Azure SDK credential chain:

```yaml
azure:
  endpoint: https://workflowstore.blob.core.windows.net
  container: argo-artifacts
  blobNameFormat: argo/{{workflow.namespace}}/{{workflow.name}}/{{pod.name}}
  useSDKCreds: true
```

For a storage account access key, use a Secret selector instead:

```yaml
azure:
  endpoint: https://workflowstore.blob.core.windows.net
  container: argo-artifacts
  blobNameFormat: argo/{{workflow.namespace}}/{{workflow.name}}/{{pod.name}}
  accountKeySecret:
    name: azure-artifact-credentials
    key: account-access-key
```

Argo also documents Shared Access Signature authentication through `accountKeySecret`. Make sure the value and permissions correspond to the credential type you chose. A SAS can be syntactically valid but expired, not yet valid because of clock skew, restricted to another container, or missing create/write permission.

Check:

- the endpoint belongs to the expected storage account and cloud environment;
- the Blob container already exists;
- the managed identity is actually assigned to the Workflow Pod environment;
- Azure RBAC grants a data-plane Blob role, not only management-plane access to the storage account;
- a SAS has an adequate validity window and object permissions;
- private endpoint DNS and NetworkPolicy route the Pod to the intended address.

For identity-based authentication, a successful `az account show` somewhere else is not proof that the executor Pod has the same identity. Inspect the Pod's service account and identity injection directly.

## Test with a Minimal Artifact Workflow

Reduce the problem to one small file and explicitly select the repository under test:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: artifact-smoke-
  namespace: workflows
spec:
  serviceAccountName: workflow-runner
  artifactRepositoryRef:
    configMap: artifact-repositories
    key: aws-s3
  entrypoint: write
  templates:
    - name: write
      container:
        image: alpine:3.23
        command: [sh, -c]
        args: ['date -u > /tmp/probe.txt']
      outputs:
        artifacts:
          - name: probe
            path: /tmp/probe.txt
            archive:
              none: {}
```

Submit and retain the Pod while diagnosing:

```bash
argo submit -n workflows artifact-smoke.yaml --watch
argo get -n workflows @latest
```

If this succeeds, the repository and base identity path work. Reintroduce the original workflow's service account, output path, archive strategy, key, artifact size, and policy constraints one at a time.

## Large Artifact and Compression Failures

Argo tar-gzips output artifacts by default. That changes CPU, memory, temporary storage, transfer time, and the object name users expect to download. The Artifacts documentation provides archive strategies to disable packaging or adjust compression.

For an already-compressed build image or multi-gigabyte cache, consider:

```yaml
outputs:
  artifacts:
    - name: cache
      path: /work/cache.tar.zst
      archive:
        none: {}
```

Then size the Pod and executor resources for the actual operation. An executor OOM, eviction for ephemeral-storage pressure, or deadline expiration is not a cloud authorization error even if the final status says the artifact could not be saved.

Check Pod status and events:

```bash
kubectl get pod -n workflows <pod-name> -o yaml
kubectl get events -n workflows \
  --field-selector involvedObject.name=<pod-name> \
  --sort-by=.lastTimestamp
```

Also ensure the object key is unique enough. Argo's artifact documentation warns that artifact garbage collection can delete a key reused by another Workflow. Include Workflow- and Pod-specific values in the repository's key or blob format unless deliberate overwriting is part of the design.

## A Reliable Troubleshooting Order

Use this order to avoid changing multiple layers at once:

1. Read the `wait`, `init`, or `supervisor` error from the failed Pod.
2. Confirm `artifactRepositoryRef` and the effective default repository.
3. Verify the output file or directory exists at the declared path.
4. Check that referenced Secrets and Secret keys exist in the Workflow namespace.
5. Confirm the Workflow service account and workload identity injection.
6. Test DNS, TCP, TLS, proxy, and NetworkPolicy from the Workflow namespace.
7. Verify bucket/container existence, region/endpoint, and object prefix.
8. Inspect every applicable IAM, bucket, endpoint, KMS, or SAS policy for explicit denies.
9. Run the minimal smoke Workflow against the same repository entry.
10. Only then investigate size, compression, retries, and executor resource limits.

An artifact upload is a separate part of node execution, so treat it as a small storage transaction with a known caller, local source, remote destination, and credential. Once those four facts are explicit, most `failed to save outputs` incidents become straightforward to isolate.

## Official Documentation

- [Argo Workflows: Configuring Your Artifact Repository](https://argo-workflows.readthedocs.io/en/latest/configure-artifact-repository/)
- [Argo Workflows: Artifact Repository Ref](https://argo-workflows.readthedocs.io/en/latest/artifact-repository-ref/)
- [Argo Workflows: Artifacts](https://argo-workflows.readthedocs.io/en/latest/walk-through/artifacts/)
- [Argo Workflows: Empty Dir for Outputs](https://argo-workflows.readthedocs.io/en/latest/empty-dir/)
- [Argo Workflows: Init-less Pod Layout](https://argo-workflows.readthedocs.io/en/latest/initless-pod/)
- [Argo Workflows: Field Reference](https://argo-workflows.readthedocs.io/en/latest/fields/)
