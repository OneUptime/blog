# How to Build PostgreSQL Extension Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PostgreSQL, Database, C, Extensions

Description: Create custom PostgreSQL extensions from scratch with SQL functions, C functions, custom types, and proper packaging for distribution.

---

PostgreSQL extensions let you add new functionality to your database without modifying the core code. Whether you need custom functions, new data types, or specialized operators, extensions provide a clean way to package and distribute these features. This guide walks through building extensions from simple SQL-only implementations to complex C-based solutions.

## Why Build Extensions?

Extensions offer several advantages over loose SQL scripts:

| Approach | Versioning | Dependencies | Installation | Upgrades |
|----------|-----------|--------------|--------------|----------|
| Raw SQL files | Manual tracking | None | Run scripts manually | Error-prone |
| Extensions | Built-in | Declared in control file | `CREATE EXTENSION` | `ALTER EXTENSION UPDATE` |

Extensions also integrate with PostgreSQL's dump and restore utilities, making backups straightforward.

## Extension File Structure

A PostgreSQL extension consists of at least three files in the extension directory (typically `/usr/share/postgresql/<version>/extension/`):

```
myext/
├── myext.control          # Extension metadata
├── myext--1.0.sql         # Initial version SQL
├── myext--1.0--1.1.sql    # Upgrade script (optional)
├── Makefile               # Build configuration
└── src/                   # C source files (optional)
    └── myext.c
```

The control file and SQL scripts are mandatory. C source files are only needed when you require functionality beyond what SQL and PL/pgSQL can provide.

## The Control File

The control file defines extension metadata. PostgreSQL reads this when you run `CREATE EXTENSION`.

Create `myext.control`:

```ini
# Extension metadata
comment = 'My custom PostgreSQL extension'
default_version = '1.0'
module_pathname = '$libdir/myext'
relocatable = true
requires = 'plpgsql'
superuser = false
trusted = true
schema = public
```

Here is what each parameter means:

| Parameter | Description |
|-----------|-------------|
| `comment` | Description shown in `pg_available_extensions` |
| `default_version` | Version installed when none specified |
| `module_pathname` | Path to shared library (for C extensions) |
| `relocatable` | Whether extension can move between schemas |
| `requires` | Dependencies on other extensions |
| `superuser` | Whether superuser privileges are required |
| `trusted` | Whether non-superusers can install (PostgreSQL 13+) |
| `schema` | Default schema for extension objects |

For SQL-only extensions, omit the `module_pathname` line.

## Building a SQL-Only Extension

Let's build a simple extension that provides utility functions for working with JSON data.

Create `jsonutils.control`:

```ini
comment = 'JSON utility functions for PostgreSQL'
default_version = '1.0'
relocatable = true
requires = ''
superuser = false
trusted = true
```

Create `jsonutils--1.0.sql`:

```sql
-- complain if script is sourced in psql, rather than via CREATE EXTENSION
\echo Use "CREATE EXTENSION jsonutils" to load this file. \quit

-- Function to safely extract a nested JSON value with a default fallback
-- Returns the default value if the path does not exist or is null
CREATE OR REPLACE FUNCTION json_get_path(
    data jsonb,
    path text[],
    default_value jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    result jsonb;
BEGIN
    result := data #> path;
    IF result IS NULL THEN
        RETURN default_value;
    END IF;
    RETURN result;
END;
$$;

-- Function to merge two JSON objects with the second taking precedence
-- Performs a shallow merge at the top level
CREATE OR REPLACE FUNCTION json_merge_shallow(
    base jsonb,
    overlay jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF base IS NULL THEN
        RETURN overlay;
    END IF;
    IF overlay IS NULL THEN
        RETURN base;
    END IF;
    RETURN base || overlay;
END;
$$;

-- Function to recursively merge JSON objects
-- Nested objects are merged rather than replaced
CREATE OR REPLACE FUNCTION json_merge_deep(
    base jsonb,
    overlay jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    result jsonb;
    key text;
    base_value jsonb;
    overlay_value jsonb;
BEGIN
    IF base IS NULL THEN
        RETURN overlay;
    END IF;
    IF overlay IS NULL THEN
        RETURN base;
    END IF;

    -- Start with base object
    result := base;

    -- Iterate through overlay keys
    FOR key IN SELECT jsonb_object_keys(overlay)
    LOOP
        overlay_value := overlay -> key;
        base_value := base -> key;

        -- If both values are objects, merge recursively
        IF jsonb_typeof(base_value) = 'object'
           AND jsonb_typeof(overlay_value) = 'object' THEN
            result := jsonb_set(
                result,
                ARRAY[key],
                json_merge_deep(base_value, overlay_value)
            );
        ELSE
            -- Otherwise, overlay value wins
            result := jsonb_set(result, ARRAY[key], overlay_value);
        END IF;
    END LOOP;

    RETURN result;
END;
$$;

-- Function to flatten nested JSON into dot-notation keys
-- Useful for indexing or comparing structures
CREATE OR REPLACE FUNCTION json_flatten(
    data jsonb,
    prefix text DEFAULT ''
)
RETURNS TABLE(path text, value jsonb)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    key text;
    new_prefix text;
    child_value jsonb;
BEGIN
    IF jsonb_typeof(data) = 'object' THEN
        FOR key IN SELECT jsonb_object_keys(data)
        LOOP
            IF prefix = '' THEN
                new_prefix := key;
            ELSE
                new_prefix := prefix || '.' || key;
            END IF;

            child_value := data -> key;

            IF jsonb_typeof(child_value) = 'object' THEN
                RETURN QUERY SELECT * FROM json_flatten(child_value, new_prefix);
            ELSE
                path := new_prefix;
                value := child_value;
                RETURN NEXT;
            END IF;
        END LOOP;
    ELSE
        path := prefix;
        value := data;
        RETURN NEXT;
    END IF;
END;
$$;

-- Add helpful comments to functions
COMMENT ON FUNCTION json_get_path(jsonb, text[], jsonb) IS
    'Safely extract nested JSON value with optional default';
COMMENT ON FUNCTION json_merge_shallow(jsonb, jsonb) IS
    'Merge two JSON objects at top level';
COMMENT ON FUNCTION json_merge_deep(jsonb, jsonb) IS
    'Recursively merge nested JSON objects';
COMMENT ON FUNCTION json_flatten(jsonb, text) IS
    'Flatten nested JSON into dot-notation paths';
```

