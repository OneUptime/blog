# How to Automate Interactive Commands with expect on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, expect, Automation, Interactive, Scripting, Tutorial

Description: Complete guide to using expect for automating interactive command-line programs on Ubuntu.

---

## Introduction

Many command-line programs require interactive input from users, such as passwords, confirmations, or configuration choices. While this is fine for manual operation, it becomes a significant obstacle when you need to automate tasks in scripts, CI/CD pipelines, or scheduled jobs. This is where **expect** comes to the rescue.

**expect** is a powerful tool that automates interactive applications by "expecting" specific patterns in program output and "sending" appropriate responses. Originally developed by Don Libes at the National Institute of Standards and Technology, expect has become an essential tool for system administrators and DevOps engineers who need to automate tasks that would otherwise require human interaction.

In this comprehensive guide, you will learn how to use expect on Ubuntu to automate everything from simple password prompts to complex multi-step interactive sessions.

---

## Understanding expect

### What is expect?

expect is a program that "talks" to other interactive programs according to a script. It works by:

1. **Spawning** a new process (the interactive program you want to automate)
2. **Expecting** specific output patterns from that process
3. **Sending** appropriate responses when those patterns are matched

expect uses **Tcl (Tool Command Language)** as its scripting language, which provides powerful string manipulation and control flow capabilities.

### Why Use expect?

- **Automate repetitive tasks**: No more typing the same responses over and over
- **Script unscriptable programs**: Automate programs that have no non-interactive mode
- **Testing**: Create automated tests for interactive applications
- **Batch operations**: Run the same interactive task on multiple systems
- **CI/CD integration**: Include interactive steps in automated pipelines

### How expect Works

expect operates on a simple principle: pattern matching. When you spawn a process, expect monitors its output. When the output matches a pattern you have defined, expect executes the associated action, typically sending a response.

```
spawn program       # Start the interactive program
expect "pattern"    # Wait for specific output
send "response\r"   # Send a response (with carriage return)
```

---

## Installing expect on Ubuntu

### Check if expect is Installed

First, check whether expect is already installed on your system:

```bash
which expect
```

Or check the version:

```bash
expect -v
```

### Install expect Using apt

If expect is not installed, install it using the following commands:

```bash
# Update package lists
sudo apt update

# Install expect
sudo apt install expect -y
```

### Verify Installation

Confirm the installation was successful:

```bash
expect -v
```

You should see output similar to:

```
expect version 5.45.4
```

### Install Additional Tools

For more advanced automation, you may also want to install `autoexpect`, which is typically included with the expect package:

```bash
# autoexpect should already be available after installing expect
which autoexpect
```

---

## Basic expect Scripts

### Your First expect Script

Let us start with a simple example. Create a file called `first_expect.exp`:

```tcl
#!/usr/bin/expect -f

# This is a simple expect script that automates the 'cat' command
# to demonstrate basic expect functionality

# Set a timeout (in seconds)
set timeout 10

# Spawn a simple interactive session
spawn cat

# Send some text
send "Hello, expect!\r"

# Send EOF (Ctrl+D) to end cat
send "\x04"

# Wait for the process to finish
expect eof

puts "Script completed successfully!"
```

Make the script executable and run it:

```bash
chmod +x first_expect.exp
./first_expect.exp
```

### Understanding the Script Structure

Every expect script typically follows this structure:

```tcl
#!/usr/bin/expect -f

# 1. Configuration
set timeout 30

# 2. Spawn the process
spawn program_name arguments

# 3. Interaction loop
expect "prompt1" { send "response1\r" }
expect "prompt2" { send "response2\r" }

# 4. Cleanup
expect eof
```

### A Practical Example: Automating adduser

Here is a more practical example that automates creating a new user:

```tcl
#!/usr/bin/expect -f

# Script: create_user.exp
# Purpose: Automate the adduser command to create a new user
# Usage: ./create_user.exp username password "Full Name"

# Get command line arguments
set username [lindex $argv 0]
set password [lindex $argv 1]
set fullname [lindex $argv 2]

# Validate arguments
if {$username eq "" || $password eq ""} {
    puts "Usage: ./create_user.exp username password \"Full Name\""
    exit 1
}

# Set timeout
set timeout 30

# Spawn the adduser command
spawn sudo adduser $username

# Handle the various prompts
expect {
    "New password:" {
        send "$password\r"
        exp_continue
    }
    "Retype new password:" {
        send "$password\r"
        exp_continue
    }
    "Full Name" {
        send "$fullname\r"
        exp_continue
    }
    "Room Number" {
        send "\r"
        exp_continue
    }
    "Work Phone" {
        send "\r"
        exp_continue
    }
    "Home Phone" {
        send "\r"
        exp_continue
    }
    "Other" {
        send "\r"
        exp_continue
    }
    "Is the information correct?" {
        send "Y\r"
    }
    timeout {
        puts "Error: Timeout waiting for prompt"
        exit 1
    }
    eof {
        puts "Process ended unexpectedly"
        exit 1
    }
}

expect eof
puts "User $username created successfully!"
```

---

## spawn, expect, send Commands

These three commands form the core of expect scripting. Let us explore each in detail.

### The spawn Command

`spawn` starts a new process and connects expect to its input/output:

```tcl
# Basic spawn
spawn ssh user@hostname

# Spawn with arguments
spawn scp file.txt user@hostname:/path/

# Spawn a shell command
spawn bash -c "some_command | another_command"

# Get the process ID
spawn ssh user@hostname
set pid [exp_pid]
puts "Process ID: $pid"
```

### The expect Command

`expect` waits for patterns in the spawned process output:

```tcl
# Simple pattern matching
expect "password:"

# Multiple patterns with actions
expect {
    "password:" { send "mypassword\r" }
    "Permission denied" { puts "Access denied"; exit 1 }
    timeout { puts "Timed out"; exit 1 }
}

# Using exp_continue for loops
expect {
    "Continue? (y/n)" {
        send "y\r"
        exp_continue
    }
    "Completed" {
        puts "Done!"
    }
}
```

### The send Command

`send` transmits strings to the spawned process:

