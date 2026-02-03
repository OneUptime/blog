# How to Build CLI Applications with argparse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, argparse, CLI, Command Line, Tools

Description: Learn how to build robust command-line applications in Python using argparse. This guide covers arguments, options, subcommands, and creating user-friendly CLIs.

---

Command-line interfaces remain one of the most powerful ways to interact with software. Whether you are building developer tools, system administration scripts, or data processing pipelines, a well-designed CLI can make your application accessible and efficient. Python's `argparse` module is the standard library solution for parsing command-line arguments, and it provides everything you need to create professional-grade CLI applications.

In this guide, we will walk through building CLI applications from the ground up. We will cover everything from basic argument parsing to advanced features like subcommands and custom help formatting.

## Why argparse?

Before diving in, let us consider why `argparse` is the go-to choice for Python CLI development:

- **Standard library**: No external dependencies required
- **Automatic help generation**: Creates `-h` and `--help` options automatically
- **Type conversion**: Handles converting string inputs to the types you need
- **Error handling**: Provides sensible error messages for invalid inputs
- **Flexible**: Supports positional arguments, optional arguments, subcommands, and more

While alternatives like `click` and `typer` exist, understanding `argparse` gives you a solid foundation that works everywhere Python runs.

## Getting Started: Your First CLI

Let us start with the simplest possible example. Create a file called `greet.py`:

```python
#!/usr/bin/env python3
"""
A simple greeting CLI application.
This demonstrates the most basic use of argparse.
"""

import argparse


def main():
    # Create the argument parser
    # The description appears in the help output
    parser = argparse.ArgumentParser(
        description="A friendly greeting program"
    )

    # Parse the arguments (even though we have none yet)
    args = parser.parse_args()

    print("Hello, World!")


if __name__ == "__main__":
    main()
```

Run it:

```bash
$ python greet.py
Hello, World!

$ python greet.py --help
usage: greet.py [-h]

A friendly greeting program

options:
  -h, --help  show this help message and exit
```

Even with no arguments defined, `argparse` automatically provides help functionality. This is a great starting point.

## Positional Arguments

Positional arguments are required arguments that must appear in a specific order. They are the backbone of many CLI applications.

```python
#!/usr/bin/env python3
"""
Demonstrates positional arguments in argparse.
Positional arguments are required and order-dependent.
"""

import argparse


def main():
    parser = argparse.ArgumentParser(
        description="Greet someone by name"
    )

    # Add a positional argument
    # The first parameter is the name used to access the value
    parser.add_argument(
        "name",
        help="The name of the person to greet"
    )

    args = parser.parse_args()

    # Access the argument value using dot notation
    print(f"Hello, {args.name}!")


if __name__ == "__main__":
    main()
```

Usage:

```bash
$ python greet.py Alice
Hello, Alice!

$ python greet.py
usage: greet.py [-h] name
greet.py: error: the following arguments are required: name
```

Notice how `argparse` automatically generates an error message when the required argument is missing.

### Multiple Positional Arguments

You can have multiple positional arguments. They are parsed in the order they are defined:

```python
#!/usr/bin/env python3
"""
File copying utility demonstrating multiple positional arguments.
"""

import argparse
import shutil
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description="Copy a file from source to destination"
    )

    # First positional argument
    parser.add_argument(
        "source",
        help="Path to the source file"
    )

    # Second positional argument
    parser.add_argument(
        "destination",
        help="Path to the destination"
    )

    args = parser.parse_args()

    # Validate source exists
    source_path = Path(args.source)
    if not source_path.exists():
        print(f"Error: Source file '{args.source}' does not exist")
        return 1

    # Perform the copy
    try:
        shutil.copy2(args.source, args.destination)
        print(f"Copied '{args.source}' to '{args.destination}'")
    except Exception as e:
        print(f"Error copying file: {e}")
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
```

Usage:

```bash
$ python copy.py config.json backup/config.json
Copied 'config.json' to 'backup/config.json'
```

## Optional Arguments (Flags)

Optional arguments, also called flags, start with dashes and can appear in any order. They are perfect for configuration options.

```python
#!/usr/bin/env python3
"""
Demonstrates optional arguments (flags) in argparse.
Optional arguments use single dash (-) for short form
and double dash (--) for long form.
"""

import argparse


def main():
    parser = argparse.ArgumentParser(
        description="Greet someone with customizable options"
    )

    # Positional argument (required)
    parser.add_argument(
        "name",
        help="The name of the person to greet"
    )

    # Optional argument with both short and long form
    # Short form: -g, Long form: --greeting
    parser.add_argument(
        "-g", "--greeting",
        default="Hello",
        help="The greeting to use (default: Hello)"
    )

    # Boolean flag using store_true
    # When present, the value is True; otherwise False
    parser.add_argument(
        "-u", "--uppercase",
        action="store_true",
        help="Print the greeting in uppercase"
    )

    # Another boolean flag
    parser.add_argument(
        "-e", "--exclaim",
        action="store_true",
        help="Add an exclamation mark"
    )

    args = parser.parse_args()

    # Build the message
    message = f"{args.greeting}, {args.name}"

    if args.exclaim:
        message += "!"

    if args.uppercase:
        message = message.upper()

    print(message)


if __name__ == "__main__":
    main()
```

Usage:

```bash
$ python greet.py Alice
Hello, Alice

$ python greet.py Alice -g "Good morning"
Good morning, Alice

$ python greet.py Alice --greeting "Hey there" --exclaim
Hey there, Alice!

$ python greet.py Alice -u -e
HELLO, ALICE!

# Flags can be combined
$ python greet.py Alice -ue --greeting "Welcome"
WELCOME, ALICE!
```

