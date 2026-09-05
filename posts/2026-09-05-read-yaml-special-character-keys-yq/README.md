# How to Read a YAML Key That Contains Dots, Dashes, or Other Special Characters with yq

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YAML, Bash, Configuration, Command Line, Configuration Management

Description: Read and update literal YAML map keys containing punctuation, spaces, or numeric text with safe bracket notation and dynamic key lookup.

---

Dots in a yq path normally mean traversal. That is useful for ordinary nested YAML, but it is wrong when the dot is part of a map key. Dashes, spaces, brackets, slashes, numeric-looking keys, and wildcard characters introduce similar ambiguity.

Mike Farah yq v4 solves the usual cases with quoted bracket notation. For keys supplied by Bash, combine brackets with `strenv` so data remains data rather than becoming part of the expression.

## Start with a Deliberately Awkward Document

Consider `config.yml`:

```yaml
database:
  connection.timeout: 30
  read-only: true
  display name: primary
  service[blue]: enabled
a.b: top-level
"123": numeric-key
```

This expression does **not** read `connection.timeout`:

```bash
yq '.database.connection.timeout' config.yml
```

It asks for `timeout` inside `connection` inside `database`. Because that nested path is absent, the normal result is `null`.

Quote the complete key inside brackets instead:

```bash
yq '.database["connection.timeout"]' config.yml
```

Output:

```text
30
```

yq v4.53.3 also accepts the equivalent dotted form with a quoted bracket component:

```bash
yq '.database.["connection.timeout"]' config.yml
```

Using one bracket component for each literal key is consistent and easy to generate, so this article uses the first style.

## Apply Bracket Notation at the Correct Level

A top-level key containing a dot needs brackets immediately after the root:

```bash
yq '.["a.b"]' config.yml
```

Output:

```text
top-level
```

The other unusual keys follow the same rule:

```bash
yq '.database["read-only"]' config.yml
yq '.database["display name"]' config.yml
yq '.database["service[blue]"]' config.yml
yq '.["123"]' config.yml
```

On a sequence, `.[123]` is an array-index expression. On a map, however, v4.53.3 traversal compares the textual value of scalar keys and does not enforce the key's YAML tag. Both `.[123]` and `.["123"]` can therefore retrieve a map key whose text is `123`; quoting still communicates that the intended schema uses string keys, but it is not a type assertion.

Avoid maps that contain two scalar keys with the same text but different tags, such as both `123:` and `"123":`. Ordinary traversal can resolve such ambiguous input unexpectedly. If typed-key identity matters, inspect `to_entries`, require `(.key | tag) == "!!str"`, and use a type-aware comparison.

YAML itself does not require quotes around every one of these source keys, but the yq expression still needs an unambiguous path component. YAML quoting rules and yq expression quoting rules are separate layers.

## Keep the yq Program in Single Quotes

The shell sees the command before yq does. This is the safe, readable arrangement:

```bash
yq '.database["display name"]' config.yml
```

The outer single quotes prevent Bash from treating `$`, backticks, glob characters, or whitespace as shell syntax. The inner double quotes belong to the yq expression and delimit the map key.

This is much harder to reason about:

```bash
yq ".database[\"display name\"]" config.yml
```

It can work for a literal, but a double-quoted shell string also enables parameter expansion, command substitution, and backslash processing. Reserve it for cases where you deliberately need those shell rules—and prefer an environment variable instead.

## Use a Bash Variable as One Dynamic Key

Suppose a caller chooses both the section and property:

```bash
section=database
property='connection.timeout'

SECTION=$section PROPERTY=$property \
  yq '.[strenv(SECTION)][strenv(PROPERTY)]' config.yml
```

Output:

```text
30
```

`strenv(PROPERTY)` always creates a YAML string node. The value can contain dots, spaces, quotes, or dashes without changing the structure of the expression. Prefix assignments export those variables only to this `yq` process; the shell variables do not need a global `export`.

Do not splice the value into a path:

```bash
property='connection.timeout'
yq ".database.$property" config.yml
```

Bash produces `.database.connection.timeout`, so yq traverses three keys and returns `null`. More hostile content could change the expression entirely.

## Read a Literal Key, Not a Dynamic Path

A key and a path expression are different inputs:

```bash
KEY='connection.timeout' \
  yq '.database[strenv(KEY)]' config.yml
```

This performs one lookup.

By contrast, the official `eval` operator executes a string as yq code:

```bash
PATH_EXPR='.database["connection.timeout"]' \
  yq 'eval(strenv(PATH_EXPR))' config.yml
```

`eval` is appropriate when a trusted administrator intentionally supplies a complete yq expression. It is not appropriate for an arbitrary key from a filename, HTTP request, or CI input. A malicious value can add pipes, selections, or updates because it is executable program text.

Use bracket lookup for data and `eval` only for trusted expressions.

