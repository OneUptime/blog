# How to Edit YAML Comments, Anchors, Aliases, and Scalar Styles with yq

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YAML, Configuration Management, Command Line, Automation, DevOps

Description: Read and edit YAML comments, anchors, aliases, merge keys, and scalar presentation styles with Mike Farah yq v4 while preserving semantics.

---

YAML carries presentation metadata that JSON does not: comments, anchors, aliases, and scalar styles. Mike Farah yq v4 exposes operators for each, but these features live on specific YAML nodes. A comment beside a map can belong to its key node, an alias is not the same as its resolved value, and quoting a non-string can change how another parser reads it.

Preview these edits and inspect the serialized result before adding `-i`.

## Edit Comments on Scalar Values

Given `config.yml`:

```yaml
# Runtime defaults
defaults: &defaults
  timeout: 5s # request timeout
  message: >-
    retry later
api:
  <<: *defaults
  replicas: 2
```

Set the line comment on `timeout`:

```bash
yq '.defaults.timeout line_comment = "maximum request duration"' \
  config.yml
```

The output contains:

```yaml
defaults: &defaults
  timeout: 5s # maximum request duration
```

Read comment text as data:

```bash
yq '.defaults.timeout | line_comment' config.yml
```

The comment operator returns the text without the `#` marker.

## Target the Key Node for Maps and Sequences

Line comments attached to maps and sequences are commonly stored on the map key node rather than the value node. Set a comment on the `defaults` key like this:

```bash
yq '(.defaults | key) line_comment = "shared service settings"' \
  config.yml
```

For a comment above the key, use `head_comment`:

```bash
yq '(.defaults | key) head_comment = "Managed by platform engineering"' \
  config.yml
```

Foot comments are available through `foot_comment`. The camel-case forms `lineComment`, `headComment`, and `footComment` are aliases for the same operators.

## Discover Where a Comment Is Stored

YAML parsers sometimes attach a visually obvious comment to a surprising node. Inspect values and keys together with `...`:

```bash
yq '[... | {
  "path": (path | join(".")),
  "isKey": is_key,
  "head": head_comment,
  "line": line_comment,
  "foot": foot_comment
}]' config.yml
```

Find the non-empty field and then target that node. This diagnostic is safer than repeatedly assigning comments to different paths and hoping the emitter places them as expected.

Remove one line comment with an empty string:

```bash
yq '.defaults.timeout line_comment = ""' config.yml
```

Remove all comments with:

```bash
yq '... comments = ""' config.yml
```

The three-dot traversal is essential because key nodes can own comments. This is intentionally destructive presentation cleanup, so do not use it when comments contain operational guidance.

## Read Anchors and Aliases

Read an anchor name:

```bash
yq '.defaults | anchor' config.yml
```

For `&defaults`, the output is `defaults`.

An alias node has `kind == "alias"`. List alias locations and names without confusing ordinary scalar values for aliases:

```bash
yq '[.. | select(kind == "alias") | {
  "path": path,
  "name": alias
}]' config.yml
```

The kind check matters. The `alias` operator is designed to act on selected nodes; using only `alias != ""` is not a reliable alias-node test for ordinary scalars.

## Create an Anchor and Alias

Given:

```yaml
defaults:
  timeout: 5s
copy:
  timeout: 10s
```

Turn `defaults` into an anchor and replace `copy` with an alias:

```bash
yq '
  .defaults anchor = "defaults" |
  .copy alias = "defaults"
' config.yml
```

Output:

```yaml
defaults: &defaults
  timeout: 5s
copy: *defaults
```

Setting an alias discards the node's prior concrete value. Ensure the referenced anchor exists and confirm that replacing the destination is intentional.

## Rename an Anchor and Its Aliases Together

Changing only the anchor name can leave aliases referring to the old name. Update both sides in one expression:

```bash
yq '
  .defaults anchor = "common" |
  (.. | select(
    kind == "alias" and alias == "defaults"
  )) alias = "common"
' config.yml
```

Review all alias nodes afterward:

```bash
yq '[.. | select(kind == "alias") | alias]' config.yml
```

Anchor names and map key names are independent. Renaming a YAML key does not automatically require changing its anchor, and changing an anchor does not rename the key.

