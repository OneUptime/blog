# How to Select and Modify One Kubernetes Resource in Multi-Document YAML with yq

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, YAML, Bash, Configuration Management, Automation

Description: Select one Kubernetes object by stable identity and update it with Mike Farah yq v4 without dropping neighboring YAML documents.

---

A Kubernetes bundle is a YAML stream: each `---` begins another document. The safe way to update one object while preserving the whole stream is to put the selector on the left side of an assignment:

```bash
yq '
  (select(
    .apiVersion == "apps/v1" and
    .kind == "Deployment" and
    .metadata.name == "api"
  ) | .spec.replicas) = 3
' bundle.yaml
```

Matching documents are changed. Nonmatching documents pass through unchanged and retain their document boundaries.

## Use the Resource Identity, Not Its Position

Suppose `bundle.yaml` contains:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  selector:
    app: api
  ports:
    - port: 80
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: registry.example.com/api:v1
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
spec:
  replicas: 1
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      containers:
        - name: worker
          image: registry.example.com/worker:v1
```

Preview the update:

```bash
yq '
  (select(
    .apiVersion == "apps/v1" and
    .kind == "Deployment" and
    .metadata.name == "api"
  ) | .spec.replicas) = 3
' bundle.yaml
```

The Service and worker Deployment are emitted unchanged. Only the `api` Deployment gets `replicas: 3`.

Selecting by `di == 1` would also happen to work for this file, but document index is not resource identity. Adding a Namespace at the start of the bundle would silently retarget the edit. Match stable Kubernetes fields instead.

## Why the Parentheses Matter

This expression filters the output stream first:

```bash
yq '
  select(.kind == "Deployment" and .metadata.name == "api") |
  .spec.replicas = 3
' bundle.yaml
```

It prints only the selected Deployment. Replacing the bundle with that output would discard every other resource. Do not redirect directly to the input file with `> bundle.yaml`: Bash truncates it before yq reads it.

In the safe form, the complete selector and leaf path are the assignment target:

```bash
yq '
  (select(.kind == "Deployment" and .metadata.name == "api") |
   .spec.replicas) = 3