```tcl
# Basic send with carriage return
send "mypassword\r"

# Send without carriage return
send "partial_input"

# Send special characters
send "\r"      ;# Carriage return (Enter)
send "\n"      ;# Newline
send "\t"      ;# Tab
send "\x03"    ;# Ctrl+C
send "\x04"    ;# Ctrl+D (EOF)
send "\x1a"    ;# Ctrl+Z (suspend)

# Send with delay between characters (useful for slow terminals)
send -s "slow_text\r"
```

### Related Commands

```tcl
# send_user - Send output to the user (stdout)
send_user "This message goes to the console\n"

# send_log - Send to log file (if logging is enabled)
log_file script.log
send_log "This goes to the log file\n"

# send_error - Send to stderr
send_error "This is an error message\n"
```

---

## Pattern Matching

expect provides powerful pattern matching capabilities using glob patterns, regular expressions, and exact strings.

### Glob Patterns (Default)

Glob patterns are the default matching mode, similar to shell wildcards:

```tcl
# Match any string ending with "password:"
expect "*password:"

# Match with wildcards
expect {
    "*yes/no*" { send "yes\r" }
    "*password*" { send "$password\r" }
}
```

### Regular Expressions

Use the `-re` flag for regular expression matching:

```tcl
# Match using regular expressions
expect -re {password:?\s*$}

# Capture matched groups using expect_out
expect -re {User: (\w+)}
set captured_user $expect_out(1,string)
puts "Captured username: $captured_user"

# Complex regex example
expect -re {(\d+)\s+files?\s+copied}
set file_count $expect_out(1,string)
puts "Copied $file_count files"
```

### Exact String Matching

Use the `-exact` flag for literal string matching:

```tcl
# Match the exact string (no wildcards)
expect -exact "Do you want to continue? [y/n]"
```

### The expect_out Array

When a pattern matches, expect stores information in the `expect_out` array:

```tcl
# expect_out(0,string) - The entire matched string
# expect_out(1,string) through expect_out(9,string) - Captured groups (regex)
# expect_out(buffer) - All text received before the match

expect -re {Version: (\d+)\.(\d+)\.(\d+)}
set full_match $expect_out(0,string)
set major $expect_out(1,string)
set minor $expect_out(2,string)
set patch $expect_out(3,string)
puts "Version: $major.$minor.$patch"
```

### Pattern Matching Example Script

```tcl
#!/usr/bin/expect -f

# Script: pattern_demo.exp
# Purpose: Demonstrate various pattern matching techniques

set timeout 10

# Spawn a test interaction
spawn bash -c "echo 'Server version: 2.5.10'; echo 'Status: OK'; echo 'Enter command:'"

# Use regex to capture version
expect -re {version: (\d+)\.(\d+)\.(\d+)}
set major $expect_out(1,string)
set minor $expect_out(2,string)
set patch $expect_out(3,string)
puts "\nDetected version: $major.$minor.$patch"

# Use glob for status check
expect {
    "*Status: OK*" {
        puts "Server status is OK"
    }
    "*Status: ERROR*" {
        puts "Server has an error!"
        exit 1
    }
}

# Exact match for command prompt
expect -exact "Enter command:"
send "quit\r"

expect eof
puts "Pattern matching demo completed!"
```

---

## Timeout Handling

Proper timeout handling is crucial for robust expect scripts that do not hang indefinitely.

### Setting Timeouts

```tcl
# Set global timeout (in seconds)
set timeout 30

# Timeout of -1 means wait forever (use with caution)
set timeout -1

# Timeout of 0 means check immediately without waiting
set timeout 0
```

### Handling Timeout Events

```tcl
# Basic timeout handling
expect {
    "expected_pattern" {
        send "response\r"
    }
    timeout {
        puts "Operation timed out after $timeout seconds"
        exit 1
    }
}
```

### Dynamic Timeout Adjustment

```tcl
#!/usr/bin/expect -f

# Script: dynamic_timeout.exp
# Purpose: Demonstrate dynamic timeout adjustment

# Start with a short timeout for quick operations
set timeout 5

spawn ssh user@hostname

# Increase timeout for initial connection
set timeout 30
expect {
    "yes/no" {
        send "yes\r"
        exp_continue
    }
    "password:" {
        send "$password\r"
    }
    timeout {
        puts "Connection timed out"
        exit 1
    }
}

# Use shorter timeout for commands that should respond quickly
set timeout 10
expect "$ "
send "quick_command\r"

# Use longer timeout for potentially slow operations
set timeout 300
expect "$ "
send "long_running_backup_script.sh\r"

expect {
    "Backup completed" {
        puts "Backup successful"
    }
    timeout {
        puts "Backup operation timed out after 5 minutes"
        exit 1
    }
}

send "exit\r"
expect eof
```

### Timeout with Retry Logic

```tcl
#!/usr/bin/expect -f

# Script: retry_example.exp
# Purpose: Demonstrate retry logic with timeouts

set max_retries 3
set retry_count 0
set timeout 10

proc attempt_connection {host user password} {
    spawn ssh $user@$host

    expect {
        "yes/no" {
            send "yes\r"
            exp_continue
        }
        "password:" {
            send "$password\r"
        }
        timeout {
            return 0
        }
    }

    expect {
        "$ " {
            return 1
        }
        "Permission denied" {
            return 0
        }
        timeout {
            return 0
        }
    }
}

while {$retry_count < $max_retries} {
    puts "Connection attempt [expr $retry_count + 1] of $max_retries"

    if {[attempt_connection "hostname" "user" "password"]} {
        puts "Connection successful!"
        break
    }

    incr retry_count
    if {$retry_count < $max_retries} {
        puts "Retrying in 5 seconds..."
        sleep 5
    }
}

if {$retry_count >= $max_retries} {
    puts "Failed to connect after $max_retries attempts"
    exit 1
}
```

---

## Variables and Arguments

expect scripts support variables, command-line arguments, and environment variables for flexible automation.

### Command-Line Arguments

```tcl
#!/usr/bin/expect -f

# Script: args_demo.exp
# Purpose: Demonstrate command-line argument handling

# Access arguments using argv
# argc contains the number of arguments
# argv0 contains the script name
# argv is a list of all arguments

puts "Script name: $argv0"
puts "Number of arguments: $argc"
puts "All arguments: $argv"

# Access individual arguments by index
set first_arg [lindex $argv 0]
set second_arg [lindex $argv 1]

# Check if required arguments are provided
if {$argc < 2} {
    puts "Usage: $argv0 <hostname> <username> \[password\]"
    exit 1
}

set hostname [lindex $argv 0]
set username [lindex $argv 1]

# Optional argument with default value
if {$argc >= 3} {
    set password [lindex $argv 2]
} else {
    # Prompt for password if not provided
    stty -echo
    send_user "Enter password: "
    expect_user -re "(.*)\n"
    set password $expect_out(1,string)
    stty echo
    send_user "\n"
}

puts "Connecting to $hostname as $username"
```

