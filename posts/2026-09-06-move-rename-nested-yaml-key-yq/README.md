# How to Move or Rename a Nested YAML Key Without Losing Its Children in yq

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YAML, Bash, Configuration Management, Command Line, Automation

Description: Rename a nested YAML key or move its complete subtree with Mike Farah yq v4 while guarding against missing sources and destination collisions.

---

A nested YAML key can own an entire subtree. Renaming only a reconstructed scalar or deleting the source too early can lose its children. Mike Farah yq provides two reliable patterns:

- Change the key node when the value stays under the same parent.
- Capture the complete source node, delete the old path, and assign the captured node at a new parent.

## Rename a Key Under the Same Parent

Given `config.yml`:

```yaml
service:
  database:
    host: db.internal
    port: 5432
    options:
      poolSize: 20
  logging:
    level: info
```

Rename `database` to `storage` by assigning to the key operator:

```bash
yq '(.service.database | key) = "storage"' config.yml
```

Output:

```yaml
service:
  storage:
    host: db.internal
    port: 5432
    options:
      poolSize: 20
  logging:
    level: info
```

The value node never needs to be rebuilt. Its complete map, including all descendants, remains attached to the renamed key.

After previewing, edit in place:

```bash
yq -i '(.service.database | key) = "storage"' config.yml
```

## Pass the New Key Safely

Use `strenv` when the new key comes from Bash:

```bash
NEW_KEY=storage yq '
  (.service.database | key) = strenv(NEW_KEY)
' config.yml
```

Do not interpolate the shell value into the yq expression. `strenv` transports it as one literal YAML string, so dots and brackets in the name do not become traversal syntax.

Validate the application rules for key names. YAML permits many strings that an application schema may reject.

## Refuse a Missing Source or Existing Destination

A typo in the source path should not be treated as a successful rename. An existing destination should not be overwritten or turned into a duplicate key.

For a single-document map, guard both conditions:

```bash
yq -e '
  .service |
  ((tag == "!!map") and
   has("database") and
   (has("storage") | not))
' config.yml >/dev/null
```

Then perform the rename without another writer changing the file between check and update. A single guarded expression can fail closed:

```bash
yq -e -i '
  select(
    (.service | tag) == "!!map" and
    (.service | has("database")) and
    ((.service | has("storage")) | not)
  ) |
  (.service.database | key) = "storage"
' config.yml
```

If the guard is false, `select` emits nothing and `-e` returns nonzero. This pattern assumes one YAML document. For a multi-document file, first select the intended document by stable identity and separately enforce an exact-one match across the stream.

## Move the Whole Subtree to Another Parent

To move `service.database` to `infrastructure.databases.primary`, bind the source before deleting it:

```bash
yq '
  .service.database as $database |
  del(.service.database) |
  .infrastructure.databases.primary = $database
' config.yml
```

Output:

```yaml
service:
  logging:
    level: info
infrastructure:
  databases:
    primary:
      host: db.internal
      port: 5432
      options:
        poolSize: 20
```

Assignment creates missing destination maps. The variable holds the complete selected node, not only one child, so the nested `host`, `port`, and `options` data moves together.

## Capture Before Calling `del`

This order is wrong:

```bash
yq '
  del(.service.database) |
  .infrastructure.databases.primary = .service.database
' config.yml
```

After `del`, the source path no longer exists. Reading it produces null, so the destination cannot receive the original subtree.

Bind first, delete second, and assign third:

```text
.service.database as $database |
del(.service.database) |
.infrastructure.databases.primary = $database
```

## Guard a Move Against Overwrite

Check source shape, source membership, and target absence:

```bash
yq -e '
  ((.service | tag) == "!!map") and
  (.service | has("database")) and
  (((.infrastructure.databases // {}) | has("primary")) | not)
' config.yml >/dev/null
```

Then combine the guard with the move for one document:

```bash
yq -e -i '
  select(
    ((.service | tag) == "!!map") and
    (.service | has("database")) and
    (((.infrastructure.databases // {}) | has("primary")) | not)
  ) |
  .service.database as $database |
  del(.service.database) |
  .infrastructure.databases.primary = $database
' config.yml
```

If merging into an existing destination is actually intended, define precedence explicitly instead of silently assigning over it. For example, decide whether source or destination wins at scalar conflicts and how arrays combine before using the multiply merge operator.

## Rename a Key Inside a Selected Array Object

The key operator works after any precise selection:

```yaml
services:
  - name: api
    settings:
      oldTimeout: 5s
  - name: worker
    settings:
      oldTimeout: 30s
```

Rename only the API service key:

```bash
yq '
  (.services[] |
   select(.name == "api") |
   .settings.oldTimeout |
   key) = "timeout"
' config.yml
```

Keep the complete selected path on the assignment's left side. If `name` must be unique, count matches before editing so a malformed array cannot rename several objects.

## Consider Comments, Anchors, and Aliases

The key node can carry comments and style separately from its value. A direct key rename is more likely to retain that metadata than rebuilding the parent map with `to_entries` and `from_entries`, but formatting preservation is not guaranteed in every YAML layout.

An anchor name is independent of a map key name:

```yaml
service:
  database: &databaseDefaults
    host: db.internal
  replica: *databaseDefaults
```

Renaming the `database` key does not need to rename `&databaseDefaults`; the alias still refers to the anchor name. When moving a subtree that contains anchors or aliases, inspect the emitted YAML and verify that every alias still has a corresponding anchor.

## Use `setpath` for Path Arrays

When a destination is represented as a trusted path array, `setpath` can assign the captured node:

```bash
yq '
  .service.database as $database |
  del(.service.database) |
  setpath(["infrastructure", "databases", "primary"]; $database)
' config.yml
```

`setpath` is preferable to constructing an `eval` expression from untrusted text. Path arrays keep each component separate and can include numeric array indexes when that is intentional.

## Review Before Removing the Source

Preview the transformed document without `-i`, inspect the destination subtree, and confirm the source is gone. For important configuration, validate both conditions:

```bash
yq -e '
  (.service | has("database") | not) and
  (.infrastructure.databases | has("primary"))
' moved.yml >/dev/null
```

A successful YAML parse alone cannot prove the move used the correct semantic path.

## Conclusion

For a same-parent rename, update the key node with `key`. For a move, bind the entire source subtree before deleting it, then assign the captured node at the destination. Guard against absent sources and existing targets, use `strenv` or path arrays for dynamic input, and review YAML metadata around comments, anchors, and aliases.

## Official Documentation

- [Mike Farah yq: Keys Operator](https://mikefarah.gitbook.io/yq/operators/keys)
- [Mike Farah yq: Assign Update Operator](https://mikefarah.gitbook.io/yq/operators/assign-update)
- [Mike Farah yq: Delete Operator](https://mikefarah.gitbook.io/yq/operators/delete)
- [Mike Farah yq: Path and setpath Operators](https://mikefarah.gitbook.io/yq/operators/path)
- [Mike Farah yq: Variable Operators](https://mikefarah.gitbook.io/yq/operators/variable-operators)
- [Mike Farah yq v4.53.6 Release](https://github.com/mikefarah/yq/releases/tag/v4.53.6)
