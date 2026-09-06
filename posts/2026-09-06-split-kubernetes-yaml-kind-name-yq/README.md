# How to Split Kubernetes YAML into Files Named by Kind and Resource Name with yq

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, YAML, Bash, Configuration Management, Automation

Description: Split a multi-document Kubernetes YAML stream into predictable per-resource files with Mike Farah yq v4 and collision-safe names.

---

Mike Farah yq can route each result to a different file with `--split-exp`, or `-s`. The split expression runs against each result and returns its output filename.

For a validated Kubernetes bundle, this command creates names such as `out/configmap-api-settings.yaml` and `out/deployment-api.yaml`:

```bash
yq --no-doc \
  --split-exp '"out/" + (.kind | downcase) + "-" + .metadata.name + ".yaml"' \
  '.' bundle.yaml
```

The final `.` is the main yq expression. It emits every input document unchanged. `--split-exp` determines where each emitted document is written.

## Split a Multi-Document Bundle

Given `bundle.yaml` (the Deployment is abbreviated for this splitting example and is not ready to apply):

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: payments
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-settings
  namespace: payments
data:
  LOG_LEVEL: info
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: payments
spec:
  replicas: 2
```

Run:

```bash
yq --no-doc \
  -s '"out/" + (.kind | downcase) + "-" + .metadata.name + ".yaml"' \
  '.' bundle.yaml
```

yq creates the needed output directory and writes:

```text
out/namespace-payments.yaml
out/configmap-api-settings.yaml
out/deployment-api.yaml
```

Each file contains the entire corresponding input document. `--no-doc` suppresses a leading `---` in each standalone file.

## Add the Extension Yourself

The split writer normally adds an extension when the expression returns a name without one. Add `.yaml` explicitly anyway:

```text
"out/" + (.kind | downcase) + "-" + .metadata.name + ".yaml"
```

Kubernetes names may contain dots. A name such as `api.example.com` already looks like it ends in a file extension, so relying on automatic extension detection can produce a file ending in `.com` instead of `.yml`. An explicit suffix avoids that ambiguity.

## Validate Filename Components

The split expression controls filesystem paths and yq creates directories it needs. Never feed unvalidated arbitrary values into that expression.

For the simple kind-name scheme, require a Kubernetes-like resource name and a simple kind token:

```bash
yq ea -e '
  [.] |
  ((length > 0) and
   all_c(
     ((.kind | tag) == "!!str") and
     (.kind | test("^[A-Za-z][A-Za-z0-9]*$")) and
     ((.metadata.name | tag) == "!!str") and
     (.metadata.name |
       test("^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$"))
   ))
' bundle.yaml >/dev/null
```

This rejects missing names, slashes, path traversal tokens, whitespace, and unexpected kind punctuation. It is a filesystem safety gate for this naming convention, not a complete Kubernetes API schema check. Kubernetes resource types can impose additional name rules.

## Detect Filename Collisions Before Splitting

The split writer creates or truncates each selected filename. If two resources produce the same name, a later result can overwrite an earlier one. Check uniqueness first:

```bash
yq ea -e '
  [. |
    [(.kind | downcase), .metadata.name] |
    join("/")
  ] |
  length == (unique | length)
' bundle.yaml >/dev/null
```

This check deliberately builds each identity string while the corresponding document is still the evaluation context, then collects all identities. Two Deployments named `api` in different namespaces collide under the simple filename scheme and cause the check to fail.

Only split after both the component validation and collision check succeed.

## Include Namespace for Cross-Namespace Bundles

When the bundle can contain equal kind-name pairs in different namespaces, validate any namespace field before using it in a filename:

```bash
yq ea -e '
  [. |
    (
      ((.metadata | has("namespace")) == false) or
      (
        (([.metadata.namespace] | .[0] | tag) == "!!str") and
        (([.metadata.namespace] | .[0]) |
          test("^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$"))
      )
    )
  ] | all
