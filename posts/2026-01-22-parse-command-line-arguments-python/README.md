# How to Parse Command Line Arguments in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, argparse, CLI, Command Line, Scripts

Description: Learn to build command-line interfaces in Python using argparse. Handle positional arguments, optional flags, subcommands, and create professional CLI tools.

---

> Command-line interfaces make your Python scripts versatile and user-friendly. The argparse module provides everything you need to parse arguments, generate help text, and handle errors gracefully.

Python's `argparse` module is the standard way to handle command-line arguments. It parses arguments, validates input, and generates help messages automatically. This guide covers practical patterns for building robust CLI tools.

---

## Basic Usage

### Simple Script with Arguments

```python
import argparse

# Create parser
parser = argparse.ArgumentParser(description='Process some files.')

# Add arguments
parser.add_argument('filename', help='File to process')
parser.add_argument('-o', '--output', help='Output file')
parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')

# Parse arguments
args = parser.parse_args()

# Use arguments
print(f"Processing: {args.filename}")
if args.verbose:
    print("Verbose mode enabled")
if args.output:
    print(f"Writing to: {args.output}")
```

Usage:

```bash
python script.py input.txt
python script.py input.txt -o output.txt -v
python script.py --help
```

---

## Positional vs Optional Arguments

### Positional Arguments (Required)

```python
import argparse

parser = argparse.ArgumentParser()

# Positional arguments are required
parser.add_argument('source', help='Source file')
parser.add_argument('destination', help='Destination file')

args = parser.parse_args()
# Must provide both: python script.py input.txt output.txt
```

### Optional Arguments (Flags)

```python
parser = argparse.ArgumentParser()

# Short and long form
parser.add_argument('-v', '--verbose', action='store_true')

# Long form only
parser.add_argument('--config', help='Config file path')

# Short form only (less common)
parser.add_argument('-d', help='Debug level')

args = parser.parse_args()
```

---

## Argument Types and Validation

### Type Conversion

```python
parser = argparse.ArgumentParser()

# Automatic type conversion
parser.add_argument('--count', type=int, default=10)
parser.add_argument('--threshold', type=float, default=0.5)

# File type (opens file automatically)
parser.add_argument('--input', type=argparse.FileType('r'))
parser.add_argument('--output', type=argparse.FileType('w'))

args = parser.parse_args()
print(f"Count: {args.count}")  # Integer, not string
```

### Choices

```python
parser.add_argument(
    '--format',
    choices=['json', 'csv', 'xml'],
    default='json',
    help='Output format'
)

parser.add_argument(
    '--level',
    type=int,
    choices=range(1, 6),  # 1, 2, 3, 4, or 5
    help='Verbosity level'
)
```

### Custom Validation

```python
def positive_int(value):
    """Custom type that only accepts positive integers."""
    ivalue = int(value)
    if ivalue <= 0:
        raise argparse.ArgumentTypeError(
            f"{value} is not a positive integer"
        )
    return ivalue

parser.add_argument('--port', type=positive_int, default=8080)

def existing_file(path):
    """Validate that file exists."""
    import os
    if not os.path.exists(path):
        raise argparse.ArgumentTypeError(f"File not found: {path}")
    return path

parser.add_argument('--config', type=existing_file)
```

---

## Multiple Values

### nargs for Multiple Arguments

```python
parser = argparse.ArgumentParser()

# Exactly 2 values
parser.add_argument('--point', nargs=2, type=float, metavar=('X', 'Y'))

# One or more values
parser.add_argument('files', nargs='+', help='Files to process')

# Zero or more values
parser.add_argument('--tags', nargs='*', default=[])

# Optional single value
parser.add_argument('--config', nargs='?', const='default.cfg')

args = parser.parse_args()

# Usage:
# --point 10.5 20.3 -> args.point = [10.5, 20.3]
# file1.txt file2.txt -> args.files = ['file1.txt', 'file2.txt']
# --tags a b c -> args.tags = ['a', 'b', 'c']
# --config -> args.config = 'default.cfg' (const value)
# --config my.cfg -> args.config = 'my.cfg'
```

### Repeated Arguments with action='append'

```python
parser.add_argument(
    '-I', '--include',
    action='append',
    default=[],
    help='Include paths (can be repeated)'
)

# python script.py -I /path1 -I /path2 -I /path3
# args.include = ['/path1', '/path2', '/path3']
```

---

## Flags and Actions

### Boolean Flags

```python
parser = argparse.ArgumentParser()

# store_true: False by default, True if flag present
parser.add_argument('-v', '--verbose', action='store_true')

# store_false: True by default, False if flag present
parser.add_argument('--no-cache', action='store_false', dest='use_cache')

args = parser.parse_args()
# python script.py -v -> args.verbose = True
# python script.py --no-cache -> args.use_cache = False
```

### Counting Flags

```python
parser.add_argument(
    '-v', '--verbose',
    action='count',
    default=0,
    help='Increase verbosity (can be repeated)'
)

# python script.py -v -> args.verbose = 1
# python script.py -vvv -> args.verbose = 3
```

### Store Constant Values

```python
parser.add_argument(
    '--debug',
    action='store_const',
    const='DEBUG',
    default='INFO',
    dest='log_level'
)
```

---

## Subcommands

Build tools with subcommands like `git commit` or `docker run`:

