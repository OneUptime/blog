# Mastering Bash Parameter Expansion

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bash, Shell Scripting, Linux, Parameter Expansion, DevOps

Description: A practical guide to Bash parameter expansion covering default values, string manipulation, pattern matching, and array operations with real-world examples.

---

Parameter expansion is one of Bash's most powerful features, yet most scripts only scratch the surface. Beyond the basic `$variable` syntax, Bash offers a rich set of operators for default values, string manipulation, pattern matching, and more. Knowing these operators means fewer calls to `sed`, `awk`, and `cut`, and scripts that run faster because they avoid spawning subprocesses.

## The Basics

Every time you write `$var` or `${var}`, you are using parameter expansion. The braces are optional for simple cases but required when you need to disambiguate or apply operators.

```bash
# Without braces: ambiguous
name="world"
echo "$namewide"   # Bash looks for variable "namewide", not "name" + "wide"

# With braces: unambiguous
echo "${name}wide"  # Outputs: worldwide
```

Always use braces when the variable is followed by characters that could be part of a name. It is a good habit to use braces consistently.

## Default Values

These operators handle missing or empty variables without requiring explicit if/else blocks. They are essential for writing scripts that accept optional configuration.

### `${var:-default}` - Use Default Value

Returns `default` if `var` is unset or empty, but does not modify `var`.

```bash
# Use a default value without modifying the original variable
environment="${ENVIRONMENT:-development}"
echo "Running in: $environment"
# If ENVIRONMENT is not set, outputs: Running in: development
# If ENVIRONMENT=production, outputs: Running in: production
```

### `${var:=default}` - Assign Default Value

Like `:-` but also assigns the default to `var` if it was unset or empty.

```bash
# Assign a default, so subsequent uses of LOG_DIR also get the default
: "${LOG_DIR:=/var/log/myapp}"
mkdir -p "$LOG_DIR"
# LOG_DIR is now set to /var/log/myapp if it was not already defined
```

The `:` command (colon) is a no-op that evaluates its arguments without doing anything. It is commonly paired with `:=` to set defaults at the top of a script.

### `${var:+alternate}` - Use Alternate Value

Returns `alternate` if `var` is set and non-empty. Returns nothing if `var` is unset or empty.

```bash
# Conditionally add a flag only when a variable is set
verbose="${VERBOSE:+--verbose}"
curl $verbose https://api.example.com/health
# If VERBOSE is set to anything, curl gets --verbose
# If VERBOSE is unset, curl gets no extra flag
```

### `${var:?message}` - Error if Unset

Exits the script with an error message if `var` is unset or empty. This is perfect for required parameters.

```bash
# Require critical environment variables, fail fast if missing
: "${DATABASE_URL:?DATABASE_URL must be set}"
: "${API_KEY:?API_KEY must be set}"
# Script exits immediately with the error message if either is missing
```

## String Length

`${#var}` returns the length of the string stored in `var`.

```bash
# Check password length without calling external tools
password="hunter2"
if [[ ${#password} -lt 8 ]]; then
    echo "Password must be at least 8 characters" >&2
    exit 1
fi
```

## Substring Extraction

`${var:offset:length}` extracts a portion of the string. Offset is zero-based.

```bash
# Extract parts of a structured string
timestamp="2026-02-13T14:30:00Z"

# Extract the date portion (first 10 characters)
date_part="${timestamp:0:10}"
echo "$date_part"  # 2026-02-13

# Extract the time portion (characters 11 through 18)
time_part="${timestamp:11:8}"
echo "$time_part"  # 14:30:00

# Negative offset extracts from the end (note the space before the minus)
last_four="${timestamp: -1}"
echo "$last_four"  # Z
```

The space before a negative offset is required. Without it, Bash interprets `${var:-1}` as the default value operator.

## Pattern Removal

These operators strip patterns from the beginning or end of a string. They are the Bash equivalent of simple `sed` substitutions and run much faster because no subprocess is spawned.

### `${var#pattern}` and `${var##pattern}` - Remove from Front

`#` removes the shortest match; `##` removes the longest match.

```bash
filepath="/home/user/documents/report.tar.gz"

# Remove shortest match from front: strip the leading /
echo "${filepath#/}"         # home/user/documents/report.tar.gz

# Remove longest match from front: strip everything up to the last /
echo "${filepath##*/}"       # report.tar.gz (same as basename)
```

### `${var%pattern}` and `${var%%pattern}` - Remove from End

`%` removes the shortest match from the end; `%%` removes the longest match.

```bash
filepath="/home/user/documents/report.tar.gz"

# Remove shortest match from end: strip the last extension
echo "${filepath%.*}"        # /home/user/documents/report.tar

# Remove longest match from end: strip all extensions
echo "${filepath%%.*}"       # /home/user/documents/report

# Get the directory path (same as dirname)
echo "${filepath%/*}"        # /home/user/documents
```

### Practical Example: File Extension Handling

These operators shine when you need to manipulate file paths without calling `basename`, `dirname`, or `sed`.

```bash
# Rename files from .log to .log.bak using only parameter expansion
for logfile in /var/log/myapp/*.log; do
    # ${logfile%.log} strips ".log" from the end
    mv "$logfile" "${logfile%.log}.log.bak"
done
```

