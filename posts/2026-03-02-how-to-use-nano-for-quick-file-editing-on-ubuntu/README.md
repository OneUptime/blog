# How to Use Nano for Quick File Editing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Nano, Text Editors, Linux, Command Line

Description: Learn how to use the nano text editor on Ubuntu for quick file editing, covering navigation, search, cut and paste, configuration, and keyboard shortcuts.

---

Nano is the text editor that requires no learning curve for basic editing. Unlike Vim or Emacs, you can open a file in nano and immediately start typing. The keyboard shortcuts are displayed at the bottom of the screen, making it approachable for occasional use and ideal for quick edits to configuration files.

## Installing Nano

Nano is installed by default on Ubuntu. If it is missing:

```bash
# Install nano
sudo apt update
sudo apt install nano

# Check version
nano --version
```

## Opening Files

```bash
# Open a file for editing
nano /etc/nginx/nginx.conf

# Open with root privileges for system files
sudo nano /etc/hosts

# Open at a specific line number
nano +42 filename.txt

# Open at a specific line and column
nano +42,10 filename.txt

# Create a new file (if the file doesn't exist, nano creates it on save)
nano newfile.txt

# Open multiple files (navigate between them with Alt+< and Alt+>)
nano file1.txt file2.txt
```

## The Nano Interface

When you open nano, the screen shows:
- Top bar: version info and filename
- Main area: file contents
- Bottom two rows: keyboard shortcuts

The `^` symbol means `Ctrl`, and `M-` means `Alt` (or sometimes `Esc`).

## Basic Navigation

```
Arrow keys     - Move cursor
Ctrl+A         - Go to beginning of line
Ctrl+E         - Go to end of line
Ctrl+F         - Move forward one character
Ctrl+B         - Move backward one character
Ctrl+P         - Move to previous line
Ctrl+N         - Move to next line
Ctrl+V         - Page down
Ctrl+Y         - Page up
Ctrl+_         - Go to a specific line number (prompt appears)
Alt+\          - Go to first line
Alt+/          - Go to last line
```

Word-by-word movement:

```
Ctrl+Space     - Move forward one word
Alt+Space      - Move backward one word
```

## Saving and Exiting

```
Ctrl+O         - Write (save) file without exiting
Ctrl+X         - Exit (prompts to save if modified)
```

When you press `Ctrl+X` on a modified file, nano asks:
```
Save modified buffer?
Y Yes
N No
^C Cancel
```

Press `Y`, then `Enter` to confirm the filename, or `N` to discard changes.

## Cutting, Copying, and Pasting

Nano uses its own cut/copy buffer:

```
Ctrl+K         - Cut (kill) current line
Alt+6          - Copy current line (without cutting)
Ctrl+U         - Paste (uncut) previously cut text
```

For selecting a range:

```
Ctrl+6         - Mark start of selection (toggle mark)
  (then move cursor to end of selection)
Ctrl+K         - Cut selected text
Alt+6          - Copy selected text
Ctrl+U         - Paste
```

Practical workflow:

```
1. Move to the start of what you want to copy
2. Press Ctrl+6 to set mark
3. Move to the end of the selection
4. Press Alt+6 to copy (or Ctrl+K to cut)
5. Move to destination
6. Press Ctrl+U to paste
```

## Searching and Replacing

### Search

```
Ctrl+W         - Start search (forward)
```

After pressing `Ctrl+W`, type your search term and press `Enter`. Press `Ctrl+W` again to search for the next occurrence (the previous term is remembered).

Search options after pressing `Ctrl+W`:
- `Ctrl+R` - Toggle replace mode
- `Alt+C` - Toggle case sensitivity
- `Alt+R` - Toggle regular expressions

### Find and Replace

```
Ctrl+\         - Find and replace
```

Nano prompts for search term, then replacement term, then asks for each match:
```
Y        - Replace this occurrence
N        - Skip
A        - Replace all remaining
Ctrl+C   - Cancel
```

