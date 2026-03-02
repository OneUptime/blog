# How to Use Emacs on Ubuntu for Text Editing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Emacs, Text Editors, Linux, Development

Description: Learn how to install and use Emacs on Ubuntu for text editing, covering essential keybindings, buffers, windows, file operations, and practical configuration.

---

Emacs is one of the oldest and most extensible text editors still in active development. Unlike Vim, Emacs operates primarily through modifier key combinations rather than modal editing. It is equally capable as a text editor, development environment, email client, and much more - though this guide focuses on effective text editing on Ubuntu.

## Installing Emacs

```bash
# Install the latest Emacs from Ubuntu repositories
sudo apt update
sudo apt install emacs

# Check version
emacs --version

# For the latest stable version via PPA
sudo add-apt-repository ppa:kelleyk/emacs
sudo apt update
sudo apt install emacs29

# Install without graphical interface (terminal only)
sudo apt install emacs-nox
```

## Starting Emacs

```bash
# Start Emacs with a GUI window (if display available)
emacs

# Start in terminal mode (no GUI)
emacs -nw

# Open a specific file
emacs /etc/hosts

# Open multiple files
emacs file1.txt file2.txt

# Open file and go to a line number
emacs +42 /etc/nginx/nginx.conf

# Run a quick single-command edit and exit
emacs --batch --eval '(find-file "file.txt") (goto-line 5) (save-buffer) (kill-emacs)'
```

## Key Notation

Emacs documentation uses specific notation:
- `C-x` means hold `Ctrl` and press `x`
- `M-x` means hold `Alt` (Meta) and press `x` (or press `Esc` then `x`)
- `C-x C-f` means `Ctrl+x` followed by `Ctrl+f`

## Essential File Operations

```
C-x C-f     - Find file (open file, prompting for path)
C-x C-s     - Save current buffer to file
C-x C-w     - Write to a different filename (Save As)
C-x C-c     - Exit Emacs (prompts to save unsaved buffers)
C-z         - Suspend Emacs (sends to background, fg to return)
```

When you press `C-x C-f`, Emacs shows a minibuffer prompt where you type the path. Tab completion works there.

## Navigation

### Cursor Movement

```
C-f         - Forward one character
C-b         - Backward one character
C-n         - Next line (down)
C-p         - Previous line (up)
M-f         - Forward one word
M-b         - Backward one word
C-a         - Beginning of line
C-e         - End of line
M-<         - Beginning of buffer (M-Shift-,)
M->         - End of buffer (M-Shift-.)
C-v         - Page down (scroll forward)
M-v         - Page up (scroll backward)
C-l         - Center screen on current line
```

### Jumping to Positions

```
M-g M-g     - Go to line number (type number, press Enter)
C-s         - Forward incremental search (continue searching with C-s)
C-r         - Backward incremental search
```

## Editing Text

### Inserting and Deleting

```
(just type)  - Insert text at cursor
Backspace    - Delete character before cursor
C-d          - Delete character under cursor
M-d          - Delete word forward
M-Backspace  - Delete word backward
C-k          - Kill (cut) from cursor to end of line
M-k          - Kill to end of sentence
C-w          - Kill (cut) selected region
```

### The Kill Ring (Clipboard)

Emacs uses a "kill ring" - a history of cut items. Paste from it with `C-y` (yank):

```
C-y         - Yank (paste) most recently killed text
M-y         - After C-y, cycle through kill ring (paste older items)
```

### Copy Without Cutting

```
M-w         - Copy selected region to kill ring (without deleting)
```

### Undo

```
C-/         - Undo
C-x u       - Undo (alternative)
C-_         - Undo (alternative)
```

Emacs undo is linear - repeated undo goes back, but after inserting text you can redo by undoing the undo.

## Selecting Text (Regions)

```
C-Space     - Set mark (start of selection)
C-Space C-Space  - Set mark without activating region
C-x C-x     - Swap point and mark (jump to start of selection)
```

After setting the mark, move the cursor to extend the selection, then use `C-w` to cut or `M-w` to copy.

Shift + arrow keys also select text in modern Emacs.

## Buffers

Emacs calls open files "buffers." Multiple files can be open simultaneously.

```
C-x b       - Switch to buffer (type buffer name, Tab to complete)
C-x C-b     - List all buffers
C-x k       - Kill (close) current buffer
M-x ibuffer - Better buffer list with sorting and filtering
```