Create `Makefile`:

```makefile
EXTENSION = jsonutils
DATA = jsonutils--1.0.sql

PG_CONFIG = pg_config
PGXS := $(shell $(PG_CONFIG) --pgxs)
include $(PGXS)
```

Install and test:

```bash
# Install the extension files
make install

# Connect to PostgreSQL and create the extension
psql -d mydb -c "CREATE EXTENSION jsonutils;"

# Test the functions
psql -d mydb << 'EOF'
SELECT json_get_path(
    '{"user": {"name": "Alice", "age": 30}}'::jsonb,
    ARRAY['user', 'name']
);

SELECT json_merge_deep(
    '{"a": {"b": 1, "c": 2}}'::jsonb,
    '{"a": {"c": 3, "d": 4}}'::jsonb
);

SELECT * FROM json_flatten('{"user": {"name": "Bob", "address": {"city": "NYC"}}}'::jsonb);
EOF
```

## Creating an Upgrade Script

When you need to add functionality, create an upgrade script.

Create `jsonutils--1.0--1.1.sql`:

```sql
-- complain if script is sourced in psql, rather than via ALTER EXTENSION UPDATE
\echo Use "ALTER EXTENSION jsonutils UPDATE TO '1.1'" to load this file. \quit

-- New function to validate JSON against a simple schema
-- Schema format: {"field_name": "type", ...}
-- Supported types: string, number, boolean, array, object, null
CREATE OR REPLACE FUNCTION json_validate_schema(
    data jsonb,
    schema jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    key text;
    expected_type text;
    actual_type text;
BEGIN
    IF jsonb_typeof(data) != 'object' OR jsonb_typeof(schema) != 'object' THEN
        RETURN FALSE;
    END IF;

    FOR key, expected_type IN SELECT k, v::text FROM jsonb_each_text(schema) AS x(k, v)
    LOOP
        IF NOT data ? key THEN
            RETURN FALSE;
        END IF;

        actual_type := jsonb_typeof(data -> key);

        -- Remove quotes from expected_type for comparison
        expected_type := trim(both '"' from expected_type);

        IF actual_type != expected_type THEN
            RETURN FALSE;
        END IF;
    END LOOP;

    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION json_validate_schema(jsonb, jsonb) IS
    'Validate JSON data against a simple type schema';
```

Update `jsonutils.control`:

```ini
comment = 'JSON utility functions for PostgreSQL'
default_version = '1.1'
relocatable = true
```

Update `Makefile`:

```makefile
EXTENSION = jsonutils
DATA = jsonutils--1.0.sql jsonutils--1.0--1.1.sql jsonutils--1.1.sql

PG_CONFIG = pg_config
PGXS := $(shell $(PG_CONFIG) --pgxs)
include $(PGXS)
```

Note that you also need a `jsonutils--1.1.sql` that contains all functions for fresh installs at version 1.1.

## Building C Extensions

C extensions unlock PostgreSQL's full power: direct memory access, custom types, index support, and integration with external libraries.

### Setting Up the Development Environment

Install the required packages:

```bash
# Debian/Ubuntu
apt-get install postgresql-server-dev-16 build-essential

# RHEL/CentOS
dnf install postgresql16-devel gcc make

# macOS with Homebrew
brew install postgresql@16
```

### A Simple C Function

Let's build an extension with a C function that calculates the Levenshtein distance between two strings.

Create `stringdist.control`:

```ini
comment = 'String distance functions implemented in C'
default_version = '1.0'
module_pathname = '$libdir/stringdist'
relocatable = true
superuser = false
trusted = true
```

Create `src/stringdist.c`:

```c
/*
 * stringdist.c - String distance functions for PostgreSQL
 *
 * This extension provides efficient string comparison functions
 * implemented in C for better performance than PL/pgSQL equivalents.
 */

#include "postgres.h"
#include "fmgr.h"
#include "utils/builtins.h"

/* Required macro for PostgreSQL extensions */
PG_MODULE_MAGIC;

/* Function declarations - tells PostgreSQL how to call our functions */
PG_FUNCTION_INFO_V1(levenshtein_distance);
PG_FUNCTION_INFO_V1(hamming_distance);

/*
 * Calculate the Levenshtein distance between two strings.
 * Uses dynamic programming with O(m*n) time and O(min(m,n)) space.
 *
 * The Levenshtein distance counts the minimum number of single-character
 * edits (insertions, deletions, or substitutions) required to change
 * one string into the other.
 */
Datum
levenshtein_distance(PG_FUNCTION_ARGS)
{
    text *str1 = PG_GETARG_TEXT_PP(0);
    text *str2 = PG_GETARG_TEXT_PP(1);

    char *s1 = VARDATA_ANY(str1);
    char *s2 = VARDATA_ANY(str2);
    int len1 = VARSIZE_ANY_EXHDR(str1);
    int len2 = VARSIZE_ANY_EXHDR(str2);

    int *prev_row;
    int *curr_row;
    int *temp;
    int i, j;
    int result;

    /* Handle edge cases */
    if (len1 == 0)
        PG_RETURN_INT32(len2);
    if (len2 == 0)
        PG_RETURN_INT32(len1);

    /* Ensure len1 <= len2 for space optimization */
    if (len1 > len2)
    {
        char *temp_s = s1;
        int temp_len = len1;
        s1 = s2;
        len1 = len2;
        s2 = temp_s;
        len2 = temp_len;
    }

    /* Allocate working arrays in PostgreSQL's memory context */
    prev_row = (int *) palloc((len1 + 1) * sizeof(int));
    curr_row = (int *) palloc((len1 + 1) * sizeof(int));

    /* Initialize first row */
    for (i = 0; i <= len1; i++)
        prev_row[i] = i;

    /* Fill in the distance matrix row by row */
    for (j = 1; j <= len2; j++)
    {
        curr_row[0] = j;

        for (i = 1; i <= len1; i++)
        {
            int cost = (s1[i - 1] == s2[j - 1]) ? 0 : 1;
            int delete_cost = prev_row[i] + 1;
            int insert_cost = curr_row[i - 1] + 1;
            int replace_cost = prev_row[i - 1] + cost;

            /* Take minimum of three operations */
            curr_row[i] = delete_cost;
            if (insert_cost < curr_row[i])
                curr_row[i] = insert_cost;
            if (replace_cost < curr_row[i])
                curr_row[i] = replace_cost;
        }

        /* Swap rows */
        temp = prev_row;
        prev_row = curr_row;
        curr_row = temp;
    }

    result = prev_row[len1];

    /* Free allocated memory */
    pfree(prev_row);
    pfree(curr_row);

    PG_RETURN_INT32(result);
}

/*
 * Calculate the Hamming distance between two strings.
 * Strings must be of equal length.
 *
 * The Hamming distance counts positions where corresponding
 * characters differ.
 */
Datum
hamming_distance(PG_FUNCTION_ARGS)
{
    text *str1 = PG_GETARG_TEXT_PP(0);
    text *str2 = PG_GETARG_TEXT_PP(1);

    char *s1 = VARDATA_ANY(str1);
    char *s2 = VARDATA_ANY(str2);
    int len1 = VARSIZE_ANY_EXHDR(str1);
    int len2 = VARSIZE_ANY_EXHDR(str2);

    int distance = 0;
    int i;

    /* Hamming distance requires equal length strings */
    if (len1 != len2)
    {
        ereport(ERROR,
                (errcode(ERRCODE_INVALID_PARAMETER_VALUE),
                 errmsg("strings must be of equal length for Hamming distance"),
                 errhint("Use levenshtein_distance for strings of different lengths.")));
    }

    /* Count differing positions */
    for (i = 0; i < len1; i++)
    {
        if (s1[i] != s2[i])
            distance++;
    }

    PG_RETURN_INT32(distance);
}
```

Create `stringdist--1.0.sql`:

```sql
-- complain if script is sourced in psql, rather than via CREATE EXTENSION
\echo Use "CREATE EXTENSION stringdist" to load this file. \quit

-- Levenshtein distance function
-- Calculates minimum edit distance between two strings
-- Lower values indicate more similar strings
CREATE FUNCTION levenshtein_distance(text, text)
RETURNS integer
AS 'MODULE_PATHNAME', 'levenshtein_distance'
LANGUAGE C IMMUTABLE STRICT PARALLEL SAFE;

-- Hamming distance function
-- Counts positions where characters differ (requires equal length)
CREATE FUNCTION hamming_distance(text, text)
RETURNS integer
AS 'MODULE_PATHNAME', 'hamming_distance'
LANGUAGE C IMMUTABLE STRICT PARALLEL SAFE;

-- Add operator for similarity comparison
-- Returns true if Levenshtein distance is less than 3
CREATE FUNCTION strings_similar(text, text)
RETURNS boolean
LANGUAGE SQL
IMMUTABLE STRICT PARALLEL SAFE
AS $$
    SELECT levenshtein_distance($1, $2) < 3;
$$;

CREATE OPERATOR ~= (
    LEFTARG = text,
    RIGHTARG = text,
    FUNCTION = strings_similar,
    COMMUTATOR = ~=
);

COMMENT ON FUNCTION levenshtein_distance(text, text) IS
    'Calculate Levenshtein edit distance between two strings';
COMMENT ON FUNCTION hamming_distance(text, text) IS
    'Calculate Hamming distance between equal-length strings';
COMMENT ON OPERATOR ~= (text, text) IS
    'Returns true if strings are similar (Levenshtein distance < 3)';
```

Create `Makefile`:

```makefile
EXTENSION = stringdist
MODULE_big = stringdist
OBJS = src/stringdist.o
DATA = stringdist--1.0.sql

PG_CONFIG = pg_config
PGXS := $(shell $(PG_CONFIG) --pgxs)
include $(PGXS)
```

Build and install:

```bash
make
make install
```

## Using the Server Programming Interface (SPI)

SPI allows C functions to execute SQL queries. This is useful for functions that need to read or modify data.

Create `src/audit_logger.c`:

```c
/*
 * audit_logger.c - Audit logging extension using SPI
 *
 * Demonstrates how to execute SQL queries from C code
 * and work with query results.
 */

#include "postgres.h"
#include "fmgr.h"
#include "executor/spi.h"
#include "utils/builtins.h"
#include "utils/timestamp.h"
#include "catalog/pg_type.h"

PG_MODULE_MAGIC;

PG_FUNCTION_INFO_V1(log_audit_event);
PG_FUNCTION_INFO_V1(get_recent_audit_events);

/*
 * Log an audit event to the audit_log table.
 * Creates the table if it does not exist.
 *
 * Arguments:
 *   event_type - Type of event (e.g., 'INSERT', 'UPDATE', 'LOGIN')
 *   table_name - Name of affected table (can be NULL)
 *   details - JSON object with event details
 */
Datum
log_audit_event(PG_FUNCTION_ARGS)
{
    text *event_type = PG_GETARG_TEXT_PP(0);
    text *table_name = PG_ARGISNULL(1) ? NULL : PG_GETARG_TEXT_PP(1);
    text *details = PG_ARGISNULL(2) ? NULL : PG_GETARG_TEXT_PP(2);

    int ret;
    StringInfoData query;
    Oid argtypes[3] = {TEXTOID, TEXTOID, TEXTOID};
    Datum values[3];
    char nulls[3] = {' ', ' ', ' '};

    /* Connect to SPI manager */
    if (SPI_connect() != SPI_OK_CONNECT)
        ereport(ERROR,
                (errcode(ERRCODE_INTERNAL_ERROR),
                 errmsg("could not connect to SPI manager")));

    /* Create audit table if it does not exist */
    ret = SPI_execute(
        "CREATE TABLE IF NOT EXISTS audit_log ("
        "    id BIGSERIAL PRIMARY KEY,"
        "    event_time TIMESTAMPTZ DEFAULT NOW(),"
        "    event_type TEXT NOT NULL,"
        "    table_name TEXT,"
        "    details JSONB,"
        "    session_user TEXT DEFAULT SESSION_USER"
        ")",
        false,  /* not read-only */
        0       /* no row limit */
    );

    if (ret != SPI_OK_UTILITY)
        ereport(ERROR,
                (errcode(ERRCODE_INTERNAL_ERROR),
                 errmsg("failed to create audit_log table")));

    /* Prepare the insert query */
    initStringInfo(&query);
    appendStringInfoString(&query,
        "INSERT INTO audit_log (event_type, table_name, details) "
        "VALUES ($1, $2, $3::jsonb) RETURNING id");

    /* Set up parameter values */
    values[0] = PointerGetDatum(event_type);

    if (table_name == NULL)
        nulls[1] = 'n';
    else
        values[1] = PointerGetDatum(table_name);

    if (details == NULL)
        nulls[2] = 'n';
    else
        values[2] = PointerGetDatum(details);

    /* Execute the insert */
    ret = SPI_execute_with_args(
        query.data,
        3,          /* number of arguments */
        argtypes,
        values,
        nulls,
        false,      /* not read-only */
        1           /* return at most 1 row */
    );

    if (ret != SPI_OK_INSERT_RETURNING)
        ereport(ERROR,
                (errcode(ERRCODE_INTERNAL_ERROR),
                 errmsg("failed to insert audit log entry")));

    /* Get the returned ID */
    if (SPI_processed > 0)
    {
        bool isnull;
        int64 audit_id;

        audit_id = DatumGetInt64(SPI_getbinval(
            SPI_tuptable->vals[0],
            SPI_tuptable->tupdesc,
            1,
            &isnull
        ));

        SPI_finish();
        PG_RETURN_INT64(audit_id);
    }

    SPI_finish();
    PG_RETURN_NULL();
}

/*
 * Retrieve recent audit events as a set of records.
 * Returns events from the last N minutes.
 */
Datum
get_recent_audit_events(PG_FUNCTION_ARGS)
{
    FuncCallContext *funcctx;
    TupleDesc tupdesc;

    if (SRF_IS_FIRSTCALL())
    {
        MemoryContext oldcontext;
        int32 minutes = PG_GETARG_INT32(0);
        int ret;
        StringInfoData query;

        funcctx = SRF_FIRSTCALL_INIT();
        oldcontext = MemoryContextSwitchTo(funcctx->multi_call_memory_ctx);

        /* Connect to SPI */
        if (SPI_connect() != SPI_OK_CONNECT)
            ereport(ERROR,
                    (errcode(ERRCODE_INTERNAL_ERROR),
                     errmsg("could not connect to SPI manager")));

        /* Query recent events */
        initStringInfo(&query);
        appendStringInfo(&query,
            "SELECT id, event_time, event_type, table_name, details "
            "FROM audit_log "
            "WHERE event_time > NOW() - INTERVAL '%d minutes' "
            "ORDER BY event_time DESC",
            minutes);

        ret = SPI_execute(query.data, true, 0);

        if (ret != SPI_OK_SELECT)
            ereport(ERROR,
                    (errcode(ERRCODE_INTERNAL_ERROR),
                     errmsg("failed to query audit_log")));

        /* Store results for subsequent calls */
        funcctx->max_calls = SPI_processed;
        funcctx->user_fctx = SPI_tuptable;

        /* Build output tuple descriptor */
        tupdesc = CreateTemplateTupleDesc(5);
        TupleDescInitEntry(tupdesc, 1, "id", INT8OID, -1, 0);
        TupleDescInitEntry(tupdesc, 2, "event_time", TIMESTAMPTZOID, -1, 0);
        TupleDescInitEntry(tupdesc, 3, "event_type", TEXTOID, -1, 0);
        TupleDescInitEntry(tupdesc, 4, "table_name", TEXTOID, -1, 0);
        TupleDescInitEntry(tupdesc, 5, "details", JSONBOID, -1, 0);

        funcctx->tuple_desc = BlessTupleDesc(tupdesc);

        MemoryContextSwitchTo(oldcontext);
    }

    funcctx = SRF_PERCALL_SETUP();

    if (funcctx->call_cntr < funcctx->max_calls)
    {
        SPITupleTable *tuptable = (SPITupleTable *) funcctx->user_fctx;
        HeapTuple tuple = tuptable->vals[funcctx->call_cntr];

        SRF_RETURN_NEXT(funcctx, HeapTupleGetDatum(tuple));
    }
    else
    {
        SPI_finish();
        SRF_RETURN_DONE(funcctx);
    }
}
```