## Update a Special Key Safely

The same traversal form can appear on the left side of an assignment:

```bash
KEY='connection.timeout' VALUE=45 \
  yq '.database[strenv(KEY)] = env(VALUE)' config.yml
```

Output:

```yaml
database:
  connection.timeout: 45
  read-only: true
  display name: primary
  service[blue]: enabled
a.b: top-level
"123": numeric-key
```

`env(VALUE)` parses `45` as a YAML integer. If the desired value is the string `45`, use `strenv(VALUE)` instead. Add `-i` only after checking the non-mutating output:

```bash
KEY='connection.timeout' VALUE=45 \
  yq -i '.database[strenv(KEY)] = env(VALUE)' config.yml
```

## Fail Clearly When the Literal Key Is Missing

Without `--exit-status`, a missing traversal generally prints `null` and exits successfully. In CI, combine dynamic traversal with `-e`:

```bash
KEY='connection.timeout' \
  yq -e '.database[strenv(KEY)]' config.yml >/dev/null
```

That fails when the result is absent, null, or false. If `false` is a valid value—as it is for `read-only`—test existence with `has` instead:

```bash
KEY='read-only' \
  yq -e '.database | has(strenv(KEY))' config.yml >/dev/null
```

`has` distinguishes an existing key whose value is `false` or null from a missing key.

In v4.53.3, `has` compares a map key's textual value exactly, so `*` is not expanded there. It does not enforce the key tag, however; require string keys at the schema boundary when numeric and string keys with the same text must remain distinct.

## Treat `*` and `?` as a Special Edge Case

Mike Farah yq supports wildcard matching in string equality and traversal. That means a lookup for a key literally named `*` can match every child rather than one entry—even when the key text came from `strenv`.

For pathological keys containing yq wildcard characters, inspect map entries, select string keys, and compare strings by mutual containment. Mutual containment is true only when the complete strings are the same:

```bash
KEY='*' yq '
  to_entries |
  .[] |
  select((.key | tag) == "!!str") |
  .key as $candidate |
  select(
    ($candidate | contains(strenv(KEY))) and
    (strenv(KEY) | contains($candidate))
  ) |
  .value
' config.yml
```

When a configuration schema prohibits wildcard characters in key names, ordinary bracket notation remains the right default. This longer form is useful when consuming arbitrary maps that do not make that guarantee.

Before updating such a map, also count exact entry matches and reject duplicates. It is often simpler to normalize or reject wildcard-bearing keys at the schema boundary.

## Work with Keys That Contain Quotes or Newlines

Dynamic bracket lookup is particularly valuable when a key itself contains quotes:

```bash
key='team "blue"'
KEY=$key yq '.[strenv(KEY)]' config.yml
```

There is no manual quote escaping inside the yq program. Bash environment variables can also contain newline characters, and `strenv` can represent them as a string node. They cannot contain a NUL byte; Unix environment strings have that fundamental limitation.

If a schema allows NUL characters or arbitrary binary keys, a text environment variable is the wrong transport. Use a properly serialized YAML or JSON input and process its entries instead.

## Preserve Meaning Across Multiple Documents

Mike Farah yq v4 evaluates an expression against every YAML document in a file by default. Given a multi-document file, a special-key lookup can therefore print one result per document:

```bash
yq '.metadata.annotations["example.com/owner"]' resources.yml
```

If only one document is intended, select it explicitly by its content or `documentIndex`. Do not assume the first printed scalar came from the resource you meant to inspect.

For a Kubernetes-style annotation selected by resource identity:

```bash
yq '
  select(.kind == "Deployment" and .metadata.name == "api") |
  .metadata.annotations["example.com/owner"]
' resources.yml
```

The slash and dot are both literal characters because the complete annotation key is one bracket component.

## Conclusion

Use normal dotted traversal only when dots represent nesting. For a literal map key containing punctuation, whitespace, brackets, slashes, or numeric text, put the complete key in a quoted bracket component. Pass variable keys with `strenv`, test existence with `has` when false or null are valid, and keep untrusted data away from `eval`. Keys containing yq wildcard characters require extra care or schema-level rejection.

## Official Documentation

- [Mike Farah yq: Traverse Read Operator](https://mikefarah.gitbook.io/yq/operators/traverse-read)
- [Mike Farah yq: Environment Variable Operators](https://mikefarah.gitbook.io/yq/operators/env-variable-operators)
- [Mike Farah yq: Eval Operator](https://mikefarah.gitbook.io/yq/operators/eval)
- [Mike Farah yq: Has Operator](https://mikefarah.gitbook.io/yq/operators/has)
- [Mike Farah yq v4.53.3: Path Traversal Implementation](https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/operator_traverse_path.go)
- [Mike Farah yq v4.53.3: Has Implementation](https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/operator_has.go)
- [GNU Bash Manual: Shell Parameter Expansion](https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html)
