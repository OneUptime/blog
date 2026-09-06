# How to Convert Selected YAML Fields to CSV with yq Without Losing Quoting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YAML, CSV, Data Transformation, Command Line, Automation

Description: Select and order YAML fields for CSV output with Mike Farah yq v4 while correctly escaping commas, quotes, newlines, nulls, and nested values.

---

Do not build CSV by joining values with commas. A field can itself contain a comma, a double quote, or a newline. Mike Farah yq's CSV encoder applies CSV escaping after you select and order the fields.

```bash
yq -o=csv '
  [["name", "owner", "note"]] +
  [.items[] | [.name, .owner, .note]]
' report.yml
```

The inner arrays define column order, and the output encoder handles quoting.

## Select Columns Explicitly

Given `report.yml`:

```yaml
items:
  - name: api
    owner: ACME, Inc.
    note: |-
      She said "ready"
      on Friday.
    enabled: true
    labels:
      tier: frontend
  - name: worker
    owner: Operations
    note: plain
    enabled: false
    labels:
      tier: background
```

Create a header and selected rows:

```bash
yq -o=csv '
  [["name", "owner", "note", "enabled", "labels"]] +
  [.items[] | [
    .name,
    .owner,
    .note,
    .enabled,
    (.labels | to_json(0))
  ]]
' report.yml
```

Output:

```csv
name,owner,note,enabled,labels
api,"ACME, Inc.","She said ""ready""
on Friday.",true,"{""tier"":""frontend""}"
worker,Operations,plain,false,"{""tier"":""background""}"
```

The multiline field is one CSV field even though it occupies two physical lines. Its embedded quote becomes `""`, and fields containing commas or quotes are enclosed in quotes.

## Why Manual Joining Corrupts Data

This is not a CSV encoder:

```bash
yq -r '.items[] | [.name, .owner, .note] | join(",")' \
  report.yml
```

It cannot distinguish a separator comma from the comma in `ACME, Inc.`. Adding quotes around every value still fails unless embedded quotes and line endings are escaped according to CSV rules.

Construct rows as arrays of scalars, then let `-o=csv` or `@csv` serialize them.

## Control Headers and Column Order

When yq receives an array of flat objects, direct CSV output infers headers from the first object. Fields missing from that first object are not included as columns.

For selected fields, build the header row yourself:

```text
[["name", "owner", "note"]] +
[.items[] | [.name, .owner, .note]]
```

This guarantees the header labels and column order regardless of source map ordering. It also lets a header label differ from the YAML path:

```bash
yq -o=csv '
  [["Service", "Team", "Replica Count"]] +
  [.items[] | [.name, .owner, ([.replicas] | .[0])]]
' report.yml
```

Every row must emit the same number of scalar columns.

## Handle Missing and Null Fields Deliberately

In v4.53.6, a missing path can be omitted from a manually constructed row when the row expression is evaluated inside `+`, shortening the row. Use `([.owner] | .[0])` to retain a null cell, which the CSV encoder writes as `null`. Explicit YAML nulls retain their scalar text, so `null`, `~`, and an empty YAML value can produce different CSV text. If an optional string should be blank, use an explicit default:

```bash
yq -o=csv '
  [["name", "owner"]] +
  [.items[] | [.name, (.owner // "")]]
' report.yml
```

The alternative operator also treats false as absent. Use that shortcut only for a field whose schema is an optional string or where false intentionally means blank.

When false and null are valid data, retain the value and add presence and tag columns so a CSV consumer can distinguish missing, explicit null, and false:

```bash
yq -o=csv '
  [["name", "owner_present", "owner_tag", "owner"]] +
  [.items[] | [
    .name,
    has("owner"),
    ([.owner] | .[0] | tag),
    ([.owner] | .[0])
  ]]
' report.yml
```

Wrapping the lookup as `[.owner] | .[0]` materializes an explicit null candidate when the path is absent, keeping every row rectangular. For both a missing path and an explicit null, the value and tag columns contain null-like output, but `owner_present` differs. A false value remains false with the `!!bool` tag. CSV has no native null type, so the producer and consumer must agree on this representation.

## Convert Nested Values Before Encoding

CSV rows may contain strings, numbers, and booleans. A map or sequence cannot be placed directly in a CSV cell:

```text
csv encoding only works for arrays of scalars
```

Serialize a nested value to one JSON string first:

```bash
(.labels | to_json(0))
```

The CSV encoder then quotes and doubles the JSON string's quotes correctly. This preserves the nested structure inside one cell, but the consumer must deliberately parse that column as JSON.