```
# Replace case-insensitively by first pressing Alt+C to toggle case sensitivity
Ctrl+\ then (search term) then (replacement)
```

## Undo and Redo

```
Alt+U          - Undo last action
Alt+E          - Redo
```

Nano supports multiple undo levels.

## Working with Multiple Files

```
Ctrl+R         - Insert another file into current file at cursor position
Alt+>          - Switch to next file buffer
Alt+<          - Switch to previous file buffer
```

## Spell Checking

```
Ctrl+T         - Run spell checker (requires spell or aspell installed)
```

```bash
# Install spell checking
sudo apt install spell
# or
sudo apt install aspell aspell-en
```

## Customizing Nano with ~/.nanorc

The configuration file at `~/.nanorc` persists settings across sessions:

```bash
# Create or edit nanorc
nano ~/.nanorc
```

Useful settings:

```
## ~/.nanorc

# Show line numbers
set linenumbers

# Enable syntax highlighting
include "/usr/share/nano/*.nanorc"

# Show cursor position constantly
set constantshow

# Enable soft word wrapping
set softwrap

# Set tab width to 4 spaces
set tabsize 4

# Convert tabs to spaces
set tabstospaces

# Enable autoindent
set autoindent

# Enable mouse support
set mouse

# Turn off the welcome message
set nohelp

# Case-sensitive search by default
set casesensitive

# Enable undo history
set historylog

# Set backup files (adds ~ to filename)
set backup

# Show whitespace characters
set whitespace "»·"
```

### Enabling Syntax Highlighting

Ubuntu ships nano with syntax highlighting files for many languages:

```
# Add to ~/.nanorc
include "/usr/share/nano/python.nanorc"
include "/usr/share/nano/sh.nanorc"
include "/usr/share/nano/html.nanorc"
include "/usr/share/nano/yaml.nanorc"
include "/usr/share/nano/json.nanorc"
include "/usr/share/nano/dockerfile.nanorc"

# Or include everything
include "/usr/share/nano/*.nanorc"
```

Extended syntax highlighting is available:

```bash
# Install additional highlighting definitions
sudo apt install nano-syntax-highlighting

# Or download from https://github.com/scopatz/nanorc
curl https://raw.githubusercontent.com/scopatz/nanorc/master/install.sh | sh
```

## Practical Tips

### Edit System Files Safely

```bash
# Use nano's backup option for critical files
sudo nano --backup /etc/sshd_config

# Or make a manual backup first
sudo cp /etc/fstab /etc/fstab.bak
sudo nano /etc/fstab
```

### Soft-Wrapping Long Lines

When editing files with long lines (like markdown or documentation):

```bash
# Open with soft wrapping enabled
nano --softwrap longfile.md
```

### Read-Only Mode

```bash
# Open in view-only mode (cannot accidentally modify)
nano --view /etc/important.conf
# or
nano -v /etc/important.conf
```

### Creating a New File Quickly

```bash
# Open, type content, Ctrl+O to save, Ctrl+X to exit
nano /tmp/quick_note.txt

# Or pipe to nano (useful for reviewing command output)
journalctl -xe | nano -
```

## Quick Reference

```
Open:          nano filename
Save:          Ctrl+O
Exit:          Ctrl+X
Cut line:      Ctrl+K
Paste:         Ctrl+U
Copy line:     Alt+6
Search:        Ctrl+W
Replace:       Ctrl+\
Go to line:    Ctrl+_
Page down:     Ctrl+V
Page up:       Ctrl+Y
Undo:          Alt+U
Redo:          Alt+E
Mark:          Ctrl+6
Line start:    Ctrl+A
Line end:      Ctrl+E
```

Nano's strength is its immediacy - you can sit down at any Ubuntu machine, open a file with nano, make an edit, and save it without memorizing any modal commands. For quick configuration changes, writing cron jobs, or editing files you open only occasionally, nano is often the right tool.