### Environment Variables

```tcl
#!/usr/bin/expect -f

# Access environment variables using env array
set home_dir $env(HOME)
set current_user $env(USER)
set path $env(PATH)

# Check if an environment variable exists
if {[info exists env(MY_VAR)]} {
    set my_var $env(MY_VAR)
} else {
    set my_var "default_value"
}

# Use environment variable for password (more secure than command line)
if {[info exists env(SSH_PASSWORD)]} {
    set password $env(SSH_PASSWORD)
} else {
    puts "Error: SSH_PASSWORD environment variable not set"
    exit 1
}

puts "Home directory: $home_dir"
puts "Current user: $current_user"
```

### Tcl Variables and Data Types

```tcl
#!/usr/bin/expect -f

# String variables
set name "John Doe"
set greeting "Hello, $name!"

# Numeric variables
set count 10
set timeout 30

# Lists
set servers {server1 server2 server3}
set credentials [list "user1" "pass1" "user2" "pass2"]

# Accessing list elements
set first_server [lindex $servers 0]
set list_length [llength $servers]

# Arrays (associative)
array set config {
    hostname "myserver.com"
    port 22
    username "admin"
}

# Access array elements
puts "Hostname: $config(hostname)"
puts "Port: $config(port)"

# Iterate over array
foreach {key value} [array get config] {
    puts "$key = $value"
}

# String operations
set upper_name [string toupper $name]
set name_length [string length $name]
set contains_doe [string match "*Doe*" $name]
```

### Complete Variables Example

```tcl
#!/usr/bin/expect -f

# Script: multi_server.exp
# Purpose: Connect to multiple servers and run a command
# Usage: ./multi_server.exp "command to run"

# Configuration from environment variables
if {![info exists env(SSH_USER)]} {
    puts "Error: SSH_USER environment variable required"
    exit 1
}
if {![info exists env(SSH_PASSWORD)]} {
    puts "Error: SSH_PASSWORD environment variable required"
    exit 1
}

set ssh_user $env(SSH_USER)
set ssh_password $env(SSH_PASSWORD)

# Server list - could also come from a file or environment
set servers {
    192.168.1.10
    192.168.1.11
    192.168.1.12
}

# Get command from arguments
if {$argc < 1} {
    puts "Usage: $argv0 \"command to run\""
    exit 1
}
set command [lindex $argv 0]

# Timeout setting
set timeout 30

# Process each server
foreach server $servers {
    puts "\n========================================="
    puts "Connecting to $server"
    puts "========================================="

    spawn ssh $ssh_user@$server

    expect {
        "yes/no" {
            send "yes\r"
            exp_continue
        }
        "password:" {
            send "$ssh_password\r"
        }
        timeout {
            puts "Timeout connecting to $server"
            continue
        }
    }

    expect {
        "$ " {
            send "$command\r"
        }
        "Permission denied" {
            puts "Access denied to $server"
            continue
        }
        timeout {
            puts "Login timeout for $server"
            continue
        }
    }

    expect "$ "
    send "exit\r"
    expect eof

    puts "Completed: $server"
}

puts "\n========================================="
puts "All servers processed"
puts "========================================="
```

---

## Autoexpect for Generating Scripts

`autoexpect` is an invaluable tool that watches your interactive session and generates an expect script automatically.

### Basic Usage

```bash
# Start autoexpect - it will record everything you do
autoexpect

# Perform your interactive task manually
ssh user@hostname
# Enter password
# Run commands
exit

# autoexpect saves the script as script.exp by default
```

### Specify Output File

```bash
# Save to a specific file
autoexpect -f my_automation.exp

# Perform the interactive session
ftp ftp.example.com
# Enter credentials
# Run FTP commands
quit
```

### Autoexpect Options

```bash
# Common options:
autoexpect -f filename.exp    # Specify output file
autoexpect -p                 # Conservative mode (prompts only)
autoexpect -Q                 # Quote all expect patterns
autoexpect -c                 # Capture interactive session in real-time
```

### Cleaning Up Autoexpect Output

Autoexpect generates working scripts, but they often need cleanup. Here is an example of raw vs cleaned output:

**Raw autoexpect output:**

```tcl
#!/usr/bin/expect -f
set force_conservative 0
if {$force_conservative} {
    set send_slow {1 .1}
    proc send {ignore arg} {
        sleep .1
        exp_send -s -- $arg
    }
}
set timeout -1
spawn ssh user@hostname
match_max 100000
expect -exact "user@hostname's password: "
send -- "actualpassword\r"
expect -exact "\r
Last login: Mon Jan 15 10:30:00 2026\r
\r
"
expect "$ "
send -- "uptime\r"
expect "$ "
send -- "exit\r"
expect eof
```

**Cleaned up version:**

```tcl
#!/usr/bin/expect -f

# Script: ssh_uptime.exp
# Purpose: SSH to server and run uptime command
# Usage: ./ssh_uptime.exp <hostname> <username> <password>

# Arguments
set hostname [lindex $argv 0]
set username [lindex $argv 1]
set password [lindex $argv 2]

# Validation
if {$argc < 3} {
    puts "Usage: $argv0 hostname username password"
    exit 1
}

set timeout 30

spawn ssh $username@$hostname

expect {
    "yes/no" {
        send "yes\r"
        exp_continue
    }
    "password:" {
        send "$password\r"
    }
    timeout {
        puts "Connection timed out"
        exit 1
    }
}

expect {
    "$ " {
        # Successfully logged in
    }
    "Permission denied" {
        puts "Authentication failed"
        exit 1
    }
}

send "uptime\r"
expect "$ "

send "exit\r"
expect eof

puts "Script completed successfully"
```

### Autoexpect Tips

1. **Keep sessions short**: Record only what you need
2. **Use conservative mode** (`-p`): Generates cleaner scripts
3. **Always clean up**: Remove sensitive data like passwords
4. **Parameterize**: Replace hardcoded values with variables
5. **Add error handling**: Autoexpect does not add timeout handlers