## Type Conversion

By default, all arguments are strings. Use the `type` parameter to convert inputs to other types:

```python
#!/usr/bin/env python3
"""
Calculator demonstrating type conversion in argparse.
The type parameter automatically converts string inputs.
"""

import argparse
import math


def positive_int(value):
    """
    Custom type function for positive integers.
    Raises ArgumentTypeError if validation fails.
    """
    try:
        ivalue = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError(
            f"'{value}' is not a valid integer"
        )

    if ivalue <= 0:
        raise argparse.ArgumentTypeError(
            f"'{value}' is not a positive integer"
        )

    return ivalue


def main():
    parser = argparse.ArgumentParser(
        description="Perform mathematical calculations"
    )

    # Integer type conversion
    parser.add_argument(
        "number",
        type=int,
        help="The number to work with"
    )

    # Float type conversion
    parser.add_argument(
        "-m", "--multiply",
        type=float,
        default=1.0,
        help="Multiply the number by this value"
    )

    # Custom type with validation
    parser.add_argument(
        "-r", "--repeat",
        type=positive_int,
        default=1,
        help="Repeat the calculation N times (must be positive)"
    )

    # Using a built-in function as type
    parser.add_argument(
        "-p", "--power",
        type=float,
        default=1.0,
        help="Raise the number to this power"
    )

    args = parser.parse_args()

    # Perform calculations
    result = (args.number ** args.power) * args.multiply

    for i in range(args.repeat):
        print(f"Result {i + 1}: {result}")


if __name__ == "__main__":
    main()
```

Usage:

```bash
$ python calc.py 5
Result 1: 5.0

$ python calc.py 5 -m 2.5
Result 1: 12.5

$ python calc.py 5 --power 2 --multiply 3
Result 1: 75.0

$ python calc.py 5 -r 3
Result 1: 5.0
Result 2: 5.0
Result 3: 5.0

# Invalid type handling
$ python calc.py abc
usage: calc.py [-h] [-m MULTIPLY] [-r REPEAT] [-p POWER] number
calc.py: error: argument number: invalid int value: 'abc'

# Custom type validation
$ python calc.py 5 -r -1
usage: calc.py [-h] [-m MULTIPLY] [-r REPEAT] [-p POWER] number
calc.py: error: argument -r/--repeat: '-1' is not a positive integer
```

### Common Type Conversions

Here are some useful type conversions:

```python
#!/usr/bin/env python3
"""
Examples of various type conversions available in argparse.
"""

import argparse
from pathlib import Path
from datetime import datetime


def valid_date(date_string):
    """Parse a date in YYYY-MM-DD format."""
    try:
        return datetime.strptime(date_string, "%Y-%m-%d").date()
    except ValueError:
        raise argparse.ArgumentTypeError(
            f"Invalid date: '{date_string}'. Use YYYY-MM-DD format."
        )


def valid_file(path_string):
    """Validate that a file exists."""
    path = Path(path_string)
    if not path.is_file():
        raise argparse.ArgumentTypeError(
            f"File not found: '{path_string}'"
        )
    return path


def valid_directory(path_string):
    """Validate that a directory exists."""
    path = Path(path_string)
    if not path.is_dir():
        raise argparse.ArgumentTypeError(
            f"Directory not found: '{path_string}'"
        )
    return path


def port_number(value):
    """Validate a port number (1-65535)."""
    try:
        port = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError(
            f"'{value}' is not a valid port number"
        )

    if not 1 <= port <= 65535:
        raise argparse.ArgumentTypeError(
            f"Port must be between 1 and 65535, got {port}"
        )

    return port


def main():
    parser = argparse.ArgumentParser(
        description="Demonstration of type conversions"
    )

    parser.add_argument(
        "--count",
        type=int,
        help="An integer value"
    )

    parser.add_argument(
        "--ratio",
        type=float,
        help="A floating-point value"
    )

    parser.add_argument(
        "--date",
        type=valid_date,
        help="A date in YYYY-MM-DD format"
    )

    parser.add_argument(
        "--input-file",
        type=valid_file,
        help="Path to an existing file"
    )

    parser.add_argument(
        "--output-dir",
        type=valid_directory,
        help="Path to an existing directory"
    )

    parser.add_argument(
        "--port",
        type=port_number,
        default=8080,
        help="Port number (1-65535, default: 8080)"
    )

    args = parser.parse_args()

    # Print the parsed values and their types
    for name, value in vars(args).items():
        if value is not None:
            print(f"{name}: {value} (type: {type(value).__name__})")


if __name__ == "__main__":
    main()
```

## Choices: Limiting Valid Values

The `choices` parameter restricts arguments to a predefined set of values:

```python
#!/usr/bin/env python3
"""
Log viewer demonstrating the choices parameter.
Choices restrict input to a specific set of valid values.
"""

import argparse
from datetime import datetime


# Sample log data for demonstration
SAMPLE_LOGS = [
    {"level": "DEBUG", "message": "Starting application", "timestamp": "10:00:01"},
    {"level": "INFO", "message": "Connected to database", "timestamp": "10:00:02"},
    {"level": "WARNING", "message": "High memory usage detected", "timestamp": "10:00:05"},
    {"level": "ERROR", "message": "Failed to process request", "timestamp": "10:00:08"},
    {"level": "INFO", "message": "Request processed successfully", "timestamp": "10:00:10"},
    {"level": "DEBUG", "message": "Cache hit for user_123", "timestamp": "10:00:11"},
    {"level": "CRITICAL", "message": "Database connection lost", "timestamp": "10:00:15"},
]

# Define log levels in order of severity
LOG_LEVELS = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]


def main():
    parser = argparse.ArgumentParser(
        description="View and filter application logs"
    )

    # Choices with strings
    parser.add_argument(
        "-l", "--level",
        choices=LOG_LEVELS,
        default="INFO",
        help="Minimum log level to display (default: INFO)"
    )

    # Choices with case-insensitive matching
    parser.add_argument(
        "-f", "--format",
        choices=["plain", "json", "csv"],
        default="plain",
        help="Output format (default: plain)"
    )

    # Numeric choices
    parser.add_argument(
        "-n", "--limit",
        type=int,
        choices=[5, 10, 25, 50, 100],
        default=10,
        help="Number of log entries to show (default: 10)"
    )

    args = parser.parse_args()

    # Filter logs by level
    min_level_index = LOG_LEVELS.index(args.level)
    filtered_logs = [
        log for log in SAMPLE_LOGS
        if LOG_LEVELS.index(log["level"]) >= min_level_index
    ]

    # Limit the number of results
    filtered_logs = filtered_logs[:args.limit]

    # Output in the requested format
    if args.format == "plain":
        for log in filtered_logs:
            print(f"[{log['timestamp']}] {log['level']}: {log['message']}")

    elif args.format == "json":
        import json
        print(json.dumps(filtered_logs, indent=2))

    elif args.format == "csv":
        print("timestamp,level,message")
        for log in filtered_logs:
            print(f"{log['timestamp']},{log['level']},{log['message']}")


if __name__ == "__main__":
    main()
```

Usage:

```bash
$ python logs.py
[10:00:02] INFO: Connected to database
[10:00:05] WARNING: High memory usage detected
[10:00:08] ERROR: Failed to process request
[10:00:10] INFO: Request processed successfully
[10:00:15] CRITICAL: Database connection lost

$ python logs.py -l WARNING
[10:00:05] WARNING: High memory usage detected
[10:00:08] ERROR: Failed to process request
[10:00:15] CRITICAL: Database connection lost

$ python logs.py -l DEBUG -f json
[
  {
    "level": "DEBUG",
    "message": "Starting application",
    "timestamp": "10:00:01"
  },
  ...
]

# Invalid choice shows available options
$ python logs.py -l TRACE
usage: logs.py [-h] [-l {DEBUG,INFO,WARNING,ERROR,CRITICAL}] [-f {plain,json,csv}] [-n {5,10,25,50,100}]
logs.py: error: argument -l/--level: invalid choice: 'TRACE' (choose from 'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')
```

## Handling Multiple Values

Sometimes you need to accept multiple values for a single argument. The `nargs` parameter controls this:

```python
#!/usr/bin/env python3
"""
File processor demonstrating nargs for multiple values.
nargs controls how many values an argument accepts.
"""

import argparse
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description="Process multiple files with various options"
    )

    # nargs="+" means one or more values (required)
    parser.add_argument(
        "files",
        nargs="+",
        help="One or more files to process"
    )

    # nargs="*" means zero or more values (optional)
    parser.add_argument(
        "-e", "--exclude",
        nargs="*",
        default=[],
        help="Patterns to exclude"
    )

    # nargs="?" means zero or one value
    # const is used when flag is present but no value given
    parser.add_argument(
        "-o", "--output",
        nargs="?",
        const="output.txt",
        default=None,
        help="Output file (default: stdout, or 'output.txt' if flag used without value)"
    )

    # nargs=2 means exactly two values
    parser.add_argument(
        "-r", "--range",
        nargs=2,
        type=int,
        metavar=("START", "END"),
        help="Line range to process (start and end)"
    )

    # action="append" collects multiple uses of the same flag
    parser.add_argument(
        "-t", "--tag",
        action="append",
        default=[],
        help="Add a tag (can be used multiple times)"
    )

    args = parser.parse_args()

    # Display what we received
    print("Files to process:")
    for f in args.files:
        path = Path(f)
        status = "exists" if path.exists() else "not found"
        print(f"  - {f} ({status})")

    if args.exclude:
        print(f"\nExclude patterns: {args.exclude}")

    if args.output:
        print(f"\nOutput file: {args.output}")
    else:
        print("\nOutput: stdout")

    if args.range:
        print(f"\nLine range: {args.range[0]} to {args.range[1]}")

    if args.tag:
        print(f"\nTags: {args.tag}")


if __name__ == "__main__":
    main()
```

Usage:

```bash
$ python process.py file1.txt file2.txt file3.txt
Files to process:
  - file1.txt (not found)
  - file2.txt (not found)
  - file3.txt (not found)

Output: stdout

$ python process.py data.csv -e "*.tmp" "*.bak" -o results.txt
Files to process:
  - data.csv (not found)

Exclude patterns: ['*.tmp', '*.bak']

Output file: results.txt

$ python process.py log.txt -r 10 50
Files to process:
  - log.txt (not found)

Output: stdout

Line range: 10 to 50

$ python process.py report.txt -t urgent -t review -t 2024
Files to process:
  - report.txt (not found)

Output: stdout

Tags: ['urgent', 'review', '2024']

# Using -o without a value uses the const
$ python process.py data.txt -o
Files to process:
  - data.txt (not found)

Output file: output.txt
```

## Subcommands with Subparsers

For complex applications, subcommands help organize functionality. Think of how `git` has `git commit`, `git push`, and `git pull`. Here is how to implement this pattern:

```python
#!/usr/bin/env python3
"""
Task manager CLI demonstrating subparsers for subcommands.
Subparsers allow you to create command hierarchies like:
    task add "New task"
    task list --all
    task complete 1
"""

import argparse
import json
from pathlib import Path
from datetime import datetime


# Simple file-based storage for tasks
TASKS_FILE = Path("tasks.json")


def load_tasks():
    """Load tasks from the JSON file."""
    if TASKS_FILE.exists():
        with open(TASKS_FILE) as f:
            return json.load(f)
    return []


def save_tasks(tasks):
    """Save tasks to the JSON file."""
    with open(TASKS_FILE, "w") as f:
        json.dump(tasks, f, indent=2)


def cmd_add(args):
    """Handle the 'add' subcommand."""
    tasks = load_tasks()

    # Create new task
    task = {
        "id": len(tasks) + 1,
        "title": args.title,
        "priority": args.priority,
        "completed": False,
        "created": datetime.now().isoformat()
    }

    if args.due:
        task["due"] = args.due

    tasks.append(task)
    save_tasks(tasks)

    print(f"Added task #{task['id']}: {task['title']}")
    if args.priority != "medium":
        print(f"  Priority: {args.priority}")


def cmd_list(args):
    """Handle the 'list' subcommand."""
    tasks = load_tasks()

    if not tasks:
        print("No tasks found. Add one with: task add 'Your task'")
        return

    # Filter tasks
    if not args.all:
        tasks = [t for t in tasks if not t["completed"]]

    if args.priority:
        tasks = [t for t in tasks if t["priority"] == args.priority]

    # Display tasks
    if not tasks:
        print("No matching tasks found.")
        return

    for task in tasks:
        status = "x" if task["completed"] else " "
        priority_marker = {"high": "!", "medium": "-", "low": "."}
        marker = priority_marker.get(task["priority"], "-")

        print(f"[{status}] {marker} #{task['id']}: {task['title']}")

        if args.verbose and task.get("due"):
            print(f"      Due: {task['due']}")


def cmd_complete(args):
    """Handle the 'complete' subcommand."""
    tasks = load_tasks()

    # Find the task
    for task in tasks:
        if task["id"] == args.task_id:
            if task["completed"]:
                print(f"Task #{args.task_id} is already completed.")
            else:
                task["completed"] = True
                task["completed_at"] = datetime.now().isoformat()
                save_tasks(tasks)
                print(f"Completed task #{args.task_id}: {task['title']}")
            return

    print(f"Task #{args.task_id} not found.")


def cmd_delete(args):
    """Handle the 'delete' subcommand."""
    tasks = load_tasks()
    original_count = len(tasks)

    if args.completed:
        # Delete all completed tasks
        tasks = [t for t in tasks if not t["completed"]]
        deleted = original_count - len(tasks)
        if deleted > 0:
            save_tasks(tasks)
            print(f"Deleted {deleted} completed task(s).")
        else:
            print("No completed tasks to delete.")
    else:
        # Delete specific task by ID
        tasks = [t for t in tasks if t["id"] != args.task_id]
        if len(tasks) < original_count:
            save_tasks(tasks)
            print(f"Deleted task #{args.task_id}.")
        else:
            print(f"Task #{args.task_id} not found.")


def main():
    # Create the top-level parser
    parser = argparse.ArgumentParser(
        description="A simple task management CLI",
        # This makes the help more readable
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    task add "Write documentation"
    task add "Fix bug" -p high --due 2024-12-31
    task list
    task list --all --verbose
    task complete 1
    task delete --completed
        """
    )

    # Create subparsers container
    # dest="command" stores which subcommand was used
    subparsers = parser.add_subparsers(
        title="commands",
        dest="command",
        help="Available commands"
    )

    # --- ADD subcommand ---
    add_parser = subparsers.add_parser(
        "add",
        help="Add a new task",
        description="Create a new task with optional priority and due date"
    )
    add_parser.add_argument(
        "title",
        help="The task description"
    )
    add_parser.add_argument(
        "-p", "--priority",
        choices=["low", "medium", "high"],
        default="medium",
        help="Task priority (default: medium)"
    )
    add_parser.add_argument(
        "-d", "--due",
        help="Due date (any format you prefer)"
    )
    # Set the function to call for this subcommand
    add_parser.set_defaults(func=cmd_add)

    # --- LIST subcommand ---
    list_parser = subparsers.add_parser(
        "list",
        help="List tasks",
        description="Display tasks with optional filtering"
    )
    list_parser.add_argument(
        "-a", "--all",
        action="store_true",
        help="Show all tasks including completed"
    )
    list_parser.add_argument(
        "-p", "--priority",
        choices=["low", "medium", "high"],
        help="Filter by priority"
    )
    list_parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Show additional details"
    )
    list_parser.set_defaults(func=cmd_list)

    # --- COMPLETE subcommand ---
    complete_parser = subparsers.add_parser(
        "complete",
        help="Mark a task as completed",
        description="Mark a specific task as done"
    )
    complete_parser.add_argument(
        "task_id",
        type=int,
        help="ID of the task to complete"
    )
    complete_parser.set_defaults(func=cmd_complete)

    # --- DELETE subcommand ---
    delete_parser = subparsers.add_parser(
        "delete",
        help="Delete tasks",
        description="Delete a specific task or all completed tasks"
    )
    # Create a mutually exclusive group - only one can be used
    delete_group = delete_parser.add_mutually_exclusive_group(required=True)
    delete_group.add_argument(
        "task_id",
        type=int,
        nargs="?",
        help="ID of the task to delete"
    )
    delete_group.add_argument(
        "-c", "--completed",
        action="store_true",
        help="Delete all completed tasks"
    )
    delete_parser.set_defaults(func=cmd_delete)

    # Parse arguments
    args = parser.parse_args()

    # If no command given, show help
    if args.command is None:
        parser.print_help()
        return

    # Call the appropriate function
    args.func(args)


if __name__ == "__main__":
    main()
```

