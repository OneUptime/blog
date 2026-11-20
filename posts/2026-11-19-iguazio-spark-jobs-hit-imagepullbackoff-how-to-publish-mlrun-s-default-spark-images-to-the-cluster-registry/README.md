# Fix Iguazio Spark `ImagePullBackOff` by Publishing MLRun Spark Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MLOps, Apache Spark, Kubernetes, Troubleshooting

Description: Diagnose missing MLRun Spark images, publish the runtime-specific default image, and separate registry failures from Spark execution errors.

A Spark run can fail before Spark executes any application code. If Kubernetes reports `ImagePullBackOff`, first identify which pod and image failed. Rebuilding your notebook environment will not make that image appear in the cluster registry.

Kubernetes uses this status when an image pull fails and subsequent attempts are delayed. The underlying event carries the useful cause: a missing manifest, denied credentials, a network failure, or another registry error. [Kubernetes image documentation](https://kubernetes.io/docs/concepts/containers/images/)

## Find the exact image reference

Use the namespace and pod shown for the failed MLRun run. These commands inspect existing resources:

```bash
JOB_NAMESPACE=your-project-namespace
SPARK_POD=your-failing-pod

kubectl -n "$JOB_NAMESPACE" get pod "$SPARK_POD" -o wide
kubectl -n "$JOB_NAMESPACE" describe pod "$SPARK_POD"
kubectl -n "$JOB_NAMESPACE" get pod "$SPARK_POD" \
  -o jsonpath='{range .spec.containers[*]}{.name}{"\t"}{.image}{"\n"}{end}'
kubectl -n "$JOB_NAMESPACE" get pod "$SPARK_POD" \
  -o jsonpath='{range .spec.initContainers[*]}{.name}{"\t"}{.image}{"\n"}{end}'
```

Record the complete registry, repository, and tag or digest. Inspect init containers too: a failing helper image can prevent the application container from starting even when its own image exists.

Compare that reference with the successful build's published destination. Similar repository names are insufficient. For example, publishing an image under one project prefix does not satisfy a pod requesting the same tag under another prefix. Preserve the event text before retrying so you can tell whether the failure changes.

## Choose the matching Spark runtime

MLRun documents two default-image helpers. For `remote-spark`, the image runs the MLRun submitter that submits work to the Spark service. For the Spark operator, the image runs the driver and executors. Both need compatible Spark and MLRun dependencies, and MLRun directs users to recreate the image when either version changes. [MLRun image-build guide](https://docs.mlrun.org/en/stable/runtimes/image-build.html)

Run the applicable branch from a client aligned with the installed MLRun release and connected to the intended cluster. Replace `your-project-name` with the affected existing project to establish its project context. This operation builds and publishes an image; it is not a read-only diagnostic.

```python
import mlrun

# Use the project that owns the affected Spark workload.
mlrun.get_or_create_project("your-project-name")

# Choose this branch for a remote-spark function.
from mlrun.runtimes import RemoteSparkRuntime

RemoteSparkRuntime.deploy_default_image()
```

For a Spark operator function, use the other documented helper instead:

```python
import mlrun
from mlrun.runtimes import Spark3Runtime

mlrun.get_or_create_project("your-project-name")
Spark3Runtime.deploy_default_image()
```

Check your release's documentation before using these helpers, particularly on older Iguazio installations. Do not substitute an arbitrary current MLRun client into an older Spark service just to obtain a missing method.

## Publish to the registry the cluster uses

Iguazio's MLRun service settings control its registry configuration; installations can use the platform registry or an external registry. Verify that configuration and the build output before changing the function's image reference. [Iguazio MLRun service documentation](https://www.iguazio.com/docs/latest-release/services/app-services/mlops-services/mlops-services/)

A successful build must be followed by a successful push to the expected destination. If the builder reports an authorization failure, repair its push permissions. If the push succeeds but the pod cannot pull, investigate the runtime's pull credentials and network path separately. These identities may have different permissions.

Inspect the pod's selected pull secrets without displaying their values:

```bash
kubectl -n "$JOB_NAMESPACE" get pod "$SPARK_POD" \
  -o jsonpath='{.spec.serviceAccountName}{"\n"}{.spec.imagePullSecrets}{"\n"}'
```

Kubernetes image-pull secrets must be available in the pod's namespace. A secret in the notebook namespace does not automatically satisfy a job in another namespace. [Kubernetes private-registry guidance](https://kubernetes.io/docs/concepts/containers/images/#using-a-private-registry)

## Interpret the next failure precisely

A `manifest unknown` response suggests checking the repository and published tag. An authentication or authorization response suggests checking registry access. Certificate errors require checking the registry certificate chain and node trust configuration. A connection timeout requires checking connectivity from the cluster's image-pulling environment, not merely from your laptop.

After correcting the cause, submit a small Spark job and inspect every relevant pod. For the operator runtime, verify both driver and executor images. A driver that starts successfully does not prove executors use an accessible reference.

Finally, distinguish recovery stages in your incident notes: image published, image pulled, container started, and Spark application completed. Only the last stage proves the workload works. If the previously blocked container starts and then reports a Python import failure or Spark version mismatch, investigate that runtime compatibility problem separately. This does not prove that every driver or executor can pull its image; confirm pulls in the relevant pod events.