---

## SSH Automation

One of the most common uses of expect is automating SSH connections and remote command execution.

### Basic SSH Connection

```tcl
#!/usr/bin/expect -f

# Script: ssh_connect.exp
# Purpose: Automate SSH connection
# Usage: ./ssh_connect.exp hostname username password

set hostname [lindex $argv 0]
set username [lindex $argv 1]
set password [lindex $argv 2]

if {$argc < 3} {
    puts "Usage: $argv0 hostname username password"
    exit 1
}

set timeout 30

spawn ssh $username@$hostname

expect {
    # Handle first-time connection (host key verification)
    "yes/no" {
        send "yes\r"
        exp_continue
    }
    # Handle password prompt
    "password:" {
        send "$password\r"
    }
    # Handle connection refused
    "Connection refused" {
        puts "Error: Connection refused by $hostname"
        exit 1
    }
    # Handle unreachable host
    "No route to host" {
        puts "Error: Cannot reach $hostname"
        exit 1
    }
    timeout {
        puts "Error: Connection timed out"
        exit 1
    }
}

# Wait for shell prompt
expect {
    -re {\$\s*$} {
        puts "Successfully connected to $hostname"
    }
    -re {#\s*$} {
        puts "Successfully connected to $hostname (as root)"
    }
    "Permission denied" {
        puts "Error: Authentication failed"
        exit 1
    }
    timeout {
        puts "Error: Timed out waiting for shell prompt"
        exit 1
    }
}

# Now you can send commands
send "hostname\r"
expect -re {\$\s*$|#\s*$}

send "exit\r"
expect eof
```

### Running Multiple Commands via SSH

```tcl
#!/usr/bin/expect -f

# Script: ssh_commands.exp
# Purpose: Run multiple commands on a remote server
# Usage: ./ssh_commands.exp hostname username password

set hostname [lindex $argv 0]
set username [lindex $argv 1]
set password [lindex $argv 2]

if {$argc < 3} {
    puts "Usage: $argv0 hostname username password"
    exit 1
}

set timeout 30

# Define commands to run
set commands {
    "uptime"
    "df -h"
    "free -m"
    "cat /etc/os-release | head -5"
}

spawn ssh $username@$hostname

expect {
    "yes/no" {
        send "yes\r"
        exp_continue
    }
    "password:" {
        send "$password\r"
    }
    timeout {
        puts "Connection timed out"
        exit 1
    }
}

expect {
    -re {\$\s*$|#\s*$} {}
    "Permission denied" {
        puts "Authentication failed"
        exit 1
    }
}

# Execute each command
foreach cmd $commands {
    puts "\n>>> Running: $cmd"
    puts "----------------------------------------"
    send "$cmd\r"
    expect -re {\$\s*$|#\s*$}
}

# Clean exit
send "exit\r"
expect eof

puts "\n========================================"
puts "All commands executed successfully"
puts "========================================"
```

### SSH Key-Based Authentication with Passphrase

```tcl
#!/usr/bin/expect -f

# Script: ssh_key_passphrase.exp
# Purpose: SSH using key-based auth with passphrase
# Usage: ./ssh_key_passphrase.exp hostname username passphrase

set hostname [lindex $argv 0]
set username [lindex $argv 1]
set passphrase [lindex $argv 2]

if {$argc < 3} {
    puts "Usage: $argv0 hostname username key_passphrase"
    exit 1
}

set timeout 30

spawn ssh $username@$hostname

expect {
    # Handle key passphrase
    "Enter passphrase for key*" {
        send "$passphrase\r"
    }
    "yes/no" {
        send "yes\r"
        exp_continue
    }
    timeout {
        puts "Connection timed out"
        exit 1
    }
}

expect {
    -re {\$\s*$|#\s*$} {
        puts "Connected successfully"
    }
    timeout {
        puts "Timed out waiting for prompt"
        exit 1
    }
}

# Interactive mode - hand control to the user
interact
```

### SCP File Transfer

```tcl
#!/usr/bin/expect -f

# Script: scp_transfer.exp
# Purpose: Automate SCP file transfers
# Usage: ./scp_transfer.exp local_file remote_host remote_user remote_path password

set local_file [lindex $argv 0]
set remote_host [lindex $argv 1]
set remote_user [lindex $argv 2]
set remote_path [lindex $argv 3]
set password [lindex $argv 4]

if {$argc < 5} {
    puts "Usage: $argv0 local_file remote_host remote_user remote_path password"
    exit 1
}

set timeout 300  ;# Longer timeout for file transfers

spawn scp $local_file $remote_user@$remote_host:$remote_path

expect {
    "yes/no" {
        send "yes\r"
        exp_continue
    }
    "password:" {
        send "$password\r"
    }
    timeout {
        puts "Error: Connection timed out"
        exit 1
    }
}

expect {
    "100%" {
        puts "File transferred successfully"
    }
    "Permission denied" {
        puts "Error: Authentication failed"
        exit 1
    }
    "No such file or directory" {
        puts "Error: File or path not found"
        exit 1
    }
    timeout {
        puts "Error: Transfer timed out"
        exit 1
    }
}

expect eof
puts "SCP transfer completed"
```

---

## Automating sudo Commands

Automating sudo commands requires careful handling of password prompts and security considerations.

### Basic sudo Automation

```tcl
#!/usr/bin/expect -f

# Script: sudo_command.exp
# Purpose: Run a command with sudo
# Usage: ./sudo_command.exp password command [args...]

set password [lindex $argv 0]
set command [lrange $argv 1 end]

if {$argc < 2} {
    puts "Usage: $argv0 password command \[args...\]"
    exit 1
}

set timeout 30

spawn sudo {*}$command

expect {
    -re "\\\[sudo\\\] password for.*:" {
        send "$password\r"
    }
    "password for*:" {
        send "$password\r"
    }
    timeout {
        puts "Error: Timed out waiting for sudo prompt"
        exit 1
    }
}

expect {
    "Sorry, try again" {
        puts "Error: Incorrect password"
        exit 1
    }
    "is not in the sudoers file" {
        puts "Error: User not in sudoers"
        exit 1
    }
    timeout {
        # Command is running, this is expected for some commands
    }
    eof {
        # Command completed
    }
}

# Wait for command to complete
expect eof

# Get exit status
catch wait result
set exit_status [lindex $result 3]

if {$exit_status == 0} {
    puts "Command completed successfully"
} else {
    puts "Command failed with exit status: $exit_status"
    exit $exit_status
}
```

