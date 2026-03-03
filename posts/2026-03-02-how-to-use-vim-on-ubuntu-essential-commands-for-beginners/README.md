# How to Use Vim on Ubuntu: Essential Commands for Beginners

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Vim, Text Editors, Linux, Command Line

Description: A practical introduction to Vim on Ubuntu covering modes, navigation, editing, searching, and saving files - everything needed to become productive in Vim.

---

Vim is installed on nearly every Linux server you will ever access. When you SSH into a fresh Ubuntu machine, Vim is likely the most capable text editor available. Learning enough to be productive - not expert-level, just functional - makes a genuine difference in day-to-day server work.

## Installing Vim

```bash
# Ubuntu often ships with vim.tiny. Install the full version:
sudo apt update
sudo apt install vim

# Verify
vim --version | head -1
```

## Opening Files

```bash
# Open a file
vim /etc/nginx/nginx.conf

# Open at a specific line
vim +42 /etc/nginx/nginx.conf

# Open multiple files
vim file1.txt file2.txt

# Open a new file
vim newfile.txt
```

## Understanding Vim Modes

The single most important concept in Vim is that it has distinct modes. Commands work differently depending on which mode you are in.

```text
Normal mode   - For navigation and commands (default when you open Vim)
Insert mode   - For typing text (like a regular editor)
Visual mode   - For selecting text
Command mode  - For file operations and settings (entered with :)
```

Most problems beginners have come from not knowing which mode they are in. Look at the bottom of the screen - it shows `-- INSERT --` in insert mode and `-- VISUAL --` in visual mode. Nothing means you are in normal mode.

## Getting Out of Trouble

Before anything else, know how to escape:

```text
Esc         - Return to normal mode from any other mode
Esc Esc     - Definitely in normal mode now
```

If you get completely lost:
1. Press `Esc` several times
2. Type `:q!` to quit without saving

## Essential Normal Mode Commands

### Exiting Vim

```text
:q          - Quit (fails if you have unsaved changes)
:q!         - Quit and discard all changes (force quit)
:w          - Save (write) the file
:wq         - Save and quit
:x          - Save and quit (only writes if changes were made)
ZZ          - Save and quit (same as :x, faster to type)
ZQ          - Quit without saving (same as :q!)
```

### Navigation

```text
h           - Move left
j           - Move down
k           - Move up
l           - Move right
```

Arrow keys also work, but h/j/k/l are faster once you build the habit.

```text
w           - Forward one word (start of next word)
b           - Backward one word
e           - Forward to end of current word
0           - Start of line
^           - First non-whitespace character of line
$           - End of line
gg          - Go to first line of file
G           - Go to last line of file
42G         - Go to line 42
Ctrl+F      - Page down
Ctrl+B      - Page up
Ctrl+D      - Half page down
Ctrl+U      - Half page up
```

## Entering Insert Mode

```text
i           - Insert before cursor
a           - Insert after cursor (append)
I           - Insert at beginning of line
A           - Insert at end of line
o           - Open new line below and enter insert mode
O           - Open new line above and enter insert mode
s           - Delete character under cursor and enter insert mode
```

## Editing in Normal Mode

These commands operate without entering insert mode:

```text
x           - Delete character under cursor
X           - Delete character before cursor
dd          - Delete (cut) current line
yy          - Copy (yank) current line
p           - Paste after cursor/current line
P           - Paste before cursor/current line
u           - Undo
Ctrl+R      - Redo
r           - Replace single character (then type the replacement)
~           - Toggle case of character under cursor
```

### Operators and Motions

Vim commands combine operators with motions. The pattern is `operator + motion`:

```text
dw          - Delete word
d$          - Delete to end of line
d0          - Delete to start of line
d3j         - Delete current line and 3 lines down
y$          - Copy to end of line
c$          - Change (delete and enter insert) to end of line
cw          - Change word
cc          - Change entire line (delete and enter insert mode)
```

Count prefixes work with most commands:

```text
3dd         - Delete 3 lines
5j          - Move down 5 lines
10yy        - Copy 10 lines
```

## Searching

```text
/pattern    - Search forward for pattern
?pattern    - Search backward for pattern
n           - Next match (in search direction)
N           - Previous match (opposite direction)
*           - Search forward for word under cursor
#           - Search backward for word under cursor
```

```bash
# After pressing / and typing your search, press Enter
# Then use n and N to navigate matches

# Case-insensitive search
/\cpattern
```

## Find and Replace

Command mode substitution is one of Vim's most powerful features:

```text
:s/old/new/         - Replace first occurrence on current line
:s/old/new/g        - Replace all on current line
:%s/old/new/g       - Replace all in file
:%s/old/new/gc      - Replace all, confirm each (c = confirm)
:5,10s/old/new/g    - Replace all between lines 5 and 10
```

## Visual Mode

Visual mode lets you select text before applying operations:

```text
v           - Enter character visual mode
V           - Enter line visual mode
Ctrl+V      - Enter block visual mode
```

After selecting, apply operations:

```text
d           - Delete selection
y           - Copy selection
c           - Change selection (delete and enter insert)
>           - Indent selection
<           - Outdent selection
```

## Working with Multiple Files

```text
:e filename         - Open another file
:n                  - Next file (when opened with vim file1 file2)
:prev               - Previous file
:ls                 - List open buffers
:b2                 - Switch to buffer 2
:split filename     - Horizontal split
:vsplit filename    - Vertical split
Ctrl+W+W            - Switch between splits
Ctrl+W+H/J/K/L      - Move between splits directionally
```

## Useful Settings for Beginners

You can enable these temporarily from command mode:

```text
:set number         - Show line numbers
:set relativenumber - Show relative line numbers
:set hlsearch       - Highlight search results
:set ignorecase     - Case-insensitive search
:set smartcase      - Case-sensitive only when uppercase in pattern
:set autoindent     - Auto-indent new lines
:set syntax on      - Enable syntax highlighting
```

To make settings permanent, add them to `~/.vimrc`:

```vim
" ~/.vimrc
set number
set hlsearch
set ignorecase
set smartcase
set autoindent
set expandtab
set tabstop=4
set shiftwidth=4
syntax on
```

## Quick Reference Card

```text
Mode entry:   i (before) a (after) o (new line below) O (new line above)
Exit mode:    Esc

Navigation:   h j k l (left down up right)
              w b e (word forward/back/end)
              0 ^ $ (line start/non-ws/end)
              gg G (file top/bottom)

Edit:         x (delete char) dd (delete line) yy (copy) p (paste)
              u (undo) Ctrl+R (redo)
              dw (delete word) cw (change word)

Save/Quit:    :w (save) :q (quit) :wq (save+quit) :q! (force quit)

Search:       /pattern n N

Replace:      :%s/old/new/g
```

## The Path to Proficiency

The commands above are enough to do real work. The next things to learn after mastering these basics are: macros (`q` to record, `@` to replay), marks (bookmarks within a file), the built-in help system (`:help`), and customizing `~/.vimrc`. Vim's learning curve is real, but the commands above are sufficient for editing configuration files, writing scripts, and navigating server files effectively.
