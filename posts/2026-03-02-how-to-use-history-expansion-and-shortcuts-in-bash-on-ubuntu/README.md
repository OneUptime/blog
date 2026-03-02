# How to Use History Expansion and Shortcuts in Bash on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bash, Shell, Linux, Productivity

Description: Master Bash history expansion, keyboard shortcuts, and readline bindings on Ubuntu to navigate and reuse previous commands efficiently and avoid repetitive typing.

---

Bash keeps a record of every command you run. Knowing how to navigate and reuse that history is one of the biggest efficiency gains available to anyone who spends time at a terminal.

## Viewing Command History

```bash
# Print the full history list
history

# Show last 20 commands
history 20

# Search history for a pattern
history | grep docker

# Show history with timestamps (requires HISTTIMEFORMAT to be set)
HISTTIMEFORMAT="%F %T " history
```

## Keyboard Shortcuts for History Navigation

These shortcuts work in the default readline editing mode (Emacs-style):

```
Ctrl+R     - Reverse search: type to search backwards through history
Ctrl+S     - Forward search (may conflict with terminal flow control)
Up arrow   - Previous command
Down arrow - Next command
Ctrl+P     - Previous command (same as Up)
Ctrl+N     - Next command (same as Down)
Ctrl+G     - Cancel reverse search, restore current line
```

### Using Ctrl+R

`Ctrl+R` is the most powerful history shortcut. Press it, start typing, and Bash finds the most recent matching command:

```
(reverse-i-search)`dock': docker ps -a --format "table {{.Names}}\t{{.Status}}"
```

Press `Ctrl+R` again to go further back to the next match. Press `Enter` to run the found command, or right arrow / `Ctrl+E` to edit it first.

### Fixing Flow Control Conflicts

If `Ctrl+S` freezes your terminal (XON/XOFF flow control), disable it:

```bash
# In ~/.bashrc
stty -ixon
```

## History Expansion with !

History expansion lets you reference previous commands using `!` (bang) syntax.

### Reference by Number

```bash
# Run command number 42 from history
!42

# Run the command 3 entries before the current one
!-3
```

### Reference the Last Command

```bash
# Re-run the previous command
!!

# Common use: re-run with sudo
sudo !!

# Run previous command and append something
!! | grep error
```

### Reference by Name

```bash
# Re-run the most recent command starting with "git"
!git

# Re-run the most recent command starting with "ssh"
!ssh

# Re-run the most recent "sudo apt" command
!sudo apt
```

Be careful with name-based expansion - it runs the command immediately. Use `:p` to preview first:

```bash
# Print what !git would run without executing it
!git:p
```

## Word Designators - Extracting Parts of Commands

After the `!` event designator, you can specify which word from the command to use:

```
!!      - the entire previous command
!!:0    - the command name only (first word)
!!:1    - first argument
!!:2    - second argument
!!:$    - last argument
!!:*    - all arguments (everything after command name)
!!:2-4  - words 2 through 4
```

The shorthand `!$` means the last argument of the previous command. This is extremely useful:

```bash
# Create a directory and enter it
mkdir /var/www/myproject
cd !$    # cd /var/www/myproject

# Create a file and immediately edit it
touch /etc/nginx/sites-available/mysite.conf
vim !$   # vim /etc/nginx/sites-available/mysite.conf

# Check what you just compiled
gcc -o myprogram myprogram.c
./!$     # ./myprogram
```

The shorthand `!^` means the first argument:

```bash
# Copy a file to backup, then edit the original
cp important.conf important.conf.bak
vim !^   # vim important.conf
```

## Substitution with ^

Quick substitution lets you re-run the previous command with a word replaced:

```bash
# Run a command with a typo
cat /etc/nignx/nginx.conf

# Fix the typo and re-run
^nignx^nginx
# Expands to: cat /etc/nginx/nginx.conf
```

For replacing all occurrences:

```bash
# !!:gs/old/new/ replaces globally
echo hello world hello
!!:gs/hello/goodbye
# Expands to: echo goodbye world goodbye
```

## Line Editing Shortcuts (readline)

Beyond history navigation, these shortcuts speed up editing the current command:

### Cursor Movement

```
Ctrl+A     - Move to beginning of line
Ctrl+E     - Move to end of line
Alt+F      - Move forward one word
Alt+B      - Move backward one word
Ctrl+F     - Move forward one character
Ctrl+B     - Move backward one character
```

### Editing

```
Ctrl+K     - Delete from cursor to end of line (kill)
Ctrl+U     - Delete from cursor to beginning of line
Ctrl+W     - Delete word before cursor
Alt+D      - Delete word after cursor
Ctrl+Y     - Paste (yank) the last killed text
Ctrl+D     - Delete character under cursor (also closes terminal if line is empty)
Ctrl+H     - Delete character before cursor (same as Backspace)
```

### Case Modification

```
Alt+U      - Uppercase word from cursor
Alt+L      - Lowercase word from cursor
Alt+C      - Capitalize word from cursor
```

### Miscellaneous

```
Ctrl+T     - Swap current character with previous (fix typos)
Alt+T      - Swap current word with previous word
Ctrl+L     - Clear screen (like 'clear' command)
Ctrl+_     - Undo last edit
Ctrl+X Ctrl+E  - Open current command in $EDITOR for complex editing
```

## Configuring History Behavior

Control how history works in `~/.bashrc`:

```bash
# History file location (default is ~/.bash_history)
HISTFILE=~/.bash_history

# How many lines to keep in memory
HISTSIZE=10000

# How many lines to save to the history file
HISTFILESIZE=20000

# Avoid duplicates in history
HISTCONTROL=ignoredups

# Ignore both duplicates and lines starting with a space
HISTCONTROL=ignoreboth

# Append to history file instead of overwriting on exit
shopt -s histappend

# Include timestamps in history
HISTTIMEFORMAT="%F %T "

# Commands to exclude from history (colon-separated patterns)
HISTIGNORE="ls:ll:cd:pwd:exit:history:clear"
```

A space before a command also keeps it out of history when `HISTCONTROL=ignorespace` or `ignoreboth` is set:

```bash
#  This command is NOT saved to history (note the leading space)
 echo "my-secret-password"
```

## Sharing History Across Sessions

By default, each terminal session writes history only when it exits, so parallel sessions overwrite each other's history. Fix this with PROMPT_COMMAND:

```bash
# In ~/.bashrc - append new history after every command
PROMPT_COMMAND="history -a; history -c; history -r; $PROMPT_COMMAND"

# Explanation:
# history -a  append new history to file
# history -c  clear current session history
# history -r  re-read history file (includes other sessions)
```

## Searching History with fzf

The `fzf` fuzzy finder greatly improves history search:

```bash
# Install fzf
sudo apt install fzf

# Source bash integration
source /usr/share/doc/fzf/examples/key-bindings.bash

# Now Ctrl+R uses fzf for interactive fuzzy history search
```

With `fzf`, pressing `Ctrl+R` opens an interactive list where you can type to fuzzy-match any part of a previous command.

## Summary of Most Useful Shortcuts

```
Ctrl+R     - Search history
!!         - Last command
!$         - Last argument of last command
!^         - First argument of last command
!word      - Most recent command starting with 'word'
^old^new   - Replace in last command
Ctrl+A/E   - Start/end of line
Ctrl+W     - Delete word back
Ctrl+K     - Delete to end of line
Ctrl+U     - Delete to start of line
Ctrl+Y     - Paste killed text
```

These shortcuts compound over time. Even learning half of them will noticeably reduce keystrokes in an average terminal session.