## Creating Custom Data Types

PostgreSQL allows you to define new data types with custom input/output functions, operators, and index support.

Create `src/email_type.c`:

```c
/*
 * email_type.c - Custom email address type for PostgreSQL
 *
 * Provides a proper email type with validation,
 * comparison operators, and efficient storage.
 */

#include "postgres.h"
#include "fmgr.h"
#include "libpq/pqformat.h"
#include "utils/builtins.h"

#include <string.h>
#include <ctype.h>

PG_MODULE_MAGIC;

/* Define the email type structure */
typedef struct Email
{
    int32 vl_len_;      /* varlena header - required */
    char data[FLEXIBLE_ARRAY_MEMBER];
} Email;

/* Function declarations */
PG_FUNCTION_INFO_V1(email_in);
PG_FUNCTION_INFO_V1(email_out);
PG_FUNCTION_INFO_V1(email_recv);
PG_FUNCTION_INFO_V1(email_send);
PG_FUNCTION_INFO_V1(email_eq);
PG_FUNCTION_INFO_V1(email_ne);
PG_FUNCTION_INFO_V1(email_lt);
PG_FUNCTION_INFO_V1(email_le);
PG_FUNCTION_INFO_V1(email_gt);
PG_FUNCTION_INFO_V1(email_ge);
PG_FUNCTION_INFO_V1(email_cmp);
PG_FUNCTION_INFO_V1(email_hash);
PG_FUNCTION_INFO_V1(email_domain);
PG_FUNCTION_INFO_V1(email_local_part);

/*
 * Basic email validation.
 * Checks for presence of @ and valid characters.
 * Production code should use a more thorough validation.
 */
static bool
validate_email(const char *str, int len)
{
    const char *at_sign = NULL;
    int i;

    if (len < 3)  /* minimum: a@b */
        return false;

    for (i = 0; i < len; i++)
    {
        char c = str[i];

        if (c == '@')
        {
            if (at_sign != NULL)
                return false;  /* multiple @ signs */
            if (i == 0)
                return false;  /* @ at start */
            at_sign = &str[i];
        }
        else if (!isalnum((unsigned char)c) &&
                 c != '.' && c != '_' && c != '-' && c != '+')
        {
            return false;  /* invalid character */
        }
    }

    if (at_sign == NULL)
        return false;  /* no @ sign */

    /* Check domain has at least one character after @ */
    if (at_sign == &str[len - 1])
        return false;

    return true;
}

/*
 * Input function - converts text to email type.
 * Validates format and converts to lowercase.
 */
Datum
email_in(PG_FUNCTION_ARGS)
{
    char *str = PG_GETARG_CSTRING(0);
    int len = strlen(str);
    Email *result;
    int i;

    if (!validate_email(str, len))
        ereport(ERROR,
                (errcode(ERRCODE_INVALID_TEXT_REPRESENTATION),
                 errmsg("invalid email address: \"%s\"", str),
                 errhint("Email must contain exactly one @ with valid characters.")));

    /* Allocate storage */
    result = (Email *) palloc(VARHDRSZ + len + 1);
    SET_VARSIZE(result, VARHDRSZ + len + 1);

    /* Copy and convert to lowercase */
    for (i = 0; i < len; i++)
        result->data[i] = tolower((unsigned char)str[i]);
    result->data[len] = '\0';

    PG_RETURN_POINTER(result);
}

/*
 * Output function - converts email type to text.
 */
Datum
email_out(PG_FUNCTION_ARGS)
{
    Email *email = (Email *) PG_GETARG_POINTER(0);
    char *result;

    result = pstrdup(email->data);
    PG_RETURN_CSTRING(result);
}

/*
 * Binary receive function for COPY operations.
 */
Datum
email_recv(PG_FUNCTION_ARGS)
{
    StringInfo buf = (StringInfo) PG_GETARG_POINTER(0);
    const char *str;
    int len;
    Email *result;

    str = pq_getmsgtext(buf, buf->len - buf->cursor, &len);

    if (!validate_email(str, len))
        ereport(ERROR,
                (errcode(ERRCODE_INVALID_TEXT_REPRESENTATION),
                 errmsg("invalid email address in binary data")));

    result = (Email *) palloc(VARHDRSZ + len + 1);
    SET_VARSIZE(result, VARHDRSZ + len + 1);
    memcpy(result->data, str, len + 1);

    PG_RETURN_POINTER(result);
}

/*
 * Binary send function for COPY operations.
 */
Datum
email_send(PG_FUNCTION_ARGS)
{
    Email *email = (Email *) PG_GETARG_POINTER(0);
    StringInfoData buf;

    pq_begintypsend(&buf);
    pq_sendtext(&buf, email->data, strlen(email->data));
    PG_RETURN_BYTEA_P(pq_endtypsend(&buf));
}

/*
 * Comparison function for sorting and B-tree indexes.
 * Returns -1, 0, or 1.
 */
static int
email_cmp_internal(Email *a, Email *b)
{
    return strcmp(a->data, b->data);
}

/* Equality operator */
Datum
email_eq(PG_FUNCTION_ARGS)
{
    Email *a = (Email *) PG_GETARG_POINTER(0);
    Email *b = (Email *) PG_GETARG_POINTER(1);

    PG_RETURN_BOOL(email_cmp_internal(a, b) == 0);
}

/* Inequality operator */
Datum
email_ne(PG_FUNCTION_ARGS)
{
    Email *a = (Email *) PG_GETARG_POINTER(0);
    Email *b = (Email *) PG_GETARG_POINTER(1);

    PG_RETURN_BOOL(email_cmp_internal(a, b) != 0);
}

/* Less than operator */
Datum
email_lt(PG_FUNCTION_ARGS)
{
    Email *a = (Email *) PG_GETARG_POINTER(0);
    Email *b = (Email *) PG_GETARG_POINTER(1);

    PG_RETURN_BOOL(email_cmp_internal(a, b) < 0);
}

/* Less than or equal operator */
Datum
email_le(PG_FUNCTION_ARGS)
{
    Email *a = (Email *) PG_GETARG_POINTER(0);
    Email *b = (Email *) PG_GETARG_POINTER(1);

    PG_RETURN_BOOL(email_cmp_internal(a, b) <= 0);
}

/* Greater than operator */
Datum
email_gt(PG_FUNCTION_ARGS)
{
    Email *a = (Email *) PG_GETARG_POINTER(0);
    Email *b = (Email *) PG_GETARG_POINTER(1);

    PG_RETURN_BOOL(email_cmp_internal(a, b) > 0);
}

/* Greater than or equal operator */
Datum
email_ge(PG_FUNCTION_ARGS)
{
    Email *a = (Email *) PG_GETARG_POINTER(0);
    Email *b = (Email *) PG_GETARG_POINTER(1);

    PG_RETURN_BOOL(email_cmp_internal(a, b) >= 0);
}

/* B-tree comparison function */
Datum
email_cmp(PG_FUNCTION_ARGS)
{
    Email *a = (Email *) PG_GETARG_POINTER(0);
    Email *b = (Email *) PG_GETARG_POINTER(1);

    PG_RETURN_INT32(email_cmp_internal(a, b));
}

/* Hash function for hash indexes and hash joins */
Datum
email_hash(PG_FUNCTION_ARGS)
{
    Email *email = (Email *) PG_GETARG_POINTER(0);

    PG_RETURN_INT32(hash_any((unsigned char *) email->data, strlen(email->data)));
}

/* Extract domain from email */
Datum
email_domain(PG_FUNCTION_ARGS)
{
    Email *email = (Email *) PG_GETARG_POINTER(0);
    char *at_sign;

    at_sign = strchr(email->data, '@');
    if (at_sign == NULL)
        PG_RETURN_NULL();

    PG_RETURN_TEXT_P(cstring_to_text(at_sign + 1));
}

/* Extract local part from email */
Datum
email_local_part(PG_FUNCTION_ARGS)
{
    Email *email = (Email *) PG_GETARG_POINTER(0);
    char *at_sign;
    int local_len;
    char *result;

    at_sign = strchr(email->data, '@');
    if (at_sign == NULL)
        PG_RETURN_NULL();

    local_len = at_sign - email->data;
    result = palloc(local_len + 1);
    memcpy(result, email->data, local_len);
    result[local_len] = '\0';

    PG_RETURN_TEXT_P(cstring_to_text(result));
}
```

