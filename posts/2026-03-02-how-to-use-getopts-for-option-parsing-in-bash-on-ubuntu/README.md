# How to Use getopts for Option Parsing in Bash on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bash, Scripting, Shell, Linux

Description: Learn how to parse command-line options in Bash scripts on Ubuntu using getopts, including flags, arguments, error handling, and building a professional CLI interface.

---

Scripts that accept multiple options need a systematic way to parse them. Manually shifting through `$@` with if statements gets messy quickly. `getopts` is the POSIX-standard way to handle option parsing in Bash - it handles the parsing loop, extracts option arguments, and deals with errors consistently.

## Why Use getopts Instead of Manual Parsing

Compare these two approaches to accepting a `-f file -v -n 10` style invocation:

Without getopts:
```bash
# Fragile manual parsing
while [ "$#" -gt 0 ]; do
    case "$1" in
        -f) file="$2"; shift 2 ;;
        -v) verbose=true; shift ;;
        -n) count="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done
```

This breaks with combined flags like `-vf myfile` or options in different order. `getopts` handles all of this correctly.

## Basic getopts Syntax

```bash
while getopts "optstring" opt; do
    case $opt in
        option) # handle option ;;
    esac
done
```

The `optstring` defines valid options:
- Each letter is a valid option (e.g., `"vhf"` allows `-v`, `-h`, `-f`)
- A colon after a letter means that option takes an argument (e.g., `"f:"` means `-f` requires a value)
- A leading colon enables silent error handling (e.g., `":vhf:"`)

## A Simple Example

```bash
#!/bin/bash

# Accept -v (verbose), -h (help), -f filename
verbose=false
filename=""

while getopts "vhf:" opt; do
    case $opt in
        v)
            verbose=true
            ;;
        h)
            echo "Usage: $0 [-v] [-h] [-f filename]"
            echo "  -v  Verbose output"
            echo "  -h  Show this help"
            echo "  -f  Input filename"
            exit 0
            ;;
        f)
            # $OPTARG contains the argument to -f
            filename="$OPTARG"
            ;;
        ?)
            # Invalid option - getopts prints error automatically
            echo "Usage: $0 [-v] [-h] [-f filename]" >&2
            exit 1
            ;;
    esac
done

# After options, $OPTIND is the index of the first non-option argument
shift $(( OPTIND - 1 ))
# Remaining arguments are in $@

$verbose && echo "Verbose mode enabled"
[ -n "$filename" ] && echo "Input file: $filename"
echo "Remaining arguments: $@"
```

Run it:
```bash
./script.sh -v -f data.txt arg1 arg2
# Output:
# Verbose mode enabled
# Input file: data.txt
# Remaining arguments: arg1 arg2
```

## The OPTARG and OPTIND Variables

`getopts` uses three variables:
- `$OPTARG` - contains the argument for the current option (when the option requires one)
- `$OPTIND` - the index of the next argument to be processed
- `$opt` - the option character (set by getopts on each iteration)

After the loop, `$OPTIND` points to the first non-option argument. The `shift $(( OPTIND - 1 ))` line removes all the processed options, leaving just the positional arguments in `$@`.

```bash
#!/bin/bash

# After processing -f file.txt arg1 arg2
# OPTIND would be 3 (pointing to arg1)
# shift $(( 3 - 1 )) removes -f and file.txt
# $@ now contains: arg1 arg2
```

## Silent Error Handling

Leading the optstring with `:` enables silent mode, giving you control over error messages:

```bash
#!/bin/bash

# Note the leading : in ":vf:n:"
while getopts ":vf:n:h" opt; do
    case $opt in
        v) verbose=true ;;
        f) filename="$OPTARG" ;;
        n) count="$OPTARG" ;;
        h)
            show_help
            exit 0
            ;;
        :)
            # $OPTARG contains the option that was missing its argument
            echo "Error: Option -$OPTARG requires an argument" >&2
            exit 1
            ;;
        \?)
            # $OPTARG contains the unknown option character
            echo "Error: Unknown option -$OPTARG" >&2
            exit 1
            ;;
    esac
done
```

Without the leading `:`, getopts prints its own error messages to stderr. With it, you handle errors yourself via the `:` and `?` cases.

## Validating Option Arguments

getopts doesn't validate the content of arguments - that's your job:

```bash
#!/bin/bash

port=80
log_level="info"
output_dir="/tmp"

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
  -p PORT      Port number (1-65535, default: 80)
  -l LEVEL     Log level (debug|info|warn|error, default: info)
  -o DIR       Output directory (must exist)
  -h           Show this help

Examples:
  $0 -p 8080 -l debug
  $0 -p 443 -o /var/log/myapp
EOF
}

while getopts ":p:l:o:h" opt; do
    case $opt in
        p)
            port="$OPTARG"
            # Validate: must be an integer between 1 and 65535
            if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
                echo "Error: -p requires a port number between 1 and 65535, got: $port" >&2
                exit 1
            fi
            ;;
        l)
            log_level="$OPTARG"
            # Validate: must be one of the allowed levels
            case "$log_level" in
                debug|info|warn|error) ;;  # Valid values
                *)
                    echo "Error: -l requires debug, info, warn, or error, got: $log_level" >&2
                    exit 1
                    ;;
            esac
            ;;
        o)
            output_dir="$OPTARG"
            # Validate: directory must exist
            if [ ! -d "$output_dir" ]; then
                echo "Error: Output directory does not exist: $output_dir" >&2
                exit 1
            fi
            ;;
        h)
            show_usage
            exit 0
            ;;
        :)
            echo "Error: Option -$OPTARG requires an argument" >&2
            show_usage >&2
            exit 1
            ;;
        \?)
            echo "Error: Unknown option -$OPTARG" >&2
            show_usage >&2
            exit 1
            ;;
    esac
done

shift $(( OPTIND - 1 ))

echo "Configuration:"
echo "  Port: $port"
echo "  Log level: $log_level"
echo "  Output dir: $output_dir"
echo "  Remaining args: $@"
```

