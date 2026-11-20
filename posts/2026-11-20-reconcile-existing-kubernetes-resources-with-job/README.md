# Reconcile Existing Kubernetes Resources with a Bounded Job

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Python, Automation

Description: Backfill existing resources with a scoped reconciliation Job that previews patches, preserves user values, checks concurrent changes, and reports partial progress.

Installing a webhook does not revisit every object already stored in Kubernetes. Admission reacts to matching API requests. If you introduce a new default today, yesterday's resources can remain unchanged until an appropriate request passes through the relevant handler.

A reconciliation Job addresses that separate problem: inspect a bounded set of existing objects, compare them with the intended state, and make only the necessary changes. It should share the mutation contract with future admission without pretending that an arbitrary update is the same as a create request.

This example targets **Kubernetes v1.35.0**, **Python 3.11**, and the official **kubernetes Python client 35.0.0**. It adds a missing annotation to explicitly selected ConfigMaps in one namespace. It does not edit ConfigMap data or running Pod specifications.

## Choose an update that is legal and owned

Decide which resource actually needs to change. For a missing ConfigMap annotation, patching the existing ConfigMap can be appropriate. For container injection, changing an existing Pod's container layout is generally not an available update path. You may need to change the owning workload template and perform a reviewed rollout instead. Consult the [Pod update restrictions](https://kubernetes.io/docs/concepts/workloads/pods/#pod-update-and-replacement).

In this example, objects labelled `migration.example.com/target=profile-v1` are candidates. The desired default is `platform.example.com/profile: standard`. Existing values, including a deliberately different profile, are preserved. Replace these domain prefixes and values with your own approved contract.

A selector narrows what the worker chooses; it does not narrow the permissions granted to its service account. Treat permission scope and selection logic as separate controls.

## Use a worker that previews by default