```python
import argparse

parser = argparse.ArgumentParser(prog='mytool')
subparsers = parser.add_subparsers(dest='command', help='Available commands')

# 'init' subcommand
init_parser = subparsers.add_parser('init', help='Initialize project')
init_parser.add_argument('name', help='Project name')
init_parser.add_argument('--template', default='default')

# 'build' subcommand
build_parser = subparsers.add_parser('build', help='Build project')
build_parser.add_argument('--target', choices=['dev', 'prod'], default='dev')
build_parser.add_argument('-j', '--jobs', type=int, default=4)

# 'deploy' subcommand
deploy_parser = subparsers.add_parser('deploy', help='Deploy project')
deploy_parser.add_argument('environment', choices=['staging', 'production'])
deploy_parser.add_argument('--dry-run', action='store_true')

args = parser.parse_args()

# Handle subcommands
if args.command == 'init':
    print(f"Initializing {args.name} with template {args.template}")
elif args.command == 'build':
    print(f"Building for {args.target} with {args.jobs} jobs")
elif args.command == 'deploy':
    print(f"Deploying to {args.environment}")
else:
    parser.print_help()
```

Usage:

```bash
python mytool.py init myproject --template flask
python mytool.py build --target prod -j 8
python mytool.py deploy production --dry-run
python mytool.py --help
python mytool.py build --help
```

---

## Argument Groups

Organize related arguments:

```python
parser = argparse.ArgumentParser()

# Group for database options
db_group = parser.add_argument_group('database', 'Database connection options')
db_group.add_argument('--db-host', default='localhost')
db_group.add_argument('--db-port', type=int, default=5432)
db_group.add_argument('--db-name', required=True)

# Group for output options
output_group = parser.add_argument_group('output', 'Output options')
output_group.add_argument('-o', '--output', help='Output file')
output_group.add_argument('--format', choices=['json', 'csv'])

args = parser.parse_args()
```

### Mutually Exclusive Groups

```python
parser = argparse.ArgumentParser()

# Only one of these can be used
group = parser.add_mutually_exclusive_group()
group.add_argument('--json', action='store_true', help='Output as JSON')
group.add_argument('--csv', action='store_true', help='Output as CSV')
group.add_argument('--xml', action='store_true', help='Output as XML')

# Add required=True if one must be chosen
group = parser.add_mutually_exclusive_group(required=True)
```

---

## Practical Examples

### File Processing Tool

```python
#!/usr/bin/env python3
"""Process text files with various transformations."""

import argparse
import sys

def main():
    parser = argparse.ArgumentParser(
        description='Process text files',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  %(prog)s input.txt --upper
  %(prog)s input.txt -o output.txt --replace foo bar
  cat input.txt | %(prog)s - --lower
        '''
    )

    parser.add_argument(
        'input',
        type=argparse.FileType('r'),
        default=sys.stdin,
        nargs='?',
        help='Input file (default: stdin)'
    )

    parser.add_argument(
        '-o', '--output',
        type=argparse.FileType('w'),
        default=sys.stdout,
        help='Output file (default: stdout)'
    )

    transform = parser.add_mutually_exclusive_group()
    transform.add_argument('--upper', action='store_true')
    transform.add_argument('--lower', action='store_true')

    parser.add_argument(
        '--replace',
        nargs=2,
        metavar=('OLD', 'NEW'),
        help='Replace OLD with NEW'
    )

    args = parser.parse_args()

    # Process
    content = args.input.read()

    if args.upper:
        content = content.upper()
    elif args.lower:
        content = content.lower()

    if args.replace:
        content = content.replace(args.replace[0], args.replace[1])

    args.output.write(content)

if __name__ == '__main__':
    main()
```

### Configuration Tool

```python
#!/usr/bin/env python3
"""Manage application configuration."""

import argparse
import json
from pathlib import Path

def cmd_get(args):
    config = load_config(args.config_file)
    if args.key in config:
        print(config[args.key])
    else:
        print(f"Key not found: {args.key}", file=sys.stderr)
        sys.exit(1)

def cmd_set(args):
    config = load_config(args.config_file)
    config[args.key] = args.value
    save_config(args.config_file, config)
    print(f"Set {args.key}={args.value}")

def cmd_list(args):
    config = load_config(args.config_file)
    for key, value in config.items():
        print(f"{key}={value}")

def main():
    parser = argparse.ArgumentParser(description='Configuration manager')
    parser.add_argument(
        '--config-file',
        type=Path,
        default=Path('config.json'),
        help='Config file path'
    )

    subparsers = parser.add_subparsers(dest='command', required=True)

    # get command
    get_parser = subparsers.add_parser('get', help='Get a config value')
    get_parser.add_argument('key', help='Config key')
    get_parser.set_defaults(func=cmd_get)

    # set command
    set_parser = subparsers.add_parser('set', help='Set a config value')
    set_parser.add_argument('key', help='Config key')
    set_parser.add_argument('value', help='Config value')
    set_parser.set_defaults(func=cmd_set)

    # list command
    list_parser = subparsers.add_parser('list', help='List all config')
    list_parser.set_defaults(func=cmd_list)

    args = parser.parse_args()
    args.func(args)

if __name__ == '__main__':
    main()
```

---

## Alternative: sys.argv

For very simple scripts, you can use sys.argv directly:

```python
import sys

if len(sys.argv) != 3:
    print(f"Usage: {sys.argv[0]} <input> <output>")
    sys.exit(1)

input_file = sys.argv[1]
output_file = sys.argv[2]
```

But argparse is better for anything beyond trivial cases.

---

## Summary

argparse provides:

- **Automatic help generation** with --help
- **Type validation** and conversion
- **Flexible argument styles** (positional, optional, flags)
- **Subcommands** for complex tools
- **Error handling** with helpful messages

Key patterns:

- `add_argument('name')` - positional argument
- `add_argument('-n', '--name')` - optional argument
- `action='store_true'` - boolean flag
- `type=int` - automatic conversion
- `choices=[...]` - restrict valid values
- `nargs='+'` - multiple values
- `add_subparsers()` - subcommands

For production CLI tools, consider also looking at `click` or `typer` which provide even more features with less boilerplate.