Usage:

```bash
$ python task.py
usage: task.py [-h] {add,list,complete,delete} ...

A simple task management CLI

options:
  -h, --help            show this help message and exit

commands:
  {add,list,complete,delete}
                        Available commands
    add                 Add a new task
    list                List tasks
    complete            Mark a task as completed
    delete              Delete tasks

$ python task.py add "Write documentation"
Added task #1: Write documentation

$ python task.py add "Fix critical bug" -p high --due 2024-12-25
Added task #2: Fix critical bug
  Priority: high

$ python task.py list
[ ] - #1: Write documentation
[ ] ! #2: Fix critical bug

$ python task.py complete 1
Completed task #1: Write documentation

$ python task.py list --all
[x] - #1: Write documentation
[ ] ! #2: Fix critical bug

$ python task.py add --help
usage: task.py add [-h] [-p {low,medium,high}] [-d DUE] title

Create a new task with optional priority and due date

positional arguments:
  title                 The task description

options:
  -h, --help            show this help message and exit
  -p {low,medium,high}, --priority {low,medium,high}
                        Task priority (default: medium)
  -d DUE, --due DUE     Due date (any format you prefer)
```

## Customizing Help Output

The default help formatting works well, but you can customize it for better presentation:

```python
#!/usr/bin/env python3
"""
Demonstrates various help formatting options in argparse.
"""

import argparse
import textwrap


class CustomHelpFormatter(argparse.HelpFormatter):
    """
    Custom formatter that allows longer help text
    and better formatting of argument descriptions.
    """

    def __init__(self, prog):
        super().__init__(
            prog,
            max_help_position=40,  # Where argument help text starts
            width=100  # Total width of help output
        )


def main():
    # Using RawDescriptionHelpFormatter preserves formatting in
    # description and epilog (newlines and spacing)
    parser = argparse.ArgumentParser(
        prog="myapp",
        description=textwrap.dedent("""
            My Application - A comprehensive CLI tool

            This application provides various utilities for:
              * Processing data files
              * Generating reports
              * Managing configurations

            Use the subcommands below to access different features.
        """),
        epilog=textwrap.dedent("""
            Examples:
                myapp process input.csv -o output.json
                myapp report --format pdf --include-charts
                myapp config set api_key YOUR_KEY

            For more information, visit: https://example.com/docs
        """),
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    # Add version argument
    parser.add_argument(
        "-V", "--version",
        action="version",
        version="%(prog)s 1.0.0"
    )

    # metavar customizes how the argument value appears in help
    parser.add_argument(
        "-c", "--config",
        metavar="FILE",
        help="Path to configuration file"
    )

    # dest changes the attribute name used to access the value
    parser.add_argument(
        "-n", "--dry-run",
        dest="dry_run",
        action="store_true",
        help="Show what would be done without making changes"
    )

    # Hidden arguments (help=argparse.SUPPRESS)
    parser.add_argument(
        "--debug-internal",
        action="store_true",
        help=argparse.SUPPRESS  # Won't appear in help
    )

    # Argument groups organize related arguments
    input_group = parser.add_argument_group(
        "Input Options",
        "Options for controlling input sources"
    )
    input_group.add_argument(
        "-i", "--input",
        metavar="PATH",
        help="Input file or directory"
    )
    input_group.add_argument(
        "-f", "--format",
        choices=["csv", "json", "xml"],
        help="Input format"
    )

    output_group = parser.add_argument_group(
        "Output Options",
        "Options for controlling output"
    )
    output_group.add_argument(
        "-o", "--output",
        metavar="PATH",
        help="Output file path"
    )
    output_group.add_argument(
        "--compress",
        action="store_true",
        help="Compress the output"
    )

    args = parser.parse_args()

    print("Parsed arguments:")
    for key, value in vars(args).items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    main()
```

Usage:

```bash
$ python format.py --help
usage: myapp [-h] [-V] [-c FILE] [-n] [-i PATH] [-f {csv,json,xml}] [-o PATH] [--compress]

My Application - A comprehensive CLI tool

This application provides various utilities for:
  * Processing data files
  * Generating reports
  * Managing configurations

Use the subcommands below to access different features.

options:
  -h, --help            show this help message and exit
  -V, --version         show program's version number and exit
  -c FILE, --config FILE
                        Path to configuration file
  -n, --dry-run         Show what would be done without making changes

Input Options:
  Options for controlling input sources

  -i PATH, --input PATH
                        Input file or directory
  -f {csv,json,xml}, --format {csv,json,xml}
                        Input format

Output Options:
  Options for controlling output

  -o PATH, --output PATH
                        Output file path
  --compress            Compress the output

Examples:
    myapp process input.csv -o output.json
    myapp report --format pdf --include-charts
    myapp config set api_key YOUR_KEY

For more information, visit: https://example.com/docs

$ python format.py --version
myapp 1.0.0
```

## Mutually Exclusive Arguments

Sometimes arguments conflict with each other. Use mutually exclusive groups to enforce this:

```python
#!/usr/bin/env python3
"""
Demonstrates mutually exclusive argument groups.
Only one argument from the group can be used at a time.
"""

import argparse


def main():
    parser = argparse.ArgumentParser(
        description="File comparison tool"
    )

    parser.add_argument(
        "file1",
        help="First file to compare"
    )

    parser.add_argument(
        "file2",
        help="Second file to compare"
    )

    # Create mutually exclusive group for output mode
    output_mode = parser.add_mutually_exclusive_group()

    output_mode.add_argument(
        "-q", "--quiet",
        action="store_true",
        help="Only report whether files differ (no output)"
    )

    output_mode.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Show detailed differences"
    )

    output_mode.add_argument(
        "-s", "--side-by-side",
        action="store_true",
        help="Show files side by side"
    )

    # Another mutually exclusive group for comparison mode
    compare_mode = parser.add_mutually_exclusive_group()

    compare_mode.add_argument(
        "-b", "--binary",
        action="store_true",
        help="Compare files as binary"
    )

    compare_mode.add_argument(
        "-t", "--text",
        action="store_true",
        help="Compare files as text (default)"
    )

    args = parser.parse_args()

    # Determine output mode
    if args.quiet:
        mode = "quiet"
    elif args.verbose:
        mode = "verbose"
    elif args.side_by_side:
        mode = "side-by-side"
    else:
        mode = "normal"

    print(f"Comparing: {args.file1} vs {args.file2}")
    print(f"Output mode: {mode}")
    print(f"Binary comparison: {args.binary}")


if __name__ == "__main__":
    main()
```

Usage:

```bash
$ python compare.py file1.txt file2.txt
Comparing: file1.txt vs file2.txt
Output mode: normal
Binary comparison: False

$ python compare.py file1.txt file2.txt -v
Comparing: file1.txt vs file2.txt
Output mode: verbose
Binary comparison: False

# Cannot use conflicting options
$ python compare.py file1.txt file2.txt -q -v
usage: compare.py [-h] [-q | -v | -s] [-b | -t] file1 file2
compare.py: error: argument -v/--verbose: not allowed with argument -q/--quiet
```

## Environment Variables and Defaults

You can combine `argparse` with environment variables for flexible configuration:

```python
#!/usr/bin/env python3
"""
Demonstrates using environment variables as default values.
This pattern is common for sensitive data like API keys.
"""

import argparse
import os


def main():
    parser = argparse.ArgumentParser(
        description="API client with environment variable support"
    )

    # Use environment variable as default
    # Command-line argument takes precedence
    parser.add_argument(
        "--api-key",
        default=os.environ.get("API_KEY"),
        help="API key (or set API_KEY environment variable)"
    )

    parser.add_argument(
        "--api-url",
        default=os.environ.get("API_URL", "https://api.example.com"),
        help="API URL (default: https://api.example.com or API_URL env var)"
    )

    parser.add_argument(
        "--timeout",
        type=int,
        default=int(os.environ.get("API_TIMEOUT", "30")),
        help="Request timeout in seconds (default: 30 or API_TIMEOUT env var)"
    )

    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        default=os.environ.get("VERBOSE", "").lower() in ("1", "true", "yes"),
        help="Enable verbose output (or set VERBOSE=1)"
    )

    args = parser.parse_args()

    # Validate required values
    if not args.api_key:
        parser.error(
            "API key is required. Provide --api-key or set API_KEY environment variable."
        )

    print(f"API URL: {args.api_url}")
    print(f"API Key: {'*' * len(args.api_key)}")  # Hide actual key
    print(f"Timeout: {args.timeout}s")
    print(f"Verbose: {args.verbose}")


if __name__ == "__main__":
    main()
```

Usage:

```bash
# Using command-line arguments
$ python api_client.py --api-key secret123
API URL: https://api.example.com
API Key: *********
Timeout: 30s
Verbose: False

# Using environment variables
$ API_KEY=mykey API_URL=https://custom.api.com python api_client.py
API URL: https://custom.api.com
API Key: *****
Timeout: 30s
Verbose: False

# Command-line overrides environment variable
$ API_KEY=envkey python api_client.py --api-key clikey
API URL: https://api.example.com
API Key: ******
Timeout: 30s
Verbose: False
```

## Complete Example: A File Processor CLI

Let us put everything together in a more complete example:

```python
#!/usr/bin/env python3
"""
A complete file processing CLI application.
Demonstrates combining multiple argparse features into
a real-world application.
"""

import argparse
import sys
import json
import csv
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any


__version__ = "1.0.0"


def process_json(input_path: Path, options: argparse.Namespace) -> List[Dict[str, Any]]:
    """Process a JSON file."""
    with open(input_path) as f:
        data = json.load(f)

    if isinstance(data, list):
        return data
    return [data]


def process_csv(input_path: Path, options: argparse.Namespace) -> List[Dict[str, Any]]:
    """Process a CSV file."""
    with open(input_path, newline="") as f:
        reader = csv.DictReader(f, delimiter=options.delimiter)
        return list(reader)


def write_output(
    data: List[Dict[str, Any]],
    output_path: Path,
    format: str,
    options: argparse.Namespace
) -> None:
    """Write processed data to output file."""
    if format == "json":
        with open(output_path, "w") as f:
            indent = 2 if options.pretty else None
            json.dump(data, f, indent=indent)

    elif format == "csv":
        if not data:
            return

        with open(output_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)

    elif format == "text":
        with open(output_path, "w") as f:
            for i, record in enumerate(data, 1):
                f.write(f"Record {i}:\n")
                for key, value in record.items():
                    f.write(f"  {key}: {value}\n")
                f.write("\n")


def cmd_convert(args: argparse.Namespace) -> int:
    """Handle the convert subcommand."""
    input_path = Path(args.input)

    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        return 1

    # Determine input format
    input_format = args.input_format
    if not input_format:
        suffix = input_path.suffix.lower()
        format_map = {".json": "json", ".csv": "csv"}
        input_format = format_map.get(suffix)

        if not input_format:
            print(f"Error: Cannot determine input format for {suffix}", file=sys.stderr)
            return 1

    # Process input
    if args.verbose:
        print(f"Reading {input_format.upper()} file: {input_path}")

    try:
        if input_format == "json":
            data = process_json(input_path, args)
        elif input_format == "csv":
            data = process_csv(input_path, args)
        else:
            print(f"Error: Unsupported input format: {input_format}", file=sys.stderr)
            return 1
    except Exception as e:
        print(f"Error reading input: {e}", file=sys.stderr)
        return 1

    if args.verbose:
        print(f"Loaded {len(data)} records")

    # Apply limit
    if args.limit and args.limit < len(data):
        data = data[:args.limit]
        if args.verbose:
            print(f"Limited to {args.limit} records")

    # Write output
    output_path = Path(args.output)
    output_format = args.output_format or output_path.suffix.lstrip(".")

    if args.verbose:
        print(f"Writing {output_format.upper()} file: {output_path}")

    try:
        write_output(data, output_path, output_format, args)
    except Exception as e:
        print(f"Error writing output: {e}", file=sys.stderr)
        return 1

    print(f"Successfully converted {len(data)} records to {output_path}")
    return 0


def cmd_info(args: argparse.Namespace) -> int:
    """Handle the info subcommand."""
    input_path = Path(args.file)

    if not input_path.exists():
        print(f"Error: File not found: {input_path}", file=sys.stderr)
        return 1

    # Get file stats
    stats = input_path.stat()

    print(f"File: {input_path}")
    print(f"Size: {stats.st_size:,} bytes")
    print(f"Modified: {datetime.fromtimestamp(stats.st_mtime)}")

    # Try to count records
    suffix = input_path.suffix.lower()

    try:
        if suffix == ".json":
            with open(input_path) as f:
                data = json.load(f)
            if isinstance(data, list):
                print(f"Records: {len(data)}")
            else:
                print("Records: 1 (single object)")

        elif suffix == ".csv":
            with open(input_path) as f:
                reader = csv.reader(f)
                lines = sum(1 for _ in reader) - 1  # Subtract header
            print(f"Records: {max(0, lines)}")

    except Exception as e:
        print(f"Could not analyze contents: {e}")

    return 0


def cmd_validate(args: argparse.Namespace) -> int:
    """Handle the validate subcommand."""
    input_path = Path(args.file)

    if not input_path.exists():
        print(f"Error: File not found: {input_path}", file=sys.stderr)
        return 1

    suffix = input_path.suffix.lower()

    try:
        if suffix == ".json":
            with open(input_path) as f:
                json.load(f)
            print(f"Valid JSON: {input_path}")

        elif suffix == ".csv":
            with open(input_path, newline="") as f:
                reader = csv.reader(f)
                rows = list(reader)

            if not rows:
                print(f"Warning: Empty CSV file: {input_path}")
            else:
                header_cols = len(rows[0])
                for i, row in enumerate(rows[1:], 2):
                    if len(row) != header_cols:
                        print(f"Invalid: Row {i} has {len(row)} columns, expected {header_cols}")
                        return 1
                print(f"Valid CSV: {input_path}")

        else:
            print(f"Unknown file type: {suffix}")
            return 1

    except json.JSONDecodeError as e:
        print(f"Invalid JSON: {e}")
        return 1
    except csv.Error as e:
        print(f"Invalid CSV: {e}")
        return 1

    return 0


def create_parser() -> argparse.ArgumentParser:
    """Create and configure the argument parser."""
    parser = argparse.ArgumentParser(
        prog="fileproc",
        description="A versatile file processing utility",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Convert JSON to CSV
    fileproc convert data.json -o data.csv

    # Convert CSV to JSON with pretty printing
    fileproc convert data.csv -o data.json --pretty

    # Get file information
    fileproc info data.json

    # Validate a file
    fileproc validate data.json
        """
    )

    parser.add_argument(
        "-V", "--version",
        action="version",
        version=f"%(prog)s {__version__}"
    )

    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output"
    )

    # Create subparsers
    subparsers = parser.add_subparsers(
        title="commands",
        dest="command",
        metavar="COMMAND"
    )

    # --- CONVERT subcommand ---
    convert_parser = subparsers.add_parser(
        "convert",
        help="Convert between file formats",
        description="Convert files between JSON, CSV, and text formats"
    )

    convert_parser.add_argument(
        "input",
        help="Input file path"
    )

    convert_parser.add_argument(
        "-o", "--output",
        required=True,
        help="Output file path"
    )

    convert_parser.add_argument(
        "-if", "--input-format",
        choices=["json", "csv"],
        help="Input format (auto-detected from extension if not specified)"
    )

    convert_parser.add_argument(
        "-of", "--output-format",
        choices=["json", "csv", "text"],
        help="Output format (auto-detected from extension if not specified)"
    )

    convert_parser.add_argument(
        "-l", "--limit",
        type=int,
        metavar="N",
        help="Limit to first N records"
    )

    convert_parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print JSON output"
    )

    convert_parser.add_argument(
        "-d", "--delimiter",
        default=",",
        help="CSV delimiter (default: comma)"
    )

    convert_parser.set_defaults(func=cmd_convert)

    # --- INFO subcommand ---
    info_parser = subparsers.add_parser(
        "info",
        help="Display file information",
        description="Show metadata and statistics about a file"
    )

    info_parser.add_argument(
        "file",
        help="File to analyze"
    )

    info_parser.set_defaults(func=cmd_info)

    # --- VALIDATE subcommand ---
    validate_parser = subparsers.add_parser(
        "validate",
        help="Validate file format",
        description="Check if a file is valid JSON or CSV"
    )

    validate_parser.add_argument(
        "file",
        help="File to validate"
    )

    validate_parser.set_defaults(func=cmd_validate)

    return parser


def main() -> int:
    """Main entry point."""
    parser = create_parser()
    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        return 0

    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
```