Create `emailtype--1.0.sql`:

```sql
-- complain if script is sourced in psql, rather than via CREATE EXTENSION
\echo Use "CREATE EXTENSION emailtype" to load this file. \quit

-- Create the shell type first
CREATE TYPE email;

-- Input/output functions
CREATE FUNCTION email_in(cstring)
RETURNS email
AS 'MODULE_PATHNAME', 'email_in'
LANGUAGE C IMMUTABLE STRICT PARALLEL SAFE;

CREATE FUNCTION email_out(email)
RETURNS cstring
AS 'MODULE_PATHNAME', 'email_out'
LANGUAGE C IMMUTABLE STRICT PARALLEL SAFE;

CREATE FUNCTION email_recv(internal)
RETURNS email
AS 'MODULE_PATHNAME', 'email_recv'
LANGUAGE C IMMUTABLE STRICT PARALLEL SAFE;

CREATE FUNCTION email_send(email)
RETURNS bytea
AS 'MODULE_PATHNAME', 'email_send'
LANGUAGE C IMMUTABLE STRICT PARALLEL SAFE;

-- Complete the type definition
CREATE TYPE email (
    INPUT = email_in,
    OUTPUT = email_out,
    RECEIVE = email_recv,
    SEND = email_send,
    INTERNALLENGTH = VARIABLE,
    STORAGE = extended
);

-- Comparison functions
CREATE FUNCTION email_eq(email, email) RETURNS boolean
AS 'MODULE_PATHNAME', 'email_eq' LANGUAGE C IMMUTABLE STRICT PARALLEL SAFE;

CREATE FUNCTION email_ne(email, email) RETURNS boolean
AS 'MODULE_PATHNAME', 'email_ne' LANGUAGE C IMMUTABLE STRICT PARALLEL SAFE;

CREATE FUNCTION email_lt(email, email) RETURNS boolean
AS 'MODULE_PATHNAME', 'email_lt' LANGUAGE C IMMUTABLE STRICT PARALLEL SAFE;

CREATE FUNCTION email_le(email, email) RETURNS boolean
AS 'MODULE_PATHNAME', 'email_le' LANGUAGE C IMMUTABLE STRICT PARALLEL SAFE;

CREATE FUNCTION email_gt(email, email) RETURNS boolean
AS 'MODULE_PATHNAME', 'email_gt' LANGUAGE C IMMUTABLE STRICT PARALLEL SAFE;

CREATE FUNCTION email_ge(email, email) RETURNS boolean
AS 'MODULE_PATHNAME', 'email_ge' LANGUAGE C IMMUTABLE STRICT PARALLEL SAFE;

CREATE FUNCTION email_cmp(email, email) RETURNS integer
AS 'MODULE_PATHNAME', 'email_cmp' LANGUAGE C IMMUTABLE STRICT PARALLEL SAFE;

CREATE FUNCTION email_hash(email) RETURNS integer
AS 'MODULE_PATHNAME', 'email_hash' LANGUAGE C IMMUTABLE STRICT PARALLEL SAFE;

-- Operators
CREATE OPERATOR = (
    LEFTARG = email, RIGHTARG = email,
    FUNCTION = email_eq,
    COMMUTATOR = =, NEGATOR = <>,
    RESTRICT = eqsel, JOIN = eqjoinsel,
    HASHES, MERGES
);

CREATE OPERATOR <> (
    LEFTARG = email, RIGHTARG = email,
    FUNCTION = email_ne,
    COMMUTATOR = <>, NEGATOR = =,
    RESTRICT = neqsel, JOIN = neqjoinsel
);

CREATE OPERATOR < (
    LEFTARG = email, RIGHTARG = email,
    FUNCTION = email_lt,
    COMMUTATOR = >, NEGATOR = >=,
    RESTRICT = scalarltsel, JOIN = scalarltjoinsel
);

CREATE OPERATOR <= (
    LEFTARG = email, RIGHTARG = email,
    FUNCTION = email_le,
    COMMUTATOR = >=, NEGATOR = >,
    RESTRICT = scalarlesel, JOIN = scalarlejoinsel
);

CREATE OPERATOR > (
    LEFTARG = email, RIGHTARG = email,
    FUNCTION = email_gt,
    COMMUTATOR = <, NEGATOR = <=,
    RESTRICT = scalargtsel, JOIN = scalargtjoinsel
);

CREATE OPERATOR >= (
    LEFTARG = email, RIGHTARG = email,
    FUNCTION = email_ge,
    COMMUTATOR = <=, NEGATOR = <,
    RESTRICT = scalargesel, JOIN = scalargejoinsel
);

-- Operator classes for indexing
CREATE OPERATOR CLASS email_ops
DEFAULT FOR TYPE email USING btree AS
    OPERATOR 1 <,
    OPERATOR 2 <=,
    OPERATOR 3 =,
    OPERATOR 4 >=,
    OPERATOR 5 >,
    FUNCTION 1 email_cmp(email, email);

CREATE OPERATOR CLASS email_hash_ops
DEFAULT FOR TYPE email USING hash AS
    OPERATOR 1 =,
    FUNCTION 1 email_hash(email);

-- Utility functions
CREATE FUNCTION email_domain(email) RETURNS text
AS 'MODULE_PATHNAME', 'email_domain' LANGUAGE C IMMUTABLE STRICT PARALLEL SAFE;

CREATE FUNCTION email_local_part(email) RETURNS text
AS 'MODULE_PATHNAME', 'email_local_part' LANGUAGE C IMMUTABLE STRICT PARALLEL SAFE;

-- Cast from text
CREATE CAST (text AS email) WITH INOUT AS IMPLICIT;
CREATE CAST (email AS text) WITH INOUT AS IMPLICIT;

-- Comments
COMMENT ON TYPE email IS 'Email address type with validation';
COMMENT ON FUNCTION email_domain(email) IS 'Extract domain from email address';
COMMENT ON FUNCTION email_local_part(email) IS 'Extract local part from email address';
```