In the buffer list (`C-x C-b`):
```
d           - Mark buffer for deletion
k           - Kill (close) buffer immediately
s           - Mark buffer to save
x           - Execute marked actions
q           - Quit buffer list
```

## Windows (Splits)

Emacs splits the screen into "windows" (not to be confused with OS windows):

```
C-x 2       - Split window horizontally (stacked top/bottom)
C-x 3       - Split window vertically (side by side)
C-x 1       - Keep only current window (close all splits)
C-x 0       - Close current window
C-x o       - Switch to other window
C-x 4 f     - Open file in other window
```

## Search and Replace

### Incremental Search

```
C-s         - Start forward search (type pattern, C-s for next match)
C-r         - Start backward search
Enter       - End search, stay at match
C-g         - Cancel search, return to original position
```

Search supports regular expressions:

```
C-M-s       - Forward regex search
C-M-r       - Backward regex search
```

### Find and Replace

```
M-%         - Query replace (interactive)
C-M-%       - Query replace with regex
```

During query replace:
```
y / Space   - Replace this match and advance
n           - Skip this match
!           - Replace all remaining without asking
.           - Replace this one and stop
q           - Quit replace
```

## Running Commands with M-x

The `M-x` prompt runs any Emacs command by name:

```
M-x shell          - Open a shell inside Emacs
M-x eshell         - Emacs built-in shell
M-x dired          - Directory editor (file manager)
M-x occur          - Show all lines matching a pattern
M-x sort-lines     - Sort selected lines
M-x count-words    - Count words in buffer or region
M-x whitespace-mode - Toggle whitespace display
M-x auto-fill-mode - Auto line-wrap at fill-column
M-x goto-line      - Go to line number
```

## Basic Configuration (~/.emacs or ~/.emacs.d/init.el)

```elisp
;; ~/.emacs.d/init.el

;; Display settings
(setq inhibit-startup-message t)     ; Skip startup screen
(tool-bar-mode -1)                   ; Disable toolbar
(menu-bar-mode -1)                   ; Disable menu bar
(scroll-bar-mode -1)                 ; Disable scroll bar
(global-display-line-numbers-mode t) ; Show line numbers
(column-number-mode t)               ; Show column in mode line

;; Editing
(setq-default indent-tabs-mode nil)  ; Use spaces
(setq-default tab-width 4)
(electric-pair-mode t)               ; Auto-close brackets
(show-paren-mode t)                  ; Highlight matching parens
(setq show-paren-delay 0)

;; Backups - save them somewhere tidy
(setq backup-directory-alist '(("." . "~/.emacs.d/backups")))
(setq auto-save-file-name-transforms '((".*" "~/.emacs.d/autosave/" t)))

;; Search
(setq case-fold-search t)            ; Case-insensitive search

;; Scrolling
(setq scroll-conservatively 101)     ; Avoid recentering

;; Theme (built-in)
(load-theme 'wombat t)

;; Useful global keybindings
(global-set-key (kbd "C-c l") 'goto-line)
(global-set-key (kbd "C-c r") 'query-replace)
```

## Using Dired (File Manager)

```
M-x dired   - Open directory browser
C-x d       - Open dired for a path
```

Inside Dired:
```
n / p       - Next / previous file
Enter       - Open file or directory
d           - Mark for deletion
x           - Execute deletions
R           - Rename/move file
C           - Copy file
+           - Create directory
q           - Quit dired
```

## Getting Help Inside Emacs

```
C-h k       - Describe what a key binding does
C-h f       - Describe a function
C-h v       - Describe a variable
C-h m       - Describe current major mode
C-h b       - List all key bindings
C-h t       - Open built-in Emacs tutorial
```

The built-in tutorial (`C-h t`) is an excellent 30-minute interactive introduction.

## Quick Reference

```
Save:       C-x C-s
Open:       C-x C-f
Quit:       C-x C-c
Cut:        C-w
Copy:       M-w
Paste:      C-y
Undo:       C-/
Search:     C-s
Replace:    M-%
Split H:    C-x 2
Split V:    C-x 3
Switch win: C-x o
Switch buf: C-x b
Goto line:  M-g M-g
```

Emacs rewards extended use. Once the key combinations become muscle memory, editing speed is high and the built-in extensibility (Lisp all the way down) means you can automate and customize nearly any workflow directly within the editor.