### sudo with Interactive Programs

```tcl
#!/usr/bin/expect -f

# Script: sudo_interactive.exp
# Purpose: Run interactive programs with sudo (e.g., visudo, fdisk)
# Usage: ./sudo_interactive.exp password program [args...]

set password [lindex $argv 0]
set program [lrange $argv 1 end]

if {$argc < 2} {
    puts "Usage: $argv0 password program \[args...\]"
    exit 1
}

set timeout 30

spawn sudo {*}$program

expect {
    -re "\\\[sudo\\\] password for.*:" {
        send "$password\r"
    }
    timeout {
        puts "Error: Timed out waiting for sudo prompt"
        exit 1
    }
}

# Check for sudo errors
expect {
    "Sorry, try again" {
        puts "Error: Incorrect password"
        exit 1
    }
    -re ".*" {
        # Pass control to user for interactive session
    }
}

# Hand over to user for interactive input
interact
```

### sudo Inside SSH Session

```tcl
#!/usr/bin/expect -f

# Script: ssh_sudo.exp
# Purpose: SSH to remote server and run sudo commands
# Usage: ./ssh_sudo.exp hostname username ssh_password sudo_password command

set hostname [lindex $argv 0]
set username [lindex $argv 1]
set ssh_password [lindex $argv 2]
set sudo_password [lindex $argv 3]
set command [lindex $argv 4]

if {$argc < 5} {
    puts "Usage: $argv0 hostname username ssh_password sudo_password command"
    exit 1
}

set timeout 30

# Connect via SSH
spawn ssh $username@$hostname

expect {
    "yes/no" {
        send "yes\r"
        exp_continue
    }
    "password:" {
        send "$ssh_password\r"
    }
    timeout {
        puts "SSH connection timed out"
        exit 1
    }
}

expect {
    -re {\$\s*$} {}
    "Permission denied" {
        puts "SSH authentication failed"
        exit 1
    }
}

# Run sudo command
send "sudo $command\r"

expect {
    -re "\\\[sudo\\\] password for.*:" {
        send "$sudo_password\r"
    }
    -re {\$\s*$} {
        # Sudo didn't ask for password (cached credentials)
    }
    timeout {
        puts "Timed out waiting for sudo prompt"
        exit 1
    }
}

expect {
    "Sorry, try again" {
        puts "Sudo authentication failed"
        exit 1
    }
    -re {\$\s*$} {
        puts "Command completed"
    }
    timeout {
        # Long-running command
    }
}

send "exit\r"
expect eof
puts "Session completed"
```

---

## Error Handling

Robust error handling is essential for production-quality expect scripts.

### Basic Error Handling

```tcl
#!/usr/bin/expect -f

# Script: error_handling.exp
# Purpose: Demonstrate comprehensive error handling

set timeout 30

# Define error codes
set ERROR_TIMEOUT 1
set ERROR_AUTH 2
set ERROR_CONNECTION 3
set ERROR_COMMAND 4

# Error handling procedure
proc handle_error {error_code message} {
    global ERROR_TIMEOUT ERROR_AUTH ERROR_CONNECTION ERROR_COMMAND

    send_error "ERROR: $message\n"

    # Log error if logging is enabled
    if {[info exists ::logfile]} {
        send_log "ERROR \[$error_code\]: $message\n"
    }

    exit $error_code
}

# Safe spawn procedure
proc safe_spawn {args} {
    if {[catch {spawn {*}$args} result]} {
        handle_error 3 "Failed to spawn: $result"
    }
}

# Example usage
set hostname "testserver"
set username "testuser"
set password "testpass"

# Safely spawn SSH
safe_spawn ssh $username@$hostname

expect {
    "yes/no" {
        send "yes\r"
        exp_continue
    }
    "password:" {
        send "$password\r"
    }
    "Connection refused" {
        handle_error $ERROR_CONNECTION "Connection refused by $hostname"
    }
    "No route to host" {
        handle_error $ERROR_CONNECTION "Cannot reach $hostname"
    }
    "Name or service not known" {
        handle_error $ERROR_CONNECTION "Unknown host: $hostname"
    }
    timeout {
        handle_error $ERROR_TIMEOUT "Connection to $hostname timed out"
    }
    eof {
        handle_error $ERROR_CONNECTION "Connection closed unexpectedly"
    }
}

expect {
    -re {\$\s*$} {
        # Success
    }
    "Permission denied" {
        handle_error $ERROR_AUTH "Authentication failed for $username@$hostname"
    }
    timeout {
        handle_error $ERROR_TIMEOUT "Timed out waiting for shell prompt"
    }
}

puts "Successfully connected!"
```

### Using try-catch Equivalent

```tcl
#!/usr/bin/expect -f

# Script: try_catch.exp
# Purpose: Demonstrate Tcl error handling with catch

proc run_remote_command {host user pass cmd} {
    set timeout 30

    # Use catch to handle errors
    if {[catch {
        spawn ssh $user@$host

        expect {
            "yes/no" {
                send "yes\r"
                exp_continue
            }
            "password:" {
                send "$pass\r"
            }
            timeout {
                error "Connection timeout"
            }
        }

        expect {
            -re {\$\s*$} {}
            "Permission denied" {
                error "Authentication failed"
            }
        }

        send "$cmd\r"
        expect -re {\$\s*$}

        send "exit\r"
        expect eof

    } errmsg]} {
        # Error occurred
        return [list 0 $errmsg]
    }

    # Success
    return [list 1 "Command executed successfully"]
}

# Usage
set result [run_remote_command "hostname" "user" "pass" "uptime"]
set success [lindex $result 0]
set message [lindex $result 1]

if {$success} {
    puts "SUCCESS: $message"
} else {
    puts "FAILED: $message"
    exit 1
}
```

### Logging for Debugging

