# How to Create UDFs with Shell Scripts in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, UDF, Shell Script, Bash, Executable

Description: Learn how to create shell script-backed UDFs in ClickHouse to run Bash commands and Unix tools directly from SQL queries.

---

Shell script UDFs let you invoke Unix command-line tools from ClickHouse SQL. While Python UDFs are more flexible for complex logic, Bash UDFs are useful for quick text transformations, calling system tools, or leveraging utilities available on the server.

## Simple Bash UDF - URL Encoding

Create the script:

```bash
#!/bin/bash
# /var/lib/clickhouse/user_scripts/urlencode.sh

while IFS= read -r line; do
    encoded=$(printf '%s' "$line" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read(), safe=''))")
    echo "$encoded"
done
```

Make it executable:

```bash
chmod +x /var/lib/clickhouse/user_scripts/urlencode.sh
chown clickhouse:clickhouse /var/lib/clickhouse/user_scripts/urlencode.sh
```

Register in XML (`/etc/clickhouse-server/user_defined/urlencode.xml`):

```text
<functions>
    <function>
        <name>urlEncode</name>
        <type>executable</type>
        <return_type>String</return_type>
        <argument>
            <type>String</type>
            <name>input</name>
        </argument>
        <format>TabSeparated</format>
        <command>urlencode.sh</command>
    </function>
</functions>
```

## Using awk for Field Extraction

```bash
#!/bin/bash
# /var/lib/clickhouse/user_scripts/extract_domain.sh

while IFS= read -r line; do
    echo "$line" | awk -F'/' '{print $3}'
done
```

## Calling the Shell UDF

```sql
SELECT
    page_url,
    urlEncode(page_url) AS encoded_url
FROM page_views
LIMIT 10;
```

## Multi-Argument Shell UDF

```bash
#!/bin/bash
# /var/lib/clickhouse/user_scripts/concat_fields.sh

while IFS=$'\t' read -r field1 field2; do
    echo "${field1}_${field2}"
done
```

XML definition with two arguments:

```text
<argument><type>String</type><name>a</name></argument>
<argument><type>String</type><name>b</name></argument>
```

## Calling an External Tool

```bash
#!/bin/bash
# /var/lib/clickhouse/user_scripts/geo_lookup.sh

while IFS= read -r ip; do
    result=$(geoiplookup "$ip" | awk -F': ' '{print $2}' | awk -F', ' '{print $1}')
    echo "${result:-Unknown}"
done
```

## Performance Considerations

- Shell script UDFs spawn a process per query or reuse it in pool mode; Bash is slower than Python for complex logic
- Use `executable_pool` to keep the shell process alive across multiple batches
- Avoid spawning additional subprocesses per row inside the Bash loop; this creates extreme overhead
- For simple string operations, ClickHouse's built-in string functions are far faster

## Verifying Registration

```sql
SELECT name, is_aggregate
FROM system.functions
WHERE name = 'urlEncode';
```

## When to Use Shell vs Python UDFs

| Use Case | Recommended |
|----------|-------------|
| Simple text transforms | SQL UDF |
| Complex transforms | Python UDF |
| Calling a CLI tool | Shell UDF |
| ML model inference | Python UDF |

## Summary

Shell script UDFs give you access to Unix tools and Bash logic from ClickHouse SQL. By writing a line-by-line stdin/stdout Bash script and registering it in the user_defined XML config, you can invoke any command-line utility or perform text transformations not covered by ClickHouse's built-in functions.