For a list intended as human-readable text rather than structured data, choose an application-safe separator:

```bash
(.tags | join(";"))
```

That is lossy if tag values can contain semicolons. JSON is the safer reversible representation.

## Use `@csv` for Row-Oriented Output

The `@csv` encoder converts an array of scalars into one CSV row string. With `-r`, you can emit a header and rows as a stream:

```bash
yq -r '
  (["name", "owner"] | @csv),
  (.items[] | [.name, .owner] | @csv)
' report.yml
```

Output:

```csv
name,owner
api,"ACME, Inc."
worker,Operations
```

The comma between the two yq expressions emits both result streams. Parentheses keep the header and row pipelines unambiguous.

Use `-o=csv` when constructing the whole table as an array and `@csv` when row-oriented composition is clearer. Both use the CSV encoder rather than manual escaping.

## Select Rows Before Selecting Fields

Filter objects while they are still maps, then project them into positional rows:

```bash
yq -o=csv '
  [["name", "owner"]] +
  [.items[] |
    select(.enabled == true) |
    [.name, .owner]
  ]
' report.yml
```

Once an object becomes `[.name, .owner]`, field names are gone and later filters must rely on column indexes. Filter first, project second, and encode last.

## Validate the Source Shape

Before exporting, require an array of maps with the fields and types expected by the CSV contract:

```bash
yq -e '
  (.items | tag == "!!seq") and
  (.items | all_c(
    (tag == "!!map") and
    ((.name | tag) == "!!str") and
    ((.owner | tag) == "!!str") and
    ((.note | tag) == "!!str") and
    ((.enabled | tag) == "!!bool") and
    ((.labels | tag) == "!!map")
  ))
' report.yml >/dev/null
```

This avoids creating a syntactically valid CSV file whose rows have unexpected types or missing required fields.

## Redirect Without Reusing the Input Path

Write CSV to a different file:

```bash
yq -o=csv '
  [["name", "owner", "note"]] +
  [.items[] | [.name, .owner, .note]]
' report.yml > report.csv
```

Never redirect output over `report.yml`; the shell truncates the destination before yq reads it. For a critical destination, write a temporary file and publish it only after yq and any downstream validation succeed.

## Understand Round-Trip Limits

CSV preserves field text and row structure when correctly encoded, but it does not carry YAML tags, comments, anchors, aliases, scalar quote style, or a distinction between every possible YAML type.

yq can parse a CSV file back into objects using the first row as headers:

```bash
yq -p=csv '.' report.csv
```

CSV input auto-parses YAML or JSON-looking content by default. The `--csv-auto-parse=false` option prevents structured objects and arrays from being decoded automatically, but simple scalars such as numbers, booleans, and null-like text are still parsed by the v4.53.6 CSV decoder. Validate or retag fields when identifiers such as leading-zero numbers must remain strings.

Do not promise a lossless YAML-to-CSV-to-YAML round trip. The guarantee here is correct CSV field escaping for the selected scalar values.

## Account for Spreadsheet Formula Injection

CSV quoting prevents structural corruption, but it does not neutralize spreadsheet formulas. A cell beginning with `=`, `+`, `-`, or `@` may be interpreted as a formula by spreadsheet software even when the CSV field is quoted.

If untrusted values will be opened in a spreadsheet, apply the receiving organization's formula-injection policy separately. Prefixing text can alter data, so do not do it silently for machine-to-machine exports.

## Conclusion

Project each YAML object into an ordered array of scalar cells, add an explicit header row, and let yq's CSV encoder handle commas, quotes, and newlines. Default optional strings deliberately, serialize nested structures to JSON, validate row shape, and remember that correct CSV quoting does not preserve YAML metadata or prevent spreadsheet formula interpretation.

## Official Documentation

- [Mike Farah yq: Working with CSV and TSV](https://mikefarah.gitbook.io/yq/usage/csv-tsv)
- [Mike Farah yq: Encode and Decode Operators](https://mikefarah.gitbook.io/yq/operators/encode-decode)
- [Mike Farah yq: Alternative Default Value Operator](https://mikefarah.gitbook.io/yq/operators/alternative-default-value)
- [Mike Farah yq: Has Operator](https://mikefarah.gitbook.io/yq/operators/has)
- [Mike Farah yq v4.53.6 CSV Decoder](https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/decoder_csv_object.go)
- [OWASP: CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection)
- [Mike Farah yq v4.53.6 Release](https://github.com/mikefarah/yq/releases/tag/v4.53.6)
