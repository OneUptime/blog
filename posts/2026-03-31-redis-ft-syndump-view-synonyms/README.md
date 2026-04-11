# How to Use FT.SYNDUMP in Redis to View Synonyms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Search, Synonym, Command

Description: Learn how to use FT.SYNDUMP in Redis to retrieve all synonym groups defined on a RediSearch index for auditing and managing synonym configurations.

---

## How FT.SYNDUMP Works

`FT.SYNDUMP` returns all synonym terms currently defined on a RediSearch index. Each term maps to the list of synonym group IDs it belongs to. Use it to audit synonym configurations, verify that `FT.SYNUPDATE` calls were applied correctly, and export synonym definitions for backup or migration.

```mermaid
graph TD
    A["FT.SYNDUMP articles"]
    A --> B["Reads synonym registry for index"]
    B --> C["Term: car"]
    B --> D["Term: laptop"]
    B --> E["Term: notebook"]
    C --> F["Group IDs: vehicles"]
    D --> G["Group IDs: computers"]
    E --> H["Group IDs: computers"]
```

## Syntax

```redis
FT.SYNDUMP index
```

- `index` - the name of the RediSearch index

Returns a flat array alternating between terms and their synonym group ID arrays. Each term maps to the list of group IDs it belongs to. Returns an empty array if no synonym groups exist.

## Setting Up Synonym Groups to Follow Along

```redis
FT.CREATE products ON HASH PREFIX 1 product:
  SCHEMA title TEXT description TEXT category TAG

FT.SYNUPDATE products vehicles car automobile vehicle truck
FT.SYNUPDATE products computing laptop computer notebook PC
FT.SYNUPDATE products storage disk drive SSD HDD
```

## Examples

### View All Synonym Groups

```redis
FT.SYNDUMP products
```

```text
 1) "car"
 2) 1) "vehicles"
 3) "automobile"
 4) 1) "vehicles"
 5) "vehicle"
 6) 1) "vehicles"
 7) "truck"
 8) 1) "vehicles"
 9) "laptop"
10) 1) "computing"
11) "computer"
12) 1) "computing"
13) "notebook"
14) 1) "computing"
15) "PC"
16) 1) "computing"
17) "disk"
18) 1) "storage"
19) "drive"
20) 1) "storage"
21) "SSD"
22) 1) "storage"
23) "HDD"
24) 1) "storage"
```

### Empty Index Has No Synonyms

```redis
FT.CREATE fresh ON HASH PREFIX 1 doc: SCHEMA body TEXT
FT.SYNDUMP fresh
```

```text
(empty array)
```

### Check a Single Group After Update

Add a term and verify it was added:

```redis
FT.SYNUPDATE products vehicles car automobile vehicle truck van
FT.SYNDUMP products
```

Confirm that `van` now appears in the output with the `vehicles` group ID.

## Parsing the Output

The `FT.SYNDUMP` response alternates: term, group ID array, term, group ID array. Most Redis clients return this as a flat array that you iterate in pairs:

```text
Index 0: "car"          <- term
Index 1: ["vehicles"]   <- group IDs this term belongs to
Index 2: "automobile"   <- next term
Index 3: ["vehicles"]   <- group IDs this term belongs to
```

In a Python client:

```text
result = r.ft("products").syndump()
# result is a dict: {"car": ["vehicles"], "automobile": ["vehicles"], "laptop": ["computing"], ...}
# Each key is a term, each value is a list of group IDs the term belongs to
```

## Use Cases

### Auditing Synonym Configuration

Before deploying changes to a production index, dump synonyms from staging and compare:

```redis
-- On staging
FT.SYNDUMP catalog

-- On production
FT.SYNDUMP catalog

-- Compare both outputs to detect missing or extra groups
```

### Migrating Synonyms to a New Index

When rebuilding an index, re-apply all synonyms:

```redis
-- Dump from old index
FT.SYNDUMP old_products

-- Recreate each group on the new index
FT.SYNUPDATE new_products vehicles car automobile vehicle truck
FT.SYNUPDATE new_products computing laptop computer notebook PC
```

### Debugging Missing Search Results

If a synonym search is not returning expected results, dump the synonyms to verify the term exists and belongs to the right group:

```redis
FT.SYNDUMP catalog
-- Check if "notebook" appears with the computing group ID
-- If missing, run FT.SYNUPDATE to add it
```

## FT.SYNDUMP vs FT.SYNUPDATE

| Command | Purpose |
|---------|---------|
| `FT.SYNUPDATE` | Create or replace a synonym group |
| `FT.SYNDUMP` | Read all existing synonym groups |

There is no built-in command to delete a specific synonym group. To remove a group, recreate the index or update the group to a single term (which effectively makes it do nothing):

```redis
-- Remove "vehicles" group by overwriting with a single term
FT.SYNUPDATE products vehicles placeholder
```

## Summary

`FT.SYNDUMP` returns all synonym terms defined on a RediSearch index as alternating terms and group ID arrays. Use it to audit which terms are considered synonyms, verify that `FT.SYNUPDATE` was applied correctly, and export synonym definitions for migration or backup. Pair it with `FT.SYNUPDATE` to manage the full synonym lifecycle on your search indexes.