## Handling Boolean Flags and Counts

Flags (options without arguments) are simple boolean toggles. You can also count how many times a flag appears:

```bash
#!/bin/bash

verbose=0  # Count verbose flags for different verbosity levels
dry_run=false
force=false

while getopts ":vdf" opt; do
    case $opt in
        v)
            # Each -v increases verbosity
            (( verbose++ ))
            ;;
        d)
            dry_run=true
            ;;
        f)
            force=true
            ;;
        \?)
            echo "Unknown option: -$OPTARG" >&2
            exit 1
            ;;
    esac
done

# Check verbosity level
if [ $verbose -ge 2 ]; then
    echo "Debug mode enabled (level $verbose)"
elif [ $verbose -ge 1 ]; then
    echo "Verbose mode enabled"
fi

$dry_run && echo "DRY RUN - no changes will be made"
$force && echo "Force mode enabled"
```

## Combining Short and Long Options

`getopts` only supports single-character options. For long options like `--help` or `--output-dir`, you need a different approach. One common pattern is handling `--` manually:

```bash
#!/bin/bash

# Handle both short and long options
output=""
verbose=false
help=false

# Process long options before getopts
args=()
for arg in "$@"; do
    case "$arg" in
        --output=*) output="${arg#--output=}"; shift ;;
        --verbose)  verbose=true; shift ;;
        --help)     help=true; shift ;;
        --)         shift; break ;;
        --*)        echo "Unknown option: $arg" >&2; exit 1 ;;
        *)          args+=("$arg") ;;
    esac
done

# Reset positional parameters to remaining args
set -- "${args[@]:-}" "$@"

# Now handle short options
while getopts ":o:vh" opt; do
    case $opt in
        o) output="$OPTARG" ;;
        v) verbose=true ;;
        h) help=true ;;
        :) echo "Error: -$OPTARG needs an argument" >&2; exit 1 ;;
        \?) echo "Error: Unknown option -$OPTARG" >&2; exit 1 ;;
    esac
done

shift $(( OPTIND - 1 ))

$help && { echo "Help text here"; exit 0; }

echo "Output: ${output:-not set}"
echo "Verbose: $verbose"
echo "Remaining args: $@"
```

## A Real-World Script: Database Backup Tool

```bash
#!/bin/bash
# pg-backup.sh - PostgreSQL backup utility

set -euo pipefail

# Defaults
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME=""
DB_USER="postgres"
OUTPUT_DIR="/var/backups/postgresql"
COMPRESS=false
VERBOSE=false

show_help() {
    cat << EOF
Usage: $0 [OPTIONS] -d DATABASE

Options:
  -h HOST    Database host (default: localhost)
  -P PORT    Database port (default: 5432)
  -d DB      Database name (required)
  -u USER    Database user (default: postgres)
  -o DIR     Output directory (default: /var/backups/postgresql)
  -z         Compress with gzip
  -v         Verbose output
  --help     Show this help

Examples:
  $0 -d myapp
  $0 -h db.prod.internal -d myapp -u backupuser -z -o /mnt/backups
EOF
}

# Handle --help before getopts
if [[ "${1:-}" == "--help" ]]; then
    show_help
    exit 0
fi

while getopts ":h:P:d:u:o:zv" opt; do
    case $opt in
        h) DB_HOST="$OPTARG" ;;
        P) DB_PORT="$OPTARG" ;;
        d) DB_NAME="$OPTARG" ;;
        u) DB_USER="$OPTARG" ;;
        o) OUTPUT_DIR="$OPTARG" ;;
        z) COMPRESS=true ;;
        v) VERBOSE=true ;;
        :)
            echo "Error: Option -$OPTARG requires an argument" >&2
            show_help >&2
            exit 1
            ;;
        \?)
            echo "Error: Unknown option -$OPTARG" >&2
            show_help >&2
            exit 1
            ;;
    esac
done

# Validate required options
if [ -z "$DB_NAME" ]; then
    echo "Error: Database name (-d) is required" >&2
    show_help >&2
    exit 1
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$OUTPUT_DIR/${DB_NAME}-${TIMESTAMP}.sql"
$COMPRESS && BACKUP_FILE="${BACKUP_FILE}.gz"

$VERBOSE && echo "Backing up $DB_NAME from $DB_HOST:$DB_PORT"

mkdir -p "$OUTPUT_DIR"

if $COMPRESS; then
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
else
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"
fi

echo "Backup written to: $BACKUP_FILE"
$VERBOSE && echo "Size: $(du -sh "$BACKUP_FILE" | cut -f1)"
```

The `getopts` builtin handles option parsing robustly for short options. It's the right tool when you want standard Unix-style option syntax without pulling in external dependencies like `getopt` (the separate utility).