## Testing Extensions

Create a test file `test/sql/basic_test.sql`:

```sql
-- Test suite for the email type extension

-- Enable verbose output
\set VERBOSITY verbose

-- Test basic input/output
SELECT 'user@example.com'::email;
SELECT 'USER@EXAMPLE.COM'::email;  -- should be lowercased

-- Test invalid emails (should fail)
\set ON_ERROR_STOP off
SELECT 'invalid'::email;
SELECT '@nodomain.com'::email;
SELECT 'no@'::email;
SELECT 'two@@signs.com'::email;
\set ON_ERROR_STOP on

-- Test comparison operators
SELECT 'alice@example.com'::email = 'ALICE@EXAMPLE.COM'::email AS should_be_true;
SELECT 'alice@example.com'::email < 'bob@example.com'::email AS should_be_true;
SELECT 'bob@example.com'::email > 'alice@example.com'::email AS should_be_true;

-- Test utility functions
SELECT email_domain('user@example.com'::email);
SELECT email_local_part('user@example.com'::email);

-- Test indexing
CREATE TABLE email_test (id serial, addr email);
CREATE INDEX ON email_test USING btree (addr);
CREATE INDEX ON email_test USING hash (addr);

INSERT INTO email_test (addr) VALUES
    ('alice@example.com'),
    ('bob@example.com'),
    ('charlie@test.org');

-- Test index usage
SET enable_seqscan = off;
EXPLAIN (COSTS OFF) SELECT * FROM email_test WHERE addr = 'bob@example.com'::email;
SELECT * FROM email_test WHERE addr = 'bob@example.com'::email;

-- Cleanup
DROP TABLE email_test;
```