Save the following as `reconcile.py` and package it with `kubernetes==35.0.0` in your approved image. The worker is intended to run inside a Pod using its service account. The official client provides [in-cluster configuration loading](https://github.com/kubernetes-client/python/blob/v35.0.0/examples/in_cluster_config.py).

```python
import argparse
from kubernetes import client, config

KEY = "platform.example.com/profile"
SELECTOR = "migration.example.com/target=profile-v1"


def reconcile(api, namespace, apply=False):
    token = None
    while True:
        page = api.list_namespaced_config_map(
            namespace, label_selector=SELECTOR, limit=100,
            _continue=token, _request_timeout=(5, 20),
        )
        for item in page.items:
            meta = item.metadata
            annotations = meta.annotations
            if annotations is not None and KEY in annotations:
                print(f"skip {meta.name}: explicit profile exists")
                continue
            patch = [
                {"op": "test", "path": "/metadata/uid", "value": meta.uid},
                {"op": "test", "path": "/metadata/resourceVersion",
                 "value": meta.resource_version},
            ]
            if annotations is None:
                patch.append({"op": "add", "path": "/metadata/annotations",
                              "value": {KEY: "standard"}})
            else:
                escaped = KEY.replace("~", "~0").replace("/", "~1")
                patch.append({"op": "add", "path": f"/metadata/annotations/{escaped}",
                              "value": "standard"})
            api.patch_namespaced_config_map(
                meta.name, namespace, patch,
                dry_run=None if apply else "All", _request_timeout=(5, 20),
            )
            print(f"{'applied' if apply else 'previewed'} {meta.name}")
        token = page.metadata._continue
        if not token:
            return


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--namespace", required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    config.load_incluster_config()
    reconcile(client.CoreV1Api(), args.namespace, args.apply)
```

The list is paginated rather than assuming every object fits in one response. The client methods and their `label_selector`, `_continue`, `dry_run`, and timeout arguments are present in the [35.0.0 generated API](https://github.com/kubernetes-client/python/blob/v35.0.0/kubernetes/client/api/core_v1_api.py). This version sends the list of operations as JSON Patch.

Without `--apply`, each patch is submitted with `dryRun=All`: the API server evaluates the request without storing its changes. This is stronger than printing an unvalidated patch, but it still invokes applicable admission and requires patch authorization. See the [API dry-run and update semantics](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run).

Both UID and resource version are tested before mutation. A deleted-and-recreated object or a concurrent update must not be silently overwritten. If a precondition fails, the worker stops rather than repeatedly applying a stale patch. The [JSON Patch standard](https://www.rfc-editor.org/rfc/rfc6902) defines those tests.

## Give the Job narrow permissions

Create a dedicated ServiceAccount named `profile-reconciler` in the target namespace, illustrated here as `team-canary`. Bind it through a namespaced RoleBinding to a Role with these rules:

```yaml
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["list", "patch"]
```

This is a Role fragment, not a complete RBAC manifest. It grants access to ConfigMaps in that Role's namespace; it does not grant cluster-wide access. The worker does not need permissions for Secrets, Pods, or deployments.

Kubernetes RBAC does not make that label selector a field-level authorization boundary. The service account can patch ConfigMaps allowed by its Role, including objects outside the worker's selector if the code were changed. Review the image and permissions accordingly. The [RBAC documentation](https://kubernetes.io/docs/reference/access-authn-authz/rbac/) explains namespaced Roles and bindings.

## Package a finite preview run

Build an approved image containing Python 3.11, the pinned client, and `/app/reconcile.py`. Replace the image placeholder below with that image's verified digest before use. Do not install dependencies from the network each time the Job starts.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: profile-preview-20261120
  namespace: team-canary
spec:
  backoffLimit: 0
  activeDeadlineSeconds: 300
  template:
    spec:
      serviceAccountName: profile-reconciler
      restartPolicy: Never
      containers:
        - name: reconcile
          image: registry.example.internal/platform/reconciler:REPLACE_WITH_PINNED_IMAGE
          command: ["python3", "/app/reconcile.py"]
          args: ["--namespace", "team-canary"]
```

The manifest runs the preview because its arguments omit `--apply`. It assumes the ServiceAccount and binding already exist. Apply your organization's normal image, resource, and container security requirements before deployment; this focused manifest is not a complete platform hardening profile.

`backoffLimit: 0` avoids automatically retrying a failed run, and `activeDeadlineSeconds` bounds its duration. A Job is not an exactly-once execution guarantee, so the worker must still tolerate repeated processing. Kubernetes documents these execution and retry details in the [Job controller guide](https://kubernetes.io/docs/concepts/workloads/controllers/job/).

## Review the result before making persistent changes

Inspect the selected object inventory and preview outcomes. Existing explicit profiles should be skipped, and missing profiles should preview successfully. Check representative responses or follow-up dry runs to confirm other admission components do not remove or rewrite the intended annotation. A successful PATCH response can include additional admission changes.

After approval, create a separately named execution Job from the reviewed image with `--apply` added to its arguments. Keep the namespace and selector unchanged for that cohort. Use a fresh Job name rather than assuming you can edit the completed Job's Pod template in place.

Any API failure stops this simple worker. Earlier successful patches remain applied: the run is not a transaction across ConfigMaps. Preserve its logs and distinguish completed, skipped, and unprocessed objects before deciding how to resume.

For conflicts, fetch a fresh inventory and review the changed objects. For an expired list continuation token, restart from a new list. Re-running is safe for already annotated objects because the worker skips explicit profiles, but it is not automatic permission to ignore a new ownership conflict or broader scope change.

## Check correctness beyond the Job's exit code

After execution, list the same selected objects and verify the intended annotation. The worker does not continuously reconcile drift, update GitOps manifests, or change application behavior by itself. Align the source of truth so a later deployment does not remove the new setting.

The code was tested locally with the pinned client, mocked API responses, pagination, existing annotations, patch preconditions, dry-run versus apply arguments, and failure propagation. No cluster objects were modified. A production acceptance test must additionally verify authorization, admission interactions, API-server concurrency behavior, and the actual effect of the annotation on its consumers.