```tcl
#!/usr/bin/expect -f

# Script: logging_example.exp
# Purpose: Demonstrate logging capabilities

# Enable logging to file
log_file -a expect_debug.log

# Log start time
set timestamp [clock format [clock seconds] -format "%Y-%m-%d %H:%M:%S"]
send_log "========================================\n"
send_log "Script started at: $timestamp\n"
send_log "========================================\n"

# Enable debug mode (shows internal expect operations)
# Uncomment for detailed debugging:
# exp_internal 1

set timeout 30

spawn ssh user@hostname

# Log what we're doing
send_log "Attempting SSH connection...\n"

expect {
    "yes/no" {
        send_log "Host key verification requested\n"
        send "yes\r"
        exp_continue
    }
    "password:" {
        send_log "Password prompt received\n"
        send "password\r"
    }
    timeout {
        send_log "ERROR: Connection timed out\n"
        exit 1
    }
}

expect {
    -re {\$\s*$} {
        send_log "Successfully logged in\n"
    }
    "Permission denied" {
        send_log "ERROR: Authentication failed\n"
        exit 1
    }
}

send "exit\r"
expect eof

set end_timestamp [clock format [clock seconds] -format "%Y-%m-%d %H:%M:%S"]
send_log "Script completed at: $end_timestamp\n"

puts "Check expect_debug.log for details"
```

### Exit Status Handling

```tcl
#!/usr/bin/expect -f

# Script: exit_status.exp
# Purpose: Properly handle and propagate exit statuses

set timeout 30

spawn bash -c "ls /nonexistent_directory"

expect eof

# Get the exit status of the spawned process
catch wait result

# result is a list: {pid spawn_id os_error_flag exit_status}
set pid [lindex $result 0]
set spawn_id_result [lindex $result 1]
set os_error [lindex $result 2]
set exit_status [lindex $result 3]

puts "Process ID: $pid"
puts "OS Error Flag: $os_error"
puts "Exit Status: $exit_status"

if {$os_error == -1} {
    puts "Operating system error occurred"
    exit 1
} elseif {$exit_status != 0} {
    puts "Command failed with exit status $exit_status"
    exit $exit_status
} else {
    puts "Command completed successfully"
    exit 0
}
```

---

## Security Considerations

When automating interactive commands, especially those involving credentials, security must be a top priority.

### Never Hardcode Passwords

```tcl
#!/usr/bin/expect -f

# BAD - Never do this!
# set password "mySecretPassword123"

# GOOD - Use environment variables
if {![info exists env(MY_PASSWORD)]} {
    puts "Error: MY_PASSWORD environment variable not set"
    exit 1
}
set password $env(MY_PASSWORD)

# GOOD - Use command line arguments (with caveats)
# Note: Arguments may be visible in process listings
set password [lindex $argv 0]

# BETTER - Read from a secure file
proc read_password_file {filepath} {
    if {[catch {open $filepath r} fh]} {
        puts "Error: Cannot open password file"
        exit 1
    }
    set password [string trim [read $fh]]
    close $fh
    return $password
}
set password [read_password_file "~/.my_secure_password"]

# BEST - Prompt interactively (for non-automated scenarios)
proc prompt_password {} {
    stty -echo
    send_user "Enter password: "
    expect_user -re "(.*)\n"
    set password $expect_out(1,string)
    stty echo
    send_user "\n"
    return $password
}
```

### Secure File Permissions

```bash
# Set restrictive permissions on expect scripts containing sensitive logic
chmod 700 my_script.exp

# If using password files, ensure they're protected
chmod 600 ~/.my_password_file

# Ensure the script is owned by the correct user
chown $(whoami) my_script.exp
```

### Disable Logging for Sensitive Operations

```tcl
#!/usr/bin/expect -f

# Enable logging for general operations
log_file script.log

# ... some operations ...

# Disable logging before handling sensitive data
log_file

# Handle password
expect "password:"
send "$password\r"

# Re-enable logging
log_file -a script.log

# ... continue with non-sensitive operations ...
```

### Secure Script Example

```tcl
#!/usr/bin/expect -f

# Script: secure_ssh.exp
# Purpose: Demonstrate security best practices
# Usage: SSH_PASSWORD=xxx ./secure_ssh.exp hostname username

# =====================================================
# Security Configuration
# =====================================================

# Disable core dumps (prevents password from being dumped to disk)
# This should be done at the system level, but we check here
if {[catch {exec ulimit -c 0}]} {
    # Not critical if this fails
}

# =====================================================
# Credential Handling
# =====================================================

# Method 1: Environment variable (recommended for automation)
if {[info exists env(SSH_PASSWORD)]} {
    set password $env(SSH_PASSWORD)
    # Clear from environment immediately after reading
    unset env(SSH_PASSWORD)
} else {
    # Method 2: Interactive prompt (for manual runs)
    stty -echo
    send_user "Enter SSH password: "
    expect_user -re "(.*)\n"
    set password $expect_out(1,string)
    stty echo
    send_user "\n"
}

# Validate arguments
if {$argc < 2} {
    puts "Usage: SSH_PASSWORD=xxx $argv0 hostname username"
    exit 1
}

set hostname [lindex $argv 0]
set username [lindex $argv 1]

# =====================================================
# Logging Configuration
# =====================================================

# Log to file, but be careful with sensitive data
set log_dir "/var/log/expect_scripts"
if {[file isdirectory $log_dir]} {
    log_file -a "$log_dir/[clock format [clock seconds] -format %Y%m%d].log"
}

# =====================================================
# Connection
# =====================================================

set timeout 30

spawn ssh $username@$hostname

# Temporarily disable logging for credential exchange
log_file

expect {
    "yes/no" {
        send "yes\r"
        exp_continue
    }
    "password:" {
        send "$password\r"
    }
    timeout {
        puts "Connection timed out"
        exit 1
    }
}

# Clear password from memory (Tcl strings are immutable, so this helps)
set password "XXXXXXXXXXXXXXXX"
unset password

# Re-enable logging
if {[file isdirectory $log_dir]} {
    log_file -a "$log_dir/[clock format [clock seconds] -format %Y%m%d].log"
}

expect {
    -re {\$\s*$} {
        send_log "Successfully connected to $hostname\n"
    }
    "Permission denied" {
        puts "Authentication failed"
        exit 1
    }
}

# Run commands
send "whoami\r"
expect -re {\$\s*$}

send "exit\r"
expect eof

puts "Session completed securely"
```

### Security Checklist

