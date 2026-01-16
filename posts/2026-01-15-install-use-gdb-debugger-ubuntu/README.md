# How to Install and Use GDB Debugger on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, GDB, Debugging, C, C++, Tutorial

Description: Complete guide to using GNU Debugger (GDB) for debugging programs on Ubuntu.

---

The GNU Debugger (GDB) is an essential tool for any developer working with compiled languages like C and C++ on Linux systems. Whether you are tracking down segmentation faults, analyzing program behavior, or understanding complex code flows, GDB provides the capabilities you need. This comprehensive guide covers everything from basic installation to advanced features like Python scripting and remote debugging.

## Table of Contents

1. [Installing GDB on Ubuntu](#installing-gdb-on-ubuntu)
2. [Compiling Programs with Debug Symbols](#compiling-programs-with-debug-symbols)
3. [Starting GDB](#starting-gdb)
4. [Breakpoints](#breakpoints)
5. [Stepping Through Code](#stepping-through-code)
6. [Examining Variables and Memory](#examining-variables-and-memory)
7. [Call Stack Navigation](#call-stack-navigation)
8. [GDB Commands Reference](#gdb-commands-reference)
9. [Debugging Core Dumps](#debugging-core-dumps)
10. [Remote Debugging](#remote-debugging)
11. [GDB with Python Scripting](#gdb-with-python-scripting)
12. [TUI Mode](#tui-mode)
13. [Practical Debugging Examples](#practical-debugging-examples)

---

## Installing GDB on Ubuntu

Installing GDB on Ubuntu is straightforward using the APT package manager.

### Basic Installation

```bash
# Update package lists to ensure you get the latest version
sudo apt update

# Install GDB
sudo apt install gdb

# Verify the installation
gdb --version
```

### Installing Additional Tools

For a more complete debugging environment, consider installing these companion tools:

```bash
# Install build essentials (includes gcc, g++, make)
sudo apt install build-essential

# Install debugging symbols for system libraries
sudo apt install libc6-dbg

# Install GDB documentation
sudo apt install gdb-doc

# Install Valgrind for memory debugging (complements GDB)
sudo apt install valgrind
```

### Checking GDB Features

After installation, you can check what features your GDB build supports:

```bash
# Show GDB configuration information
gdb --configuration

# Start GDB and check Python support
gdb -q -ex "python print('Python support enabled')" -ex quit
```

---

## Compiling Programs with Debug Symbols

For GDB to provide meaningful debugging information, your programs must be compiled with debug symbols. The `-g` flag tells the compiler to include this information.

### Basic Compilation with Debug Symbols

```bash
# Compile a C program with debug symbols
gcc -g -o myprogram myprogram.c

# Compile a C++ program with debug symbols
g++ -g -o myprogram myprogram.cpp
```

### Debug Symbol Levels

GCC provides different levels of debug information:

```bash
# Level 1: Minimal information (function names and external variables)
gcc -g1 -o myprogram myprogram.c

# Level 2: Default level (includes line numbers and local variables)
gcc -g2 -o myprogram myprogram.c

# Level 3: Maximum information (includes macro definitions)
gcc -g3 -o myprogram myprogram.c

# DWARF version 4 format (more detailed debug info)
gcc -gdwarf-4 -g3 -o myprogram myprogram.c
```

### Recommended Compilation Flags for Debugging

```bash
# Comprehensive debug build
# -g3: Maximum debug info
# -O0: No optimization (code matches source exactly)
# -Wall: Enable all warnings
# -Wextra: Enable extra warnings
# -fno-omit-frame-pointer: Preserve frame pointer for better stack traces
gcc -g3 -O0 -Wall -Wextra -fno-omit-frame-pointer -o myprogram myprogram.c
```

### Example: Creating a Debug Build

Let's create a simple program to debug:

```c
/* debug_example.c - A simple program to demonstrate GDB debugging */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Structure to hold person information */
typedef struct {
    char name[50];
    int age;
    float salary;
} Person;

/* Function to create a new person */
Person* create_person(const char* name, int age, float salary) {
    /* Allocate memory for the person structure */
    Person* p = (Person*)malloc(sizeof(Person));
    if (p == NULL) {
        fprintf(stderr, "Memory allocation failed\n");
        return NULL;
    }

    /* Copy the name safely */
    strncpy(p->name, name, sizeof(p->name) - 1);
    p->name[sizeof(p->name) - 1] = '\0';  /* Ensure null termination */

    p->age = age;
    p->salary = salary;

    return p;
}

/* Function to calculate annual salary */
float calculate_annual_salary(Person* p) {
    /* Bug: What if p is NULL? */
    return p->salary * 12.0f;
}

/* Function to print person details */
void print_person(Person* p) {
    if (p == NULL) {
        printf("Person is NULL\n");
        return;
    }
    printf("Name: %s\n", p->name);
    printf("Age: %d\n", p->age);
    printf("Monthly Salary: %.2f\n", p->salary);
    printf("Annual Salary: %.2f\n", calculate_annual_salary(p));
}

int main(int argc, char* argv[]) {
    printf("=== Debug Example Program ===\n\n");

    /* Create some person objects */
    Person* alice = create_person("Alice Johnson", 30, 5000.0f);
    Person* bob = create_person("Bob Smith", 25, 4500.0f);

    /* Print their details */
    printf("Person 1:\n");
    print_person(alice);
    printf("\n");

    printf("Person 2:\n");
    print_person(bob);
    printf("\n");

    /* Clean up allocated memory */
    free(alice);
    free(bob);

    printf("Program completed successfully.\n");
    return 0;
}
```

Compile this program:

```bash
# Compile with full debug information
gcc -g3 -O0 -Wall -o debug_example debug_example.c
```

---

## Starting GDB

There are several ways to start GDB depending on your debugging scenario.

### Basic Startup Methods

```bash
# Start GDB with a program
gdb ./myprogram

# Start GDB with a program and arguments
gdb --args ./myprogram arg1 arg2 arg3

# Start GDB and attach to a running process by PID
gdb -p 12345

# Start GDB with a core dump file
gdb ./myprogram core

# Start GDB in quiet mode (suppress banner)
gdb -q ./myprogram

# Start GDB and execute commands from a file
gdb -x commands.gdb ./myprogram
```

### Initial GDB Commands

Once GDB starts, you can use these commands to begin:

```gdb
# Run the program
(gdb) run

# Run with arguments
(gdb) run arg1 arg2 arg3

# Set arguments before running
(gdb) set args arg1 arg2 arg3
(gdb) run

# Show current arguments
(gdb) show args

# Set environment variable
(gdb) set environment VAR=value

# Change working directory
(gdb) cd /path/to/directory

# Quit GDB
(gdb) quit
```

### GDB Initialization File

Create a `.gdbinit` file in your home directory for automatic configuration:

```bash
# ~/.gdbinit - GDB initialization file

# Enable command history
set history save on
set history size 10000
set history filename ~/.gdb_history

# Pretty print structures
set print pretty on

# Print array elements on separate lines
set print array on

# Show array indexes
set print array-indexes on

# Demangle C++ names
set print demangle on

# Set pagination off to avoid "press enter" prompts
set pagination off

# Enable Python pretty printers for STL containers
python
import sys
sys.path.insert(0, '/usr/share/gcc/python')
from libstdcxx.v6.printers import register_libstdcxx_printers
register_libstdcxx_printers(None)
end
```

---

## Breakpoints

Breakpoints are fundamental to debugging. They pause program execution at specified locations, allowing you to inspect program state.

### Setting Breakpoints

```gdb
# Break at a function
(gdb) break main
(gdb) break create_person

# Break at a specific line in current file
(gdb) break 42

# Break at a specific line in a specific file
(gdb) break debug_example.c:42

# Break at a memory address
(gdb) break *0x400520

# Break at a C++ method
(gdb) break MyClass::myMethod

# Break at all functions matching a regex
(gdb) rbreak ^print_

# Temporary breakpoint (automatically deleted after first hit)
(gdb) tbreak main
```

### Conditional Breakpoints

```gdb
# Break only when condition is true
(gdb) break 42 if count > 10

# Break when pointer equals specific value
(gdb) break calculate_annual_salary if p == 0

# Break when string matches
(gdb) break create_person if strcmp(name, "Alice") == 0

# Add condition to existing breakpoint
(gdb) condition 1 age > 25

# Remove condition from breakpoint
(gdb) condition 1
```

### Managing Breakpoints

```gdb
# List all breakpoints
(gdb) info breakpoints

# Delete a specific breakpoint by number
(gdb) delete 1

# Delete all breakpoints
(gdb) delete

# Disable a breakpoint (keep but don't trigger)
(gdb) disable 1

# Enable a disabled breakpoint
(gdb) enable 1

# Enable breakpoint once (then disable automatically)
(gdb) enable once 1

# Ignore breakpoint N times before stopping
(gdb) ignore 1 100
```

### Watchpoints

Watchpoints pause execution when a variable's value changes:

```gdb
# Watch a variable for any change (write watchpoint)
(gdb) watch myvar

# Watch for reads of a variable (read watchpoint)
(gdb) rwatch myvar

# Watch for reads or writes (access watchpoint)
(gdb) awatch myvar

# Watch a specific memory location
(gdb) watch *0x7fffffffe000

# Watch an expression
(gdb) watch array[index]

# Watch a structure member
(gdb) watch person->age

# Conditional watchpoint
(gdb) watch myvar if myvar > 100
```

### Catchpoints

Catchpoints pause execution when specific events occur:

```gdb
# Catch system calls
(gdb) catch syscall
(gdb) catch syscall open read write

# Catch signals
(gdb) catch signal SIGSEGV

# Catch C++ exceptions
(gdb) catch throw
(gdb) catch catch

# Catch specific C++ exception type
(gdb) catch throw std::runtime_error

# Catch fork and exec
(gdb) catch fork
(gdb) catch exec

# Catch library loading
(gdb) catch load
(gdb) catch load libc.so

# List catchpoints
(gdb) info catchpoints
```

---

## Stepping Through Code

Once execution is paused, you can step through your code line by line.

### Basic Stepping Commands

```gdb
# Step to next line (step INTO functions)
(gdb) step
(gdb) s

# Step to next line (step OVER functions)
(gdb) next
(gdb) n

# Step one machine instruction (into calls)
(gdb) stepi
(gdb) si

# Step one machine instruction (over calls)
(gdb) nexti
(gdb) ni

# Continue until current function returns
(gdb) finish

# Continue until a specific line
(gdb) until 50

# Continue to next breakpoint or end
(gdb) continue
(gdb) c
```

### Advanced Stepping

```gdb
# Step N times
(gdb) step 5
(gdb) next 10

# Continue until leaving current stack frame
(gdb) finish

# Return from function immediately with specified value
(gdb) return 42

# Jump to a different line (dangerous - skips code)
(gdb) jump 50

# Advance to a specific location
(gdb) advance print_person
```

### Reverse Debugging

GDB supports reverse execution when enabled:

```gdb
# Enable recording for reverse debugging
(gdb) record

# Step backwards
(gdb) reverse-step
(gdb) rs

# Next backwards (step over in reverse)
(gdb) reverse-next
(gdb) rn

# Continue backwards to previous breakpoint
(gdb) reverse-continue
(gdb) rc

# Stop recording
(gdb) record stop
```

---

## Examining Variables and Memory

GDB provides powerful commands for inspecting program state.

### Printing Variables

```gdb
# Print a variable
(gdb) print myvar
(gdb) p myvar

# Print with specific format
(gdb) print/x myvar    # Hexadecimal
(gdb) print/d myvar    # Signed decimal
(gdb) print/u myvar    # Unsigned decimal
(gdb) print/o myvar    # Octal
(gdb) print/t myvar    # Binary
(gdb) print/c myvar    # Character
(gdb) print/f myvar    # Float
(gdb) print/s myvar    # String
(gdb) print/a myvar    # Address

# Print an expression
(gdb) print count + 1
(gdb) print array[5]
(gdb) print *ptr

# Print structure members
(gdb) print person->name
(gdb) print person.age

# Print entire array
(gdb) print *array@10

# Print array slice
(gdb) print array[5]@3

# Cast and print
(gdb) print (int)float_var
(gdb) print (char*)0x7fff5678
```

### Display (Automatic Printing)

```gdb
# Automatically display variable at each stop
(gdb) display myvar

# Display with format
(gdb) display/x myvar

# List all displays
(gdb) info display

# Delete a display
(gdb) undisplay 1

# Disable/enable display
(gdb) disable display 1
(gdb) enable display 1
```

### Examining Memory

```gdb
# Examine memory: x/nfu address
# n = count, f = format, u = unit size

# Examine 10 words in hex starting at address
(gdb) x/10xw 0x7fffffffe000

# Examine 16 bytes in hex
(gdb) x/16xb &myvar

# Examine as string
(gdb) x/s string_ptr

# Examine 5 instructions at address
(gdb) x/5i $pc

# Examine 4 giant words (8 bytes each)
(gdb) x/4xg &myvar

# Unit sizes: b=byte, h=halfword(2), w=word(4), g=giant(8)
# Formats: x=hex, d=decimal, u=unsigned, o=octal, t=binary,
#          c=char, s=string, i=instruction, a=address, f=float
```

### Type Information

```gdb
# Show type of variable
(gdb) ptype myvar

# Show type of expression
(gdb) ptype person->salary

# Detailed type information
(gdb) whatis myvar

# Show all local variables
(gdb) info locals

# Show function arguments
(gdb) info args

# Show all global variables
(gdb) info variables

# Show registers
(gdb) info registers
(gdb) info all-registers

# Print specific register
(gdb) print $rax
(gdb) print $pc
(gdb) print $sp
```

---

## Call Stack Navigation

Understanding the call stack is crucial for debugging complex programs.

### Viewing the Stack

```gdb
# Show backtrace (call stack)
(gdb) backtrace
(gdb) bt

# Backtrace with full local variables
(gdb) backtrace full
(gdb) bt full

# Show only N frames
(gdb) bt 5

# Show inner N frames
(gdb) bt -5

# Show frame information
(gdb) info frame

# Show detailed frame info
(gdb) info frame 0
```

### Navigating Frames

```gdb
# Select a specific frame
(gdb) frame 3
(gdb) f 3

# Move up the stack (toward main)
(gdb) up
(gdb) up 2

# Move down the stack (toward current position)
(gdb) down
(gdb) down 2

# Show current frame info
(gdb) info frame

# Show arguments of current frame
(gdb) info args

# Show locals of current frame
(gdb) info locals
```

### Stack Examination Example

```gdb
# Sample debugging session examining the stack

(gdb) bt
#0  calculate_annual_salary (p=0x5555555592a0) at debug_example.c:35
#1  0x0000555555555231 in print_person (p=0x5555555592a0) at debug_example.c:45
#2  0x00005555555552b5 in main (argc=1, argv=0x7fffffffe3e8) at debug_example.c:57

(gdb) frame 1
#1  0x0000555555555231 in print_person (p=0x5555555592a0) at debug_example.c:45
45          printf("Annual Salary: %.2f\n", calculate_annual_salary(p));

(gdb) info args
p = 0x5555555592a0

(gdb) print *p
$1 = {name = "Alice Johnson", age = 30, salary = 5000}
```

---

## GDB Commands Reference

Here is a comprehensive reference of commonly used GDB commands:

### Program Control

| Command | Short | Description |
|---------|-------|-------------|
| `run [args]` | `r` | Start program execution |
| `continue` | `c` | Continue to next breakpoint |
| `step` | `s` | Step into function |
| `next` | `n` | Step over function |
| `finish` | `fin` | Run until function returns |
| `until [loc]` | `u` | Continue until location |
| `kill` | `k` | Stop program execution |
| `quit` | `q` | Exit GDB |

### Breakpoints

| Command | Short | Description |
|---------|-------|-------------|
| `break [loc]` | `b` | Set breakpoint |
| `tbreak [loc]` | `tb` | Set temporary breakpoint |
| `watch expr` | - | Set watchpoint |
| `catch event` | - | Set catchpoint |
| `delete [num]` | `d` | Delete breakpoint |
| `disable [num]` | `dis` | Disable breakpoint |
| `enable [num]` | `en` | Enable breakpoint |
| `info breakpoints` | `i b` | List breakpoints |

### Examination

| Command | Short | Description |
|---------|-------|-------------|
| `print expr` | `p` | Print expression value |
| `display expr` | `disp` | Auto-display expression |
| `x/nfu addr` | - | Examine memory |
| `info locals` | `i lo` | Show local variables |
| `info args` | `i ar` | Show function arguments |
| `ptype var` | `pt` | Show variable type |
| `backtrace` | `bt` | Show call stack |

### Navigation

| Command | Short | Description |
|---------|-------|-------------|
| `list` | `l` | Show source code |
| `frame [num]` | `f` | Select stack frame |
| `up [num]` | - | Move up stack |
| `down [num]` | `do` | Move down stack |
| `info frame` | `i f` | Show frame info |

### Files and Symbols

| Command | Short | Description |
|---------|-------|-------------|
| `file prog` | - | Load program |
| `symbol-file` | - | Load symbols |
| `info functions` | `i fu` | List functions |
| `info variables` | `i va` | List global variables |
| `info sources` | `i so` | List source files |

---

## Debugging Core Dumps

Core dumps capture the state of a crashed program for post-mortem analysis.

### Enabling Core Dumps

```bash
# Check current core dump limit
ulimit -c

# Enable unlimited core dumps
ulimit -c unlimited

# Make the setting permanent in ~/.bashrc
echo "ulimit -c unlimited" >> ~/.bashrc

# Configure core dump file pattern (as root)
echo "/tmp/core.%e.%p.%t" | sudo tee /proc/sys/kernel/core_pattern

# Pattern specifiers:
# %e = executable name
# %p = PID
# %t = timestamp
# %u = UID
# %h = hostname
```

### Analyzing Core Dumps

```bash
# Open GDB with program and core dump
gdb ./myprogram /tmp/core.myprogram.12345.1234567890

# Or load core dump after starting GDB
gdb ./myprogram
(gdb) core /tmp/core.myprogram.12345.1234567890
```

### Core Dump Analysis Commands

```gdb
# After loading core dump, see where crash occurred
(gdb) bt

# See full backtrace with locals
(gdb) bt full

# Examine the faulting instruction
(gdb) x/i $pc

# Check signal that caused the crash
(gdb) info signal

# Examine registers at crash time
(gdb) info registers

# Check memory mappings
(gdb) info proc mappings

# Examine specific variables
(gdb) print *crashed_pointer
```

### Example: Analyzing a Segfault

```c
/* crash_example.c - Program that will crash */
#include <stdio.h>

int main() {
    int *ptr = NULL;
    printf("About to crash...\n");
    *ptr = 42;  /* This will cause SIGSEGV */
    return 0;
}
```

```bash
# Compile and run to generate core dump
gcc -g -o crash_example crash_example.c
ulimit -c unlimited
./crash_example  # Program crashes

# Analyze the core dump
gdb ./crash_example core
```

```gdb
(gdb) bt
#0  0x0000555555555161 in main () at crash_example.c:7

(gdb) list
2       #include <stdio.h>
3
4       int main() {
5           int *ptr = NULL;
6           printf("About to crash...\n");
7           *ptr = 42;  /* This will cause SIGSEGV */
8           return 0;
9       }

(gdb) print ptr
$1 = (int *) 0x0

(gdb) info registers rax
rax            0x0                 0
```

---

## Remote Debugging

GDB can debug programs running on remote machines or embedded systems.

### Setting Up gdbserver

On the remote/target machine:

```bash
# Install gdbserver
sudo apt install gdbserver

# Start gdbserver listening on a port
gdbserver :2345 ./myprogram

# Or attach to existing process
gdbserver :2345 --attach 12345

# Start with program arguments
gdbserver :2345 ./myprogram arg1 arg2

# Multi-process mode (allows multiple connections)
gdbserver --multi :2345
```

### Connecting from GDB

On the local/development machine:

```gdb
# Start GDB with the same executable (for symbols)
gdb ./myprogram

# Connect to remote gdbserver
(gdb) target remote 192.168.1.100:2345

# For extended-remote (allows run command)
(gdb) target extended-remote 192.168.1.100:2345

# Set sysroot for remote libraries
(gdb) set sysroot /path/to/remote/sysroot

# Now debug as normal
(gdb) break main
(gdb) continue
```

### Remote Debugging Over SSH

```bash
# Create SSH tunnel for secure remote debugging
ssh -L 2345:localhost:2345 user@remote-server

# On remote server, start gdbserver on localhost
gdbserver localhost:2345 ./myprogram

# On local machine, connect through tunnel
gdb ./myprogram
(gdb) target remote localhost:2345
```

### Useful Remote Debugging Commands

```gdb
# Disconnect from remote
(gdb) disconnect

# Check remote connection
(gdb) info target

# Transfer files to remote
(gdb) remote put local_file remote_file

# Get files from remote
(gdb) remote get remote_file local_file

# Run command on remote (extended-remote)
(gdb) monitor help
```

---

## GDB with Python Scripting

GDB includes a Python interpreter for extending its functionality.

### Basic Python in GDB

```gdb
# Execute Python code
(gdb) python print("Hello from GDB Python!")

# Multi-line Python
(gdb) python
>import gdb
>print(f"Current frame: {gdb.selected_frame()}")
>end

# Run Python script file
(gdb) source my_script.py
```

### GDB Python API Basics

Create a file `gdb_helpers.py`:

```python
# gdb_helpers.py - Custom GDB Python extensions

import gdb

class PrintLocals(gdb.Command):
    """Print all local variables with their types and values."""

    def __init__(self):
        # Register command as "print-locals"
        super(PrintLocals, self).__init__("print-locals", gdb.COMMAND_DATA)

    def invoke(self, arg, from_tty):
        # Get current frame
        frame = gdb.selected_frame()

        # Get the block containing locals
        block = frame.block()

        print("Local variables:")
        print("-" * 40)

        # Iterate through symbols in the block
        for symbol in block:
            if symbol.is_argument or symbol.is_variable:
                try:
                    value = frame.read_var(symbol)
                    print(f"  {symbol.name}: {symbol.type} = {value}")
                except gdb.error as e:
                    print(f"  {symbol.name}: {symbol.type} = <error: {e}>")

# Instantiate the command
PrintLocals()


class BreakOnValue(gdb.Breakpoint):
    """Breakpoint that only stops when variable equals specific value."""

    def __init__(self, location, var_name, expected_value):
        super(BreakOnValue, self).__init__(location)
        self.var_name = var_name
        self.expected_value = expected_value

    def stop(self):
        # Get the variable value
        try:
            frame = gdb.selected_frame()
            value = frame.read_var(self.var_name)
            # Only stop if value matches
            return int(value) == self.expected_value
        except:
            return True  # Stop on error


class WatchStruct(gdb.Command):
    """Watch all members of a structure for changes."""

    def __init__(self):
        super(WatchStruct, self).__init__("watch-struct", gdb.COMMAND_BREAKPOINTS)

    def invoke(self, arg, from_tty):
        # Parse argument as variable name
        var_name = arg.strip()
        if not var_name:
            print("Usage: watch-struct <variable>")
            return

        try:
            # Get the variable
            var = gdb.parse_and_eval(var_name)
            var_type = var.type

            # Check if it's a pointer
            if var_type.code == gdb.TYPE_CODE_PTR:
                var = var.dereference()
                var_type = var_type.target()

            # Check if it's a struct
            if var_type.code != gdb.TYPE_CODE_STRUCT:
                print(f"Error: {var_name} is not a structure")
                return

            # Create watchpoint for each field
            print(f"Setting watchpoints for {var_name}:")
            for field in var_type.fields():
                watch_expr = f"{var_name}->{field.name}" if '->' in arg else f"{var_name}.{field.name}"
                gdb.Breakpoint(watch_expr, gdb.BP_WATCHPOINT)
                print(f"  Watching: {watch_expr}")

        except gdb.error as e:
            print(f"Error: {e}")

WatchStruct()


class PrettyPrinterPerson(object):
    """Pretty printer for Person structure."""

    def __init__(self, val):
        self.val = val

    def to_string(self):
        name = self.val['name'].string()
        age = int(self.val['age'])
        salary = float(self.val['salary'])
        return f"Person(name='{name}', age={age}, salary={salary:.2f})"


def person_lookup(val):
    """Look up function for Person pretty printer."""
    if str(val.type) == 'Person':
        return PrettyPrinterPerson(val)
    return None


# Register the pretty printer
gdb.pretty_printers.append(person_lookup)


# Convenience functions
class MemoryUsage(gdb.Function):
    """Return memory usage of a type."""

    def __init__(self):
        super(MemoryUsage, self).__init__("memsize")

    def invoke(self, value):
        return value.type.sizeof

MemoryUsage()

print("GDB helpers loaded. Available commands:")
print("  print-locals    - Print all local variables")
print("  watch-struct    - Watch all struct members")
print("  $memsize(expr)  - Return size of expression")
```

### Loading Python Extensions

```gdb
# Load the Python script
(gdb) source gdb_helpers.py

# Use the custom commands
(gdb) print-locals
(gdb) watch-struct person

# Use custom function
(gdb) print $memsize(my_struct)
```

### Event-Based Python Scripting

```python
# gdb_events.py - Event handlers for GDB

import gdb

def stop_handler(event):
    """Called whenever execution stops."""
    if isinstance(event, gdb.SignalEvent):
        print(f"\n*** Stopped by signal: {event.stop_signal} ***")
    elif isinstance(event, gdb.BreakpointEvent):
        for bp in event.breakpoints:
            print(f"\n*** Hit breakpoint {bp.number} ***")

def exit_handler(event):
    """Called when inferior exits."""
    print(f"\n*** Program exited with code: {event.exit_code} ***")

def new_objfile_handler(event):
    """Called when new object file is loaded."""
    print(f"Loaded: {event.new_objfile.filename}")

# Register event handlers
gdb.events.stop.connect(stop_handler)
gdb.events.exited.connect(exit_handler)
gdb.events.new_objfile.connect(new_objfile_handler)

print("Event handlers registered")
```

---

## TUI Mode

GDB's Text User Interface (TUI) provides a visual debugging experience in the terminal.

### Entering TUI Mode

```bash
# Start GDB in TUI mode
gdb -tui ./myprogram

# Or enable TUI from within GDB
(gdb) tui enable

# Toggle TUI mode
# Press: Ctrl+x, a

# Or use layout command
(gdb) layout src
```

### TUI Layouts

```gdb
# Source code only
(gdb) layout src

# Assembly only
(gdb) layout asm

# Source and assembly split
(gdb) layout split

# Source and registers
(gdb) layout regs

# Focus on different windows
(gdb) focus src
(gdb) focus asm
(gdb) focus regs
(gdb) focus cmd

# Cycle through layouts
# Press: Ctrl+x, 2

# Single window mode
# Press: Ctrl+x, 1
```

### TUI Commands

```gdb
# Refresh the screen (useful if display gets corrupted)
(gdb) refresh
# Or press: Ctrl+l

# Update source window
(gdb) update

# Change source window height
(gdb) winheight src +5
(gdb) winheight src -3

# Change register display format
(gdb) tui reg general
(gdb) tui reg float
(gdb) tui reg system
(gdb) tui reg all

# Scroll source window
# Use arrow keys when source window focused
# Or: Page Up, Page Down
```

### TUI Key Bindings

| Key | Description |
|-----|-------------|
| `Ctrl+x, a` | Toggle TUI mode |
| `Ctrl+x, 1` | Single window |
| `Ctrl+x, 2` | Cycle layouts |
| `Ctrl+x, o` | Switch focus |
| `Ctrl+x, s` | Toggle SingleKey mode |
| `Ctrl+l` | Refresh screen |
| `Up/Down` | Scroll source (when focused) |
| `Page Up/Down` | Scroll source page |

### SingleKey Mode

In SingleKey mode, single keys execute commands:

```gdb
# Enable SingleKey mode
(gdb) tui enable
# Press: Ctrl+x, s

# Keys in SingleKey mode:
# c = continue
# d = down (stack frame)
# f = finish
# n = next
# o = nexti
# q = exit SingleKey mode
# r = run
# s = step
# i = stepi
# u = up (stack frame)
# v = info locals
# w = where (backtrace)
```

---

## Practical Debugging Examples

Let's work through some real-world debugging scenarios.

### Example 1: Finding a Segmentation Fault

```c
/* segfault_example.c - Program with a segmentation fault */
#include <stdio.h>
#include <stdlib.h>

/* Structure for a linked list node */
typedef struct Node {
    int data;
    struct Node* next;
} Node;

/* Function to create a new node */
Node* create_node(int data) {
    Node* node = (Node*)malloc(sizeof(Node));
    node->data = data;
    node->next = NULL;
    return node;
}

/* Function with a bug - doesn't check for NULL */
void print_list(Node* head) {
    Node* current = head;
    while (current != NULL) {
        printf("%d -> ", current->data);
        current = current->next;
    }
    printf("NULL\n");
}

/* Buggy function - accesses freed memory */
void buggy_delete(Node* head) {
    Node* current = head;
    while (current != NULL) {
        Node* temp = current;
        current = current->next;
        free(temp);
        /* Bug: accessing temp->data after free */
        printf("Deleted node with data: %d\n", temp->data);
    }
}

int main() {
    /* Create a simple linked list */
    Node* head = create_node(1);
    head->next = create_node(2);
    head->next->next = create_node(3);

    printf("Original list: ");
    print_list(head);

    printf("Deleting list...\n");
    buggy_delete(head);

    return 0;
}
```

Debugging session:

```bash
# Compile with debug symbols
gcc -g -O0 -o segfault_example segfault_example.c

# Start debugging
gdb ./segfault_example
```

```gdb
(gdb) run
Original list: 1 -> 2 -> 3 -> NULL
Deleting list...
Deleted node with data: 0  # <-- Notice the wrong value!
Deleted node with data: 0

Program received signal SIGSEGV, Segmentation fault.

(gdb) bt
#0  0x00007ffff7a8b0a0 in ?? () from /lib/x86_64-linux-gnu/libc.so.6
#1  0x0000555555555248 in buggy_delete (head=0x5555555592a0) at segfault_example.c:34
#2  0x00005555555552c1 in main () at segfault_example.c:47

(gdb) frame 1
#1  0x0000555555555248 in buggy_delete (head=0x5555555592a0) at segfault_example.c:34

(gdb) list
29          Node* current = head;
30          while (current != NULL) {
31              Node* temp = current;
32              current = current->next;
33              free(temp);
34              /* Bug: accessing temp->data after free */
35              printf("Deleted node with data: %d\n", temp->data);
36          }
37      }

(gdb) # Found the bug: accessing temp->data after free(temp)
```

### Example 2: Finding a Memory Leak

```c
/* memleak_example.c - Program with memory leak */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

char* create_greeting(const char* name) {
    /* Allocate buffer for greeting */
    char* greeting = (char*)malloc(100);
    if (greeting == NULL) return NULL;

    snprintf(greeting, 100, "Hello, %s!", name);
    return greeting;
}

void process_names(const char** names, int count) {
    for (int i = 0; i < count; i++) {
        char* greeting = create_greeting(names[i]);
        printf("%s\n", greeting);
        /* Bug: forgot to free(greeting) */
    }
}

int main() {
    const char* names[] = {"Alice", "Bob", "Charlie", "Diana"};
    int count = sizeof(names) / sizeof(names[0]);

    for (int i = 0; i < 1000; i++) {
        process_names(names, count);
    }

    printf("Done processing names\n");
    return 0;
}
```

Using GDB with Valgrind:

```bash
# Compile
gcc -g -O0 -o memleak_example memleak_example.c

# Run with Valgrind first
valgrind --leak-check=full ./memleak_example

# Use GDB to understand the leak
gdb ./memleak_example
```

```gdb
# Set breakpoint at the allocation
(gdb) break create_greeting
(gdb) run

Breakpoint 1, create_greeting (name=0x555555556004 "Alice") at memleak_example.c:8

(gdb) # Step through to see the allocation
(gdb) next
(gdb) next

(gdb) print greeting
$1 = 0x5555555592a0 "Hello, Alice!"

(gdb) # Continue to process_names
(gdb) finish

(gdb) # Check if greeting is freed
(gdb) break 16  # After printf
(gdb) continue

(gdb) info locals
greeting = 0x5555555592a0

(gdb) # Notice: we're about to leave the function without freeing greeting
```

### Example 3: Debugging a Race Condition (Multithreaded)

```c
/* race_example.c - Program with race condition */
#include <stdio.h>
#include <pthread.h>
#include <unistd.h>

/* Shared counter without proper synchronization */
int counter = 0;

void* increment_counter(void* arg) {
    int thread_id = *(int*)arg;

    for (int i = 0; i < 100000; i++) {
        /* Race condition: read-modify-write is not atomic */
        int temp = counter;
        temp = temp + 1;
        counter = temp;
    }

    printf("Thread %d finished\n", thread_id);
    return NULL;
}

int main() {
    pthread_t threads[4];
    int thread_ids[4];

    /* Create threads */
    for (int i = 0; i < 4; i++) {
        thread_ids[i] = i;
        pthread_create(&threads[i], NULL, increment_counter, &thread_ids[i]);
    }

    /* Wait for threads to finish */
    for (int i = 0; i < 4; i++) {
        pthread_join(threads[i], NULL);
    }

    printf("Expected counter: 400000\n");
    printf("Actual counter: %d\n", counter);

    return 0;
}
```

Debugging session:

```bash
# Compile with pthread
gcc -g -O0 -pthread -o race_example race_example.c

# Debug
gdb ./race_example
```

```gdb
(gdb) # Set scheduler locking to debug one thread at a time
(gdb) set scheduler-locking on

(gdb) break increment_counter
(gdb) run

Thread 2 "race_example" hit Breakpoint 1, increment_counter (arg=0x7fffffffe140)

(gdb) info threads
  Id   Target Id                                  Frame
  1    Thread 0x7ffff7da7740 (LWP 12345) "race_example" pthread_create@@GLIBC_2.2.5
* 2    Thread 0x7ffff7da6700 (LWP 12346) "race_example" increment_counter (arg=0x7fffffffe140)
  3    Thread 0x7ffff75a5700 (LWP 12347) "race_example" increment_counter (arg=0x7fffffffe144)

(gdb) # Switch to different thread
(gdb) thread 3
[Switching to thread 3 (Thread 0x7ffff75a5700 (LWP 12347))]

(gdb) # Watch the counter variable
(gdb) watch counter
Hardware watchpoint 2: counter

(gdb) continue
Thread 2 "race_example" hit Hardware watchpoint 2: counter

Old value = 0
New value = 1

(gdb) # Can see when counter changes
(gdb) print counter
$1 = 1
```

### Example 4: Debugging with Conditional Breakpoints

```c
/* conditional_example.c - Finding specific values */
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

typedef struct {
    int id;
    char name[32];
    double score;
} Student;

Student* create_students(int count) {
    Student* students = (Student*)malloc(count * sizeof(Student));

    srand(time(NULL));
    for (int i = 0; i < count; i++) {
        students[i].id = i + 1000;
        snprintf(students[i].name, 32, "Student_%d", i);
        students[i].score = (double)(rand() % 100) + (rand() % 100) / 100.0;
    }

    return students;
}

void process_student(Student* s) {
    printf("Processing: ID=%d, Name=%s, Score=%.2f\n",
           s->id, s->name, s->score);

    /* Some complex processing here */
    if (s->score < 50.0) {
        printf("  -> Failing grade!\n");
    }
}

int main() {
    int count = 100;
    Student* students = create_students(count);

    for (int i = 0; i < count; i++) {
        process_student(&students[i]);
    }

    free(students);
    return 0;
}
```

Debugging session:

```gdb
(gdb) # Break only when score is below threshold
(gdb) break process_student if s->score < 30.0

(gdb) run
Breakpoint 1, process_student (s=0x5555555592a0) at conditional_example.c:25

(gdb) print *s
$1 = {id = 1023, name = "Student_23", score = 28.45}

(gdb) # Only stops for students with scores < 30

(gdb) # Add command to execute at breakpoint
(gdb) commands 1
>printf "Found low score: %s = %.2f\n", s->name, s->score
>continue
>end

(gdb) continue
Found low score: Student_45 = 22.18
Found low score: Student_67 = 15.89
```

---

## Summary

GDB is an indispensable tool for debugging C and C++ programs on Ubuntu. In this guide, we covered:

- **Installation**: Using apt to install GDB and related tools
- **Compilation**: Adding debug symbols with `-g` and choosing optimization levels
- **Basic Operations**: Starting GDB, running programs, and setting arguments
- **Breakpoints**: Setting, managing, and using conditional breakpoints
- **Watchpoints and Catchpoints**: Monitoring variables and system events
- **Stepping**: Navigating through code line by line
- **Inspection**: Examining variables, memory, and program state
- **Call Stack**: Understanding and navigating the execution stack
- **Core Dumps**: Analyzing crashed programs post-mortem
- **Remote Debugging**: Debugging programs on remote machines
- **Python Scripting**: Extending GDB with custom commands
- **TUI Mode**: Using the visual text interface for debugging

Mastering GDB takes practice, but these fundamentals will help you efficiently track down bugs in your programs. Start with simple programs and gradually work your way up to debugging more complex applications.

---

## Monitoring Your Applications with OneUptime

While GDB is excellent for debugging during development, production applications need continuous monitoring to catch issues before they affect users. OneUptime provides comprehensive monitoring solutions that complement your debugging workflow:

- **Application Performance Monitoring**: Track response times, error rates, and throughput in real-time
- **Error Tracking**: Automatically capture and analyze crashes and exceptions in production
- **Infrastructure Monitoring**: Monitor CPU, memory, and disk usage on your Ubuntu servers
- **Alerting**: Get notified immediately when issues arise, so you can start debugging sooner
- **Status Pages**: Keep your users informed during incidents
- **Log Management**: Centralize and search through application logs for debugging clues

By combining thorough debugging practices with proactive monitoring through OneUptime, you can ensure your applications run reliably and efficiently. Visit [OneUptime](https://oneuptime.com) to learn more about how comprehensive monitoring can improve your development and operations workflow.