' bundle.yaml
```

The assignment operates against each original document, so roots that do not produce a target remain intact.

## Include Namespace When It Matters

Names are unique within the relevant Kubernetes scope, not across an arbitrary bundle. Two namespaces can each contain a Deployment named `api`.

For a namespaced resource, include the namespace and define how an omitted namespace is interpreted. Here, an omitted namespace means `default`; when applying with kubectl, the actual namespace can instead come from `--namespace` or the current context:

```bash
yq '
  (select(
    .apiVersion == "apps/v1" and
    .kind == "Deployment" and
    .metadata.name == "api" and
    ((.metadata.namespace // "default") == "default")
  ) | .spec.replicas) = 3
' bundle.yaml
```

Do not add a namespace predicate to cluster-scoped kinds. For custom resources, include the exact `apiVersion` as well as kind, name, and namespace so similarly named objects from different API groups cannot collide. The version selects the manifest representation; Kubernetes object identity itself uses the API group, resource type, name, and namespace, not the API version.

## Pass a Typed Value from Bash

`strenv` always creates a YAML string, while `env` parses the environment value as YAML. A replica count must be an integer:

```bash
KIND=Deployment \
RESOURCE_NAME=api \
NAMESPACE=default \
REPLICAS=3 \
yq '
  (select(
    .kind == strenv(KIND) and
    .metadata.name == strenv(RESOURCE_NAME) and
    ((.metadata.namespace // "default") == strenv(NAMESPACE))
  ) | .spec.replicas) = env(REPLICAS)
' bundle.yaml
```

Validate shell-supplied identity fields before using them. yq string equality supports wildcard matching, so an unexpected `*` or `?` can broaden a match. Valid Kubernetes names do not contain those characters; rejecting invalid input protects the assumption.

Also verify the value type and range: Deployment replicas must fit a nonnegative 32-bit signed integer.

```bash
REPLICAS=3 yq -n -e '
  ((env(REPLICAS) | tag) == "!!int") and
  (env(REPLICAS) >= 0) and
  (env(REPLICAS) <= 2147483647)
' >/dev/null
```

## Prove There Is Exactly One Match

A selected-path assignment that finds nothing can still print each unchanged root document. Adding `-e` to that simple update does not prove that a resource matched, because the unchanged documents are non-null and truthy.

Count the selected resources across the complete stream:

```bash
yq eval-all '
  [select(
    .apiVersion == "apps/v1" and
    .kind == "Deployment" and
    .metadata.name == "api" and
    ((.metadata.namespace // "default") == "default")
  )] | length
' bundle.yaml
```

For a guarded transformation, collect every document, require exactly one identity match, emit the documents again, and restore separators with `split_doc`:

```bash
REPLICAS=3 yq eval-all -e '
  [.] |
  select((map(select(
    .apiVersion == "apps/v1" and
    .kind == "Deployment" and
    .metadata.name == "api" and
    ((.metadata.namespace // "default") == "default")
  )) | length) == 1) |
  .[] |
  (select(
    .apiVersion == "apps/v1" and
    .kind == "Deployment" and
    .metadata.name == "api" and
    ((.metadata.namespace // "default") == "default")
  ) | .spec.replicas) = env(REPLICAS) |
  split_doc
' bundle.yaml
```

If the identity matches zero or several documents, `select` emits nothing and `-e` returns a nonzero status. `split_doc` is necessary here because extracting documents from the collected array otherwise makes them results of one synthetic document, so normal separator logic cannot distinguish them.

## Replace the File Only After the Guard Passes

Use a temporary output for the all-document guard:

```bash
candidate=$(mktemp ./bundle.next.XXXXXX)

if REPLICAS=3 yq ea -e '
  [.] |
  select((map(select(
    .apiVersion == "apps/v1" and
    .kind == "Deployment" and
    .metadata.name == "api"
  )) | length) == 1) |
  .[] |
  (select(
    .apiVersion == "apps/v1" and
    .kind == "Deployment" and
    .metadata.name == "api"
  ) | .spec.replicas) = env(REPLICAS) |
  split_doc
' bundle.yaml > "$candidate"; then
  mv "$candidate" bundle.yaml
else
  rm -f "$candidate"
  exit 1
fi
```

For a reviewed, known-single-match edit, the shorter in-place form is available:

```bash
yq -i '
  (select(.kind == "Deployment" and .metadata.name == "api") |
   .spec.replicas) = 3
' bundle.yaml
```

Preview before adding `-i`, and keep the exact-one check when an automated job must fail closed.

## Update Several Fields on the Same Resource

Use `with` to establish the selected object as a temporary context:

```bash
yq '
  with(select(.kind == "Deployment" and .metadata.name == "api");
    .spec.replicas = 3 |
    (.spec.template.spec.containers[] | select(.name == "api")).image =
      "registry.example.com/api:v2"
  )
' bundle.yaml
```

The outer `with` still preserves nonmatching root documents. If container identity must also be unique, count it before mutation just as you count the resource.

## Review Serialization Changes

yq attempts to preserve comments and scalar style, but the underlying YAML library cannot preserve every formatting detail. Inspect the complete diff, particularly around anchors, aliases, comments, folded strings, and document separators. The semantic resource identity check protects targeting; it does not guarantee byte-for-byte preservation of unrelated formatting.

## Conclusion

Select Kubernetes objects by API version, kind, name, and namespace where applicable. Put that selection inside the left side of the assignment so neighboring documents remain in the stream. For automation, count matches across all documents and require exactly one before replacing the file; a plain `-e` on an update is not a uniqueness check.

## Official Documentation

- [Mike Farah yq: Select Operator](https://mikefarah.gitbook.io/yq/operators/select)
- [Mike Farah yq: Assign Update Operator](https://mikefarah.gitbook.io/yq/operators/assign-update)
- [Mike Farah yq: Split into Documents](https://mikefarah.gitbook.io/yq/operators/split-into-documents)
- [Mike Farah yq: Document Index](https://mikefarah.gitbook.io/yq/operators/document-index)
- [Kubernetes: Objects in Kubernetes](https://kubernetes.io/docs/concepts/overview/working-with-objects/)
- [Mike Farah yq v4.53.6 Release](https://github.com/mikefarah/yq/releases/tag/v4.53.6)