1. **Never hardcode credentials** in scripts
2. **Use environment variables** or secure credential stores
3. **Set restrictive file permissions** (700 for scripts, 600 for config files)
4. **Disable logging** during credential transmission
5. **Clear sensitive variables** after use
6. **Avoid passing passwords** as command-line arguments when possible
7. **Use SSH keys** instead of passwords where possible
8. **Implement timeout handling** to prevent hung sessions
9. **Validate all inputs** before using them
10. **Log security events** for auditing (without logging credentials)

---

## Complete Example Scripts

### Example 1: Automated System Health Check

```tcl
#!/usr/bin/expect -f

# Script: health_check.exp
# Purpose: Connect to multiple servers and perform health checks
# Usage: SSH_PASSWORD=xxx ./health_check.exp

# =====================================================
# Configuration
# =====================================================

# Server list
set servers {
    "192.168.1.10"
    "192.168.1.11"
    "192.168.1.12"
}

# SSH credentials
set username "admin"

if {![info exists env(SSH_PASSWORD)]} {
    puts "Error: SSH_PASSWORD environment variable required"
    exit 1
}
set password $env(SSH_PASSWORD)

# Health check commands
set health_checks {
    {"uptime" "System Uptime"}
    {"df -h / | tail -1" "Root Disk Usage"}
    {"free -m | grep Mem" "Memory Usage"}
    {"systemctl is-system-running" "System Status"}
}

# =====================================================
# Procedures
# =====================================================

proc check_server {host user pass checks} {
    set timeout 30
    set results {}

    # Connect to server
    spawn ssh $user@$host

    expect {
        "yes/no" {
            send "yes\r"
            exp_continue
        }
        "password:" {
            send "$pass\r"
        }
        timeout {
            return [list 0 "Connection timeout"]
        }
    }

    expect {
        -re {\$\s*$|#\s*$} {}
        "Permission denied" {
            return [list 0 "Authentication failed"]
        }
        timeout {
            return [list 0 "Login timeout"]
        }
    }

    # Run health checks
    foreach check $checks {
        set cmd [lindex $check 0]
        set desc [lindex $check 1]

        send "$cmd\r"
        expect {
            -re {(.*)\r\n.*[\$#]\s*$} {
                set output $expect_out(1,string)
                lappend results [list $desc $output]
            }
            timeout {
                lappend results [list $desc "TIMEOUT"]
            }
        }
    }

    send "exit\r"
    expect eof

    return [list 1 $results]
}

proc print_report {host results} {
    puts "\n================================================"
    puts "Health Report: $host"
    puts "================================================"

    foreach result $results {
        set desc [lindex $result 0]
        set output [lindex $result 1]
        puts "\n$desc:"
        puts "  $output"
    }
}

# =====================================================
# Main Execution
# =====================================================

puts "========================================"
puts "Server Health Check Report"
puts "Time: [clock format [clock seconds]]"
puts "========================================"

set failed_servers {}

foreach server $servers {
    puts "\nChecking $server..."

    set result [check_server $server $username $password $health_checks]
    set success [lindex $result 0]
    set data [lindex $result 1]

    if {$success} {
        print_report $server $data
    } else {
        puts "  FAILED: $data"
        lappend failed_servers $server
    }
}

puts "\n========================================"
puts "Summary"
puts "========================================"
puts "Total servers: [llength $servers]"
puts "Successful: [expr [llength $servers] - [llength $failed_servers]]"
puts "Failed: [llength $failed_servers]"

if {[llength $failed_servers] > 0} {
    puts "\nFailed servers:"
    foreach server $failed_servers {
        puts "  - $server"
    }
    exit 1
}

puts "\nAll health checks completed successfully!"
exit 0
```

### Example 2: Automated MySQL Database Backup

```tcl
#!/usr/bin/expect -f

# Script: mysql_backup.exp
# Purpose: Automate MySQL database backup via SSH
# Usage: SSH_PASSWORD=xxx MYSQL_PASSWORD=xxx ./mysql_backup.exp hostname dbname

# =====================================================
# Configuration
# =====================================================

if {$argc < 2} {
    puts "Usage: SSH_PASSWORD=xxx MYSQL_PASSWORD=xxx $argv0 hostname dbname"
    exit 1
}

set db_host [lindex $argv 0]
set db_name [lindex $argv 1]

# Credentials from environment
if {![info exists env(SSH_PASSWORD)]} {
    puts "Error: SSH_PASSWORD environment variable required"
    exit 1
}
if {![info exists env(MYSQL_PASSWORD)]} {
    puts "Error: MYSQL_PASSWORD environment variable required"
    exit 1
}

set ssh_password $env(SSH_PASSWORD)
set mysql_password $env(MYSQL_PASSWORD)

set ssh_user "backup"
set mysql_user "backup"

# Backup settings
set backup_dir "/backup/mysql"
set timestamp [clock format [clock seconds] -format "%Y%m%d_%H%M%S"]
set backup_file "${db_name}_${timestamp}.sql.gz"

# =====================================================
# Main Script
# =====================================================

set timeout 60

puts "Starting MySQL backup..."
puts "Database: $db_name"
puts "Server: $db_host"
puts "Backup file: $backup_file"

# Connect via SSH
spawn ssh $ssh_user@$db_host

expect {
    "yes/no" {
        send "yes\r"
        exp_continue
    }
    "password:" {
        send "$ssh_password\r"
    }
    timeout {
        puts "Error: SSH connection timeout"
        exit 1
    }
}

expect {
    -re {\$\s*$} {}
    "Permission denied" {
        puts "Error: SSH authentication failed"
        exit 1
    }
}

# Create backup directory if needed
send "mkdir -p $backup_dir\r"
expect -re {\$\s*$}

# Run mysqldump (increase timeout for large databases)
set timeout 3600

puts "Running mysqldump (this may take a while)..."

send "mysqldump -u $mysql_user -p $db_name | gzip > $backup_dir/$backup_file\r"

expect {
    "Enter password:" {
        send "$mysql_password\r"
    }
    timeout {
        puts "Error: mysqldump timeout"
        exit 1
    }
}

expect {
    -re {\$\s*$} {
        puts "Backup command completed"
    }
    "Access denied" {
        puts "Error: MySQL authentication failed"
        exit 1
    }
    "Unknown database" {
        puts "Error: Database '$db_name' not found"
        exit 1
    }
    timeout {
        puts "Error: Backup timeout (database too large?)"
        exit 1
    }
}

# Verify backup was created
set timeout 30
send "ls -la $backup_dir/$backup_file\r"

expect {
    -re {(\d+)\s+\w+\s+\d+\s+\d+:\d+} {
        puts "Backup file created successfully"
    }
    "No such file" {
        puts "Error: Backup file was not created"
        exit 1
    }
}

expect -re {\$\s*$}

# Get file size
send "du -h $backup_dir/$backup_file | cut -f1\r"
expect -re {([0-9.]+[KMGT]?)\s*\r}
set file_size $expect_out(1,string)
expect -re {\$\s*$}

# Cleanup old backups (keep last 7)
send "ls -t $backup_dir/${db_name}_*.sql.gz | tail -n +8 | xargs -r rm\r"
expect -re {\$\s*$}

send "exit\r"
expect eof

puts "========================================"
puts "Backup completed successfully!"
puts "File: $backup_dir/$backup_file"
puts "Size: $file_size"
puts "========================================"

exit 0
```