' bundle.yaml >/dev/null
```

Then include the namespace in the filename:

```bash
yq --no-doc \
  -s '"out/" +
      (.metadata.namespace // "_none") + "-" +
      (.kind | downcase) + "-" +
      .metadata.name + ".yaml"' \
  '.' bundle.yaml
```

This yields names such as:

```text
out/payments-deployment-api.yaml
out/_none-namespace-payments.yaml
```

`_none` is a local marker for an absent namespace field. It cannot be a Kubernetes namespace because underscores are not allowed, but it does not prove that the kind is cluster-scoped. A namespaced object can also omit its namespace and rely on the client's default. Distinguishing namespaced from cluster-scoped kinds requires Kubernetes API discovery or a trusted schema.

Before running the namespace-aware split, preflight the actual generated filenames as well. Hyphens in namespaces and names can make distinct identity tuples produce the same filename:

```bash
yq ea -e '
  [. |
    "out/" + (.metadata.namespace // "_none") + "-" +
    (.kind | downcase) + "-" + .metadata.name + ".yaml"
  ] |
  length == (unique | length)
' bundle.yaml >/dev/null
```

For bundles containing resources from several API groups, kind, namespace, and name may still be insufficient. Add a sanitized API group or fail on any generated filename collision.

## Stage Output in a Fresh Directory

Splitting directly into a long-lived directory can leave stale files from a previous bundle. It can also overwrite files before a later document fails.

Use a fresh staging directory, inspect it, then publish it as a unit according to the guarantees of your filesystem and deployment process:

```bash
output_dir=$(mktemp -d ./split-stage.XXXXXX)

OUT_DIR=$output_dir yq --no-doc \
  -s 'strenv(OUT_DIR) + "/" +
      (.kind | downcase) + "-" +
      .metadata.name + ".yaml"' \
  '.' bundle.yaml

find "$output_dir" -type f -print
```

The name and collision validation must run before this step. `strenv(OUT_DIR)` treats the shell value as a literal string instead of yq code.

## Split a Kubernetes `List`

A multi-document stream and a Kubernetes `List` are different shapes. This document contains one resource whose `items` field holds other resources:

```yaml
apiVersion: v1
kind: List
items:
  - apiVersion: v1
    kind: ConfigMap
    metadata:
      name: first
  - apiVersion: v1
    kind: ConfigMap
    metadata:
      name: second
```

Emit each array item as a result before splitting. First apply the component validation and collision checks above to the items: replace the initial `[.]` with `[.items[]]` in the component check and the initial `[. |` with `[.items[] |` in the collision check, and use `list.yaml` as the input:

```bash
yq --no-doc \
  -s '"out/" + (.kind | downcase) + "-" + .metadata.name + ".yaml"' \
  '.items[]' list.yaml
```

Do not use `.items[]` on a normal multi-document bundle. Choose the main expression based on the actual input structure.

## Use `$index` Only When Identity Is Unavailable

The split expression can reference `$index`, which counts emitted results. An indexed name is useful for anonymous data:

```bash
yq -s '"out/resource-" + ($index | to_string) + ".yaml"' \
  '.' bundle.yaml
```

For Kubernetes resources, indexes are less stable than kind, namespace, and name. Inserting a document changes every later filename, so prefer semantic identity and reject missing metadata.

## Keep Output YAML

The main expression should return each complete resource. Selecting only `.spec`, converting to JSON, or aggregating results changes what is written. Keep `.` as the expression and use the split expression solely for routing.

If downstream tools require canonical formatting, apply that transformation intentionally and review comments, anchors, scalar styles, and document metadata. Splitting itself should not be used as an accidental normalization step.

## Conclusion

Use `--split-exp` with a filename derived from validated resource identity, add `.yaml` explicitly, and use `--no-doc` for standalone files. Preflight duplicate generated names because the split writer can overwrite collisions, include namespace when needed, and stage into a fresh directory so stale or partial output cannot masquerade as the current bundle.

## Official Documentation

- [Mike Farah yq: Split into Multiple Files](https://mikefarah.gitbook.io/yq/usage/split-into-multiple-files)
- [Mike Farah yq: File Operators](https://mikefarah.gitbook.io/yq/operators/file-operators)
- [Mike Farah yq: String Operators](https://mikefarah.gitbook.io/yq/operators/string-operators)
- [Kubernetes: Object Names and IDs](https://kubernetes.io/docs/concepts/overview/working-with-objects/names/)
- [Mike Farah yq v4.53.6 Split Writer](https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/printer_writer.go)