## Handle YAML Merge Keys Carefully

yq recognizes the common `<<: *anchor` merge-key form. The project documents a compatibility flag for correcting merge-anchor behavior:

```bash
yq --yaml-fix-merge-anchor-to-spec=true \
  'explode(.)' config.yml
```

In v4.53.6, this flag is still opt-in and the command help advises enabling it. `explode(.)` resolves aliases and merge keys into concrete values and removes anchor names. The result may be semantically convenient, but it no longer preserves the shared YAML structure.

Use `explode` only when dereferencing is the desired output. If the goal is to keep anchors and aliases, edit their definitions or metadata directly.

YAML merge keys are a legacy YAML 1.1 feature that remains common in configuration files; they are not part of the YAML 1.2 core specification. Verify the expectations of the downstream parser.

## Control Scalar Styles

The `style` operator changes how a node is emitted. Set a string to double-quoted style:

```bash
yq '.defaults.timeout style = "double"' config.yml
```

Set a multiline string to literal block style:

```bash
yq '.defaults.message style = "literal"' config.yml
```

Available styles include:

| Style value | Typical YAML form |
| --- | --- |
| `double` | `"text"` |
| `single` | `'text'` |
| `literal` | `|` block |
| `folded` | `>` block |
| `flow` | Inline maps or sequences |
| Empty string | Default emitter style |

Read a node's current style with:

```bash
yq '.defaults.message | style' config.yml
```

## Restrict Bulk Style Changes to Strings

This official-style example applies a presentation style to every value node:

```bash
yq '.. style = "double"' config.yml
```

It also quotes numbers and booleans. When another YAML parser reads the emitted file, quoted numeric and boolean-looking scalars can become strings. If type preservation matters, target string-tagged values only:

```bash
yq '(.. | select(tag == "!!str")) style = "double"' \
  config.yml
```

`..` excludes map keys. To style string values and string key nodes, use `...` with the same tag filter, but remember that quoting every key creates a much larger formatting diff.

Resetting styles is also a rewrite:

```bash
yq '... style = ""' config.yml
```

It normalizes keys and values to the emitter's default style. It does not restore the exact source spelling that existed before an earlier transformation.

## Keep YAML Output When Metadata Matters

Comments, anchors, aliases, and YAML styles cannot survive conversion to formats that do not represent them. JSON output, CSV output, and shell scalar output necessarily discard some YAML presentation metadata.

Even YAML-to-YAML edits are not byte-preserving. The yq documentation notes that comment positions and formatting cannot be retained perfectly in every case by the underlying YAML library. Review diffs around blank lines, comments on collection keys, folded blocks, anchors, aliases, and merge keys.

## Make Metadata Checks Explicit

For important files, inspect metadata after mutation:

```bash
yq '[... | {
  "path": path,
  "kind": kind,
  "tag": tag,
  "anchor": anchor,
  "style": style,
  "head": head_comment,
  "line": line_comment,
  "foot": foot_comment
}]' config.yml
```

This turns presentation state into reviewable output. It is especially useful in tests for generated configuration where a required operator comment or block style has semantic importance to humans.

## Conclusion

Treat comments, anchors, aliases, and styles as node metadata, not plain text decoration. Locate comments on values or key nodes, filter alias nodes by `kind`, update anchor references together, enable the merge-anchor fix when exploding legacy merge keys, and restrict quote-style changes to strings when types must survive a second YAML parse.

## Official Documentation

- [Mike Farah yq: Comment Operators](https://mikefarah.gitbook.io/yq/operators/comment-operators)
- [Mike Farah yq: Anchor and Alias Operators](https://mikefarah.gitbook.io/yq/operators/anchor-and-alias-operators)
- [Mike Farah yq: Style Operator](https://mikefarah.gitbook.io/yq/operators/style)
- [Mike Farah yq: Recursive Descent Glob](https://mikefarah.gitbook.io/yq/operators/recursive-descent-glob)
- [YAML 1.2.2 Specification](https://yaml.org/spec/1.2.2/)
- [Mike Farah yq v4.53.6 Release](https://github.com/mikefarah/yq/releases/tag/v4.53.6)