### Example 3: Interactive Menu-Driven Script

```tcl
#!/usr/bin/expect -f

# Script: server_manager.exp
# Purpose: Interactive menu for common server management tasks
# Usage: SSH_PASSWORD=xxx ./server_manager.exp hostname

# =====================================================
# Configuration
# =====================================================

if {$argc < 1} {
    puts "Usage: SSH_PASSWORD=xxx $argv0 hostname"
    exit 1
}

set hostname [lindex $argv 0]
set username "admin"

if {![info exists env(SSH_PASSWORD)]} {
    puts "Error: SSH_PASSWORD environment variable required"
    exit 1
}
set password $env(SSH_PASSWORD)

# =====================================================
# Procedures
# =====================================================

proc connect_ssh {host user pass} {
    set timeout 30

    spawn ssh $user@$host

    expect {
        "yes/no" {
            send "yes\r"
            exp_continue
        }
        "password:" {
            send "$pass\r"
        }
        timeout {
            puts "Connection timeout"
            return 0
        }
    }

    expect {
        -re {\$\s*$|#\s*$} {
            return 1
        }
        "Permission denied" {
            puts "Authentication failed"
            return 0
        }
    }
}

proc run_command {cmd} {
    send "$cmd\r"
    expect -re {\$\s*$|#\s*$}
}

proc show_menu {} {
    puts "\n========================================"
    puts "Server Management Menu"
    puts "========================================"
    puts "1. Show system information"
    puts "2. Check disk usage"
    puts "3. Check memory usage"
    puts "4. Show running processes (top 10)"
    puts "5. Restart a service"
    puts "6. View system logs"
    puts "7. Check network connections"
    puts "8. Exit"
    puts "========================================"
    send_user "Enter choice (1-8): "
}

# =====================================================
# Main Script
# =====================================================

puts "Connecting to $hostname..."

if {![connect_ssh $hostname $username $password]} {
    exit 1
}

puts "Connected successfully!"

# Main loop
while {1} {
    show_menu

    expect_user -re "(.*)\n"
    set choice [string trim $expect_out(1,string)]

    switch $choice {
        1 {
            puts "\n--- System Information ---"
            run_command "uname -a"
            run_command "cat /etc/os-release | head -5"
            run_command "uptime"
        }
        2 {
            puts "\n--- Disk Usage ---"
            run_command "df -h"
        }
        3 {
            puts "\n--- Memory Usage ---"
            run_command "free -h"
        }
        4 {
            puts "\n--- Top Processes ---"
            run_command "ps aux --sort=-%cpu | head -11"
        }
        5 {
            send_user "Enter service name: "
            expect_user -re "(.*)\n"
            set service [string trim $expect_out(1,string)]
            puts "\nRestarting $service..."
            send "sudo systemctl restart $service\r"
            expect {
                "password" {
                    send "$password\r"
                    exp_continue
                }
                -re {\$\s*$|#\s*$} {}
            }
            run_command "sudo systemctl status $service | head -10"
        }
        6 {
            puts "\n--- Recent System Logs ---"
            run_command "sudo journalctl -n 20 --no-pager"
        }
        7 {
            puts "\n--- Network Connections ---"
            run_command "ss -tuln"
        }
        8 {
            puts "\nDisconnecting..."
            send "exit\r"
            expect eof
            puts "Goodbye!"
            exit 0
        }
        default {
            puts "Invalid choice. Please enter 1-8."
        }
    }
}
```

---

## Summary

In this guide, you learned how to use expect on Ubuntu to automate interactive command-line programs. Key takeaways include:

- **expect fundamentals**: spawn, expect, and send commands work together to automate interactive sessions
- **Pattern matching**: Use glob patterns, regular expressions, or exact strings to match program output
- **Timeout handling**: Always implement proper timeout handling to prevent scripts from hanging
- **Variables and arguments**: Make scripts flexible with command-line arguments and environment variables
- **autoexpect**: Use this tool to quickly generate expect scripts from interactive sessions
- **SSH automation**: Automate remote server management, file transfers, and multi-server operations
- **sudo automation**: Handle privilege escalation in your automated scripts
- **Error handling**: Build robust scripts with proper error detection and recovery
- **Security**: Protect credentials and follow security best practices

expect is an invaluable tool for system administrators and DevOps engineers who need to automate tasks that would otherwise require human interaction. By mastering expect, you can save countless hours of repetitive work and build more reliable automation workflows.

---

## Monitor Your Automated Tasks with OneUptime

Once you have automated your interactive commands with expect, you need visibility into whether those scripts are running successfully. **OneUptime** provides comprehensive monitoring capabilities that help you track the health and performance of your automated tasks:

- **Custom Script Monitoring**: Monitor the execution and exit status of your expect scripts
- **Server Monitoring**: Keep track of the servers your scripts connect to
- **Alert Management**: Get notified immediately when automated tasks fail
- **Log Aggregation**: Centralize logs from all your expect scripts for easy debugging
- **Status Pages**: Communicate automation system status to your team
- **Incident Management**: Track and resolve issues with your automated workflows

Whether you are automating backups, deployments, or system maintenance tasks, OneUptime ensures you know when something goes wrong before it impacts your operations.

Visit [https://oneuptime.com](https://oneuptime.com) to start monitoring your automation infrastructure today.