## Best Practices for CLI Design

Here are some guidelines to make your CLI applications more user-friendly:

### 1. Follow Conventions

Stick to established conventions that users expect:

```python
# Use -h and --help for help (automatic with argparse)
# Use -v for verbose or version
# Use -q for quiet mode
# Use -o for output files
# Use -f for format or force
# Use -- to separate flags from positional arguments
```

### 2. Provide Good Error Messages

Custom validation can provide more helpful errors:

```python
def validate_args(args):
    """Validate argument combinations."""
    errors = []

    if args.min_value and args.max_value:
        if args.min_value > args.max_value:
            errors.append("--min-value cannot be greater than --max-value")

    if args.output and not args.input:
        errors.append("--output requires --input to be specified")

    return errors
```

### 3. Support Both Interactive and Pipeline Usage

Design your CLI to work well in scripts:

```python
import sys

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "input",
        nargs="?",
        default="-",  # Convention for stdin
        help="Input file (default: stdin)"
    )

    args = parser.parse_args()

    # Handle stdin
    if args.input == "-":
        data = sys.stdin.read()
    else:
        with open(args.input) as f:
            data = f.read()

    # Process and output to stdout for piping
    result = process(data)
    print(result)
```

### 4. Use Exit Codes Properly

Return meaningful exit codes for scripting:

```python
import sys

# Common exit codes
EXIT_SUCCESS = 0
EXIT_ERROR = 1
EXIT_USAGE_ERROR = 2

def main():
    try:
        # Your application logic
        return EXIT_SUCCESS
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        return EXIT_ERROR
    except KeyboardInterrupt:
        print("\nOperation cancelled", file=sys.stderr)
        return 130  # Standard code for Ctrl+C

if __name__ == "__main__":
    sys.exit(main())
```

### 5. Add Shell Completion

For frequently used tools, consider adding shell completion:

```python
# Using argcomplete library (pip install argcomplete)
import argparse
import argcomplete

def main():
    parser = argparse.ArgumentParser()
    # ... add arguments ...

    # Enable shell completion
    argcomplete.autocomplete(parser)

    args = parser.parse_args()
```

## Testing Your CLI

Testing CLI applications requires a slightly different approach:

```python
#!/usr/bin/env python3
"""
Unit tests for CLI application.
"""

import unittest
import sys
from io import StringIO
from unittest.mock import patch

# Import your CLI module
from myapp import create_parser, main


class TestCLI(unittest.TestCase):
    """Test cases for the CLI."""

    def test_help_output(self):
        """Test that help is generated correctly."""
        parser = create_parser()

        # Capture help output
        with self.assertRaises(SystemExit) as cm:
            parser.parse_args(["--help"])

        self.assertEqual(cm.exception.code, 0)

    def test_required_argument_missing(self):
        """Test error when required argument is missing."""
        parser = create_parser()

        with self.assertRaises(SystemExit) as cm:
            parser.parse_args([])

        self.assertEqual(cm.exception.code, 2)  # argparse uses 2 for errors

    def test_valid_arguments(self):
        """Test parsing valid arguments."""
        parser = create_parser()
        args = parser.parse_args(["convert", "input.json", "-o", "output.csv"])

        self.assertEqual(args.input, "input.json")
        self.assertEqual(args.output, "output.csv")

    def test_invalid_choice(self):
        """Test error for invalid choice."""
        parser = create_parser()

        with self.assertRaises(SystemExit):
            parser.parse_args(["convert", "input.txt", "-o", "out.txt", "-if", "xml"])

    @patch("sys.stdout", new_callable=StringIO)
    def test_main_output(self, mock_stdout):
        """Test the main function output."""
        with patch("sys.argv", ["prog", "info", "test.json"]):
            # This would require mocking file operations too
            pass


if __name__ == "__main__":
    unittest.main()
```

## Summary

We have covered a lot of ground in this guide. Here is a quick reference:

| Feature | How to Use |
|---------|------------|
| Positional arguments | `parser.add_argument("name")` |
| Optional arguments | `parser.add_argument("-n", "--name")` |
| Type conversion | `parser.add_argument("count", type=int)` |
| Default values | `parser.add_argument("--limit", default=10)` |
| Boolean flags | `parser.add_argument("-v", action="store_true")` |
| Choices | `parser.add_argument("--format", choices=["json", "csv"])` |
| Multiple values | `parser.add_argument("files", nargs="+")` |
| Subcommands | `subparsers = parser.add_subparsers()` |
| Help formatting | `formatter_class=argparse.RawDescriptionHelpFormatter` |
| Mutually exclusive | `group = parser.add_mutually_exclusive_group()` |
| Argument groups | `group = parser.add_argument_group("title")` |

The `argparse` module is powerful enough for most CLI applications you will build. Start simple, and add complexity only when needed. Your users will thank you for a well-designed command-line interface.

## Monitor Your Applications with OneUptime

Building great CLI tools is just the first step. Once your applications are running in production, you need to know when things go wrong. OneUptime provides comprehensive monitoring, alerting, and incident management to keep your systems reliable.

With OneUptime, you can:

- Monitor your services and APIs with uptime checks
- Get instant alerts when issues occur
- Track performance metrics and identify bottlenecks
- Manage incidents with built-in status pages
- Analyze logs and traces to debug problems faster

Whether you are running CLI tools as cron jobs, building microservices, or deploying web applications, OneUptime helps you stay on top of your infrastructure.

Start monitoring your applications today at [https://oneuptime.com](https://oneuptime.com) and ensure your users always have a great experience.