Create `Makefile` with test support:

```makefile
EXTENSION = emailtype
MODULE_big = emailtype
OBJS = src/email_type.o
DATA = emailtype--1.0.sql

REGRESS = basic_test
REGRESS_OPTS = --inputdir=test

PG_CONFIG = pg_config
PGXS := $(shell $(PG_CONFIG) --pgxs)
include $(PGXS)
```

Run tests:

```bash
make installcheck
```

## Distribution and Packaging

### PGXN Distribution

Create a `META.json` file for PGXN (PostgreSQL Extension Network):

```json
{
    "name": "emailtype",
    "abstract": "Custom email address type with validation and indexing support",
    "version": "1.0.0",
    "maintainer": "Your Name <your@email.com>",
    "license": "postgresql",
    "provides": {
        "emailtype": {
            "file": "emailtype--1.0.sql",
            "version": "1.0.0"
        }
    },
    "prereqs": {
        "runtime": {
            "requires": {
                "PostgreSQL": "12.0.0"
            }
        }
    },
    "resources": {
        "repository": {
            "url": "https://github.com/yourusername/emailtype",
            "web": "https://github.com/yourusername/emailtype",
            "type": "git"
        }
    },
    "generated_by": "hand",
    "meta-spec": {
        "version": "1.0.0",
        "url": "https://pgxn.org/meta/spec.txt"
    },
    "tags": ["email", "data type", "validation"]
}
```

### Debian Package

Create `debian/control`:

```
Source: postgresql-emailtype
Section: database
Priority: optional
Maintainer: Your Name <your@email.com>
Build-Depends: debhelper (>= 9), postgresql-server-dev-all
Standards-Version: 4.1.3

Package: postgresql-16-emailtype
Architecture: any
Depends: ${shlibs:Depends}, ${misc:Depends}, postgresql-16
Description: Custom email type for PostgreSQL
 This extension provides a validated email address type
 with comparison operators and index support.
```

### RPM Package

Create `emailtype.spec`:

```spec
Name:           postgresql16-emailtype
Version:        1.0
Release:        1%{?dist}
Summary:        Custom email type for PostgreSQL

License:        PostgreSQL
URL:            https://github.com/yourusername/emailtype
Source0:        emailtype-%{version}.tar.gz

BuildRequires:  postgresql16-devel
Requires:       postgresql16-server

%description
This extension provides a validated email address type
with comparison operators and index support.

%prep
%setup -q -n emailtype-%{version}

%build
make %{?_smp_mflags}

%install
make install DESTDIR=%{buildroot}

%files
%{_libdir}/pgsql/emailtype.so
%{_datadir}/pgsql/extension/emailtype*
```

## Debugging Tips

### Enable Debug Output

Add debug logging to your C functions:

```c
#include "utils/elog.h"

/* Debug levels: DEBUG1-DEBUG5, LOG, INFO, NOTICE, WARNING, ERROR */
ereport(DEBUG1,
        (errmsg("email_in called with: %s", str)));

/* For quick debugging during development */
elog(NOTICE, "Processing value: %d", some_value);
```

### Use GDB for Debugging

```bash
# Start PostgreSQL in foreground with debugging
pg_ctl start -o "-F"

# Find the backend PID
psql -c "SELECT pg_backend_pid();"

# Attach GDB
gdb -p <pid>

# Set breakpoint and continue
break levenshtein_distance
continue
```

### Memory Debugging

Use Valgrind to detect memory issues:

```bash
# Configure PostgreSQL for Valgrind
./configure --enable-debug --enable-cassert CFLAGS="-O0 -g"

# Run with Valgrind
valgrind --leak-check=full postgres -D /path/to/data
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Use `palloc`, not `malloc` | PostgreSQL manages memory contexts automatically |
| Mark functions `PARALLEL SAFE` | Enable parallel query execution when safe |
| Use `STRICT` for NULL handling | Function returns NULL if any argument is NULL |
| Add `IMMUTABLE`/`STABLE`/`VOLATILE` | Helps query planner optimize calls |
| Version your SQL files | Use semantic versioning like `ext--1.0--1.1.sql` |
| Write regression tests | Use `make installcheck` to run tests |
| Document with `COMMENT ON` | Add descriptions visible in `\df+` |

## Common Pitfalls

1. **Forgetting PG_MODULE_MAGIC**: Your extension will fail to load without this macro.

2. **Memory leaks**: Always use `palloc`/`pfree` and let PostgreSQL manage memory contexts.

3. **Missing error handling**: Use `ereport` with appropriate error codes.

4. **Not handling NULL**: Mark functions `STRICT` or check `PG_ARGISNULL()` explicitly.

5. **Breaking upgrades**: Never modify existing version SQL files, create upgrade scripts instead.

6. **Incorrect PGXS paths**: Ensure `pg_config` is in your PATH and points to the right installation.

## Further Resources

- PostgreSQL Documentation: Extension Building
- PostgreSQL Source Code: `contrib/` directory contains official extensions
- PGXN: PostgreSQL Extension Network for distribution
- pgrx: Rust framework for PostgreSQL extensions
- pgTAP: Unit testing framework for PostgreSQL

Building PostgreSQL extensions opens up the full power of the database engine. Start with SQL-only extensions for simple use cases, then move to C when you need performance or low-level access. The extension system makes it straightforward to package, version, and distribute your custom functionality.