```bash
# Process files differently based on extension
process_file() {
    local file="$1"
    local ext="${file##*.}"    # Extract extension
    local base="${file%.*}"    # Extract base name without extension

    case "$ext" in
        gz)  gunzip "$file" && process_file "$base" ;;
        csv) import_csv "$file" ;;
        json) import_json "$file" ;;
        *)   echo "Unknown format: $ext" >&2; return 1 ;;
    esac
}
```

## Search and Replace

`${var/pattern/replacement}` replaces the first match. `${var//pattern/replacement}` replaces all matches.

```bash
message="Hello World, Hello Bash"

# Replace first occurrence
echo "${message/Hello/Hi}"      # Hi World, Hello Bash

# Replace all occurrences
echo "${message//Hello/Hi}"     # Hi World, Hi Bash

# Delete a pattern (replace with nothing)
echo "${message//Hello/}"       #  World,  Bash
```

### Anchored Replacement

Use `#` to anchor the match at the start, or `%` to anchor at the end.

```bash
path="src/main/java/App.java"

# Replace only if the pattern matches at the start
echo "${path/#src/build}"       # build/main/java/App.java

# Replace only if the pattern matches at the end
echo "${path/%.java/.class}"    # src/main/java/App.class
```

## Case Conversion

Bash 4+ supports case conversion directly in parameter expansion.

```bash
name="john doe"

# Uppercase first character
echo "${name^}"      # John doe

# Uppercase all characters
echo "${name^^}"     # JOHN DOE

greeting="HELLO WORLD"

# Lowercase first character
echo "${greeting,}"  # hELLO WORLD

# Lowercase all characters
echo "${greeting,,}" # hello world
```

This is handy for normalizing user input without calling `tr` or `awk`.

```bash
# Normalize environment name to lowercase for comparison
env_input="${1:-}"
env_lower="${env_input,,}"

case "$env_lower" in
    production|prod) deploy_to_prod ;;
    staging|stg)     deploy_to_staging ;;
    *)               echo "Unknown environment: $env_input" >&2; exit 1 ;;
esac
```

## Array Parameter Expansion

Most of these operators work on arrays too, applying the operation to each element.

```bash
# Apply pattern removal to every element in an array
files=("/tmp/data1.csv" "/tmp/data2.csv" "/tmp/data3.csv")

# Strip directory from all elements
basenames=("${files[@]##*/}")
echo "${basenames[@]}"  # data1.csv data2.csv data3.csv

# Replace pattern in all elements
new_files=("${files[@]/tmp/archive}")
echo "${new_files[@]}"  # /archive/data1.csv /archive/data2.csv /archive/data3.csv
```

### Array Length and Slicing

```bash
fruits=("apple" "banana" "cherry" "date" "elderberry")

# Number of elements
echo "${#fruits[@]}"     # 5

# Length of a specific element
echo "${#fruits[1]}"     # 6 (length of "banana")

# Slice: elements 1 through 3
echo "${fruits[@]:1:3}"  # banana cherry date

# All elements from index 2 onward
echo "${fruits[@]:2}"    # cherry date elderberry
```

## Indirect Expansion

`${!var}` expands to the value of the variable whose name is stored in `var`. This enables dynamic variable lookup.

```bash
# Look up configuration values dynamically based on environment
DB_HOST_production="prod-db.example.com"
DB_HOST_staging="staging-db.example.com"

env="production"
var_name="DB_HOST_${env}"

# Indirect expansion: get the value of DB_HOST_production
db_host="${!var_name}"
echo "$db_host"  # prod-db.example.com
```

Use indirect expansion sparingly. It makes code harder to follow and is often a sign that you should be using an associative array instead.

```bash
# Associative array: cleaner alternative to indirect expansion
declare -A DB_HOST
DB_HOST[production]="prod-db.example.com"
DB_HOST[staging]="staging-db.example.com"

env="production"
echo "${DB_HOST[$env]}"  # prod-db.example.com
```

## Combining Operators

You can chain parameter expansions to perform multiple operations, though each one requires a separate expansion step.

```bash
# Extract and normalize a value from a file path
# Input: /data/RAW_SALES_2026-Q1.CSV
filepath="/data/RAW_SALES_2026-Q1.CSV"

# Step 1: Get the filename without the path
filename="${filepath##*/}"          # RAW_SALES_2026-Q1.CSV

# Step 2: Remove the extension
base="${filename%.*}"               # RAW_SALES_2026-Q1

# Step 3: Lowercase everything
normalized="${base,,}"              # raw_sales_2026-q1

echo "$normalized"
```

## Performance Benefits

Parameter expansion happens inside the Bash process. External commands like `sed`, `awk`, and `cut` spawn a new process for each call. In a loop processing thousands of items, this difference is significant.

```bash
# SLOW: spawns a new process for each iteration
for f in /data/*.csv; do
    base=$(basename "$f" .csv)     # Forks a subprocess
    echo "$base"
done

# FAST: pure parameter expansion, no subprocesses
for f in /data/*.csv; do
    base="${f##*/}"                 # No subprocess
    base="${base%.csv}"             # No subprocess
    echo "$base"
done
```

For scripts that process hundreds or thousands of files, the pure Bash version can be an order of magnitude faster.

Parameter expansion is not a replacement for `sed` or `awk` in all cases. Complex regex transformations, multi-line processing, and field extraction on structured data are still better handled by dedicated tools. But for the common cases of default values, path manipulation, and simple string operations, parameter expansion is faster, more readable, and avoids the quoting headaches that come with piping through external commands.
