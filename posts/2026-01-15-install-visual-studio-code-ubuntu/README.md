# How to Install Visual Studio Code on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, VS Code, IDE, Development, Editor, Tutorial

Description: Complete guide to installing and configuring Visual Studio Code on Ubuntu for development.

---

Visual Studio Code (VS Code) has become the most popular code editor among developers worldwide. Its lightweight nature, extensive extension ecosystem, and powerful features make it an excellent choice for development on Ubuntu. This comprehensive guide will walk you through multiple installation methods, essential configurations, and best practices to get you up and running with VS Code on Ubuntu.

## Table of Contents

1. [Installation Methods](#installation-methods)
2. [Adding Microsoft Repository](#adding-microsoft-repository)
3. [Command-Line Code Command](#command-line-code-command)
4. [Essential Extensions](#essential-extensions)
5. [Settings Configuration](#settings-configuration)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Integrated Terminal Setup](#integrated-terminal-setup)
8. [Git Integration](#git-integration)
9. [Remote Development](#remote-development)
10. [Debugging Configuration](#debugging-configuration)
11. [Workspace Settings](#workspace-settings)
12. [Performance Optimization](#performance-optimization)

---

## Installation Methods

VS Code can be installed on Ubuntu using several methods. Choose the one that best fits your workflow and preferences.

### Method 1: Install via Snap (Recommended for Beginners)

Snap packages are self-contained and automatically update. This is the simplest installation method:

```bash
# Install VS Code using Snap
# The --classic flag allows VS Code to access files outside its sandbox
sudo snap install code --classic

# Verify the installation
code --version
```

**Pros:**
- Automatic updates
- Simple one-command installation
- Sandboxed environment

**Cons:**
- Slightly slower startup time
- May have issues accessing some system files

### Method 2: Install via APT with Microsoft Repository (Recommended for Production)

This method provides the most up-to-date version directly from Microsoft:

```bash
# Step 1: Update package index and install dependencies
# These packages are required for secure HTTPS downloads
sudo apt update
sudo apt install -y wget gpg apt-transport-https

# Step 2: Download and install the Microsoft GPG key
# This key verifies the authenticity of packages from Microsoft
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -D -o root -g root -m 644 packages.microsoft.gpg /etc/apt/keyrings/packages.microsoft.gpg

# Step 3: Add the VS Code repository to your sources list
# This tells apt where to find VS Code packages
echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" | sudo tee /etc/apt/sources.list.d/vscode.list > /dev/null

# Step 4: Clean up the temporary GPG file
rm -f packages.microsoft.gpg

# Step 5: Update package index and install VS Code
sudo apt update
sudo apt install -y code

# Verify installation
code --version
```

### Method 3: Install via .deb Package (Manual Installation)

Download and install the .deb package directly from Microsoft:

```bash
# Download the latest .deb package
# Replace the URL with the latest version if needed
wget -O vscode.deb "https://code.visualstudio.com/sha/download?build=stable&os=linux-deb-x64"

# Install the downloaded package
# dpkg is the low-level package manager for .deb files
sudo dpkg -i vscode.deb

# If there are dependency issues, fix them with:
sudo apt install -f

# Clean up the downloaded file
rm vscode.deb

# Verify installation
code --version
```

### Method 4: Install VS Code Insiders (Preview Version)

For those who want the latest features before stable release:

```bash
# Via Snap
sudo snap install code-insiders --classic

# Or via APT (after adding the repository)
sudo apt install code-insiders
```

---

## Adding Microsoft Repository

If you installed VS Code via Snap or .deb, you might want to add the Microsoft repository for future updates:

```bash
#!/bin/bash
# Script: setup-vscode-repo.sh
# Description: Sets up Microsoft VS Code repository on Ubuntu
# Author: nawazdhandala

# Exit on any error
set -e

echo "Setting up Microsoft VS Code repository..."

# Install required packages for secure repository access
sudo apt update
sudo apt install -y software-properties-common apt-transport-https wget

# Import Microsoft GPG key
# GPG keys are used to verify package authenticity
wget -q https://packages.microsoft.com/keys/microsoft.asc -O- | sudo apt-key add -

# Add the official VS Code repository
# This enables automatic updates through apt
sudo add-apt-repository "deb [arch=amd64] https://packages.microsoft.com/repos/vscode stable main"

# Update package list to include new repository
sudo apt update

echo "Repository setup complete! You can now install or update VS Code with:"
echo "sudo apt install code"
```

---

## Command-Line Code Command

The `code` command provides powerful command-line integration:

```bash
# Open VS Code in the current directory
code .

# Open a specific file
code myfile.py

# Open a specific folder
code /path/to/project

# Open multiple files
code file1.js file2.js file3.js

# Open a file at a specific line and column
# Format: code -g file:line:column
code -g app.py:25:10

# Compare two files (diff mode)
code --diff file1.txt file2.txt

# Open a new window
code -n

# Open a file in an existing window (reuse window)
code -r myfile.js

# Open VS Code and wait for it to close (useful in scripts)
code --wait config.yaml

# List installed extensions
code --list-extensions

# Install an extension from the command line
code --install-extension ms-python.python

# Uninstall an extension
code --uninstall-extension extension-id

# Disable all extensions and open VS Code
code --disable-extensions

# Open VS Code with verbose logging for debugging
code --verbose

# Print VS Code version and exit
code --version

# Print help for all available options
code --help
```

### Setting Up `code` Command if Missing

If the `code` command is not available after installation:

```bash
# For Snap installation, it should be automatically available
# For other installations, you may need to add it to PATH

# Check if code is in PATH
which code

# If not found, create a symbolic link
sudo ln -s /usr/share/code/bin/code /usr/local/bin/code

# Or add to your shell configuration
echo 'export PATH="$PATH:/usr/share/code/bin"' >> ~/.bashrc
source ~/.bashrc
```

---

## Essential Extensions

Extensions enhance VS Code's functionality. Here are must-have extensions for various development workflows:

### Installing Extensions via Command Line

```bash
#!/bin/bash
# Script: install-vscode-extensions.sh
# Description: Installs essential VS Code extensions
# Author: nawazdhandala

# General Development Extensions
code --install-extension esbenp.prettier-vscode          # Code formatter
code --install-extension dbaeumer.vscode-eslint          # JavaScript linting
code --install-extension eamodio.gitlens                 # Enhanced Git capabilities
code --install-extension ms-vsliveshare.vsliveshare      # Real-time collaboration
code --install-extension usernamehw.errorlens            # Inline error display
code --install-extension streetsidesoftware.code-spell-checker  # Spell checking

# Python Development
code --install-extension ms-python.python                # Python support
code --install-extension ms-python.vscode-pylance        # Python language server
code --install-extension ms-python.debugpy               # Python debugging

# JavaScript/TypeScript Development
code --install-extension ms-vscode.vscode-typescript-next  # TypeScript support
code --install-extension bradlc.vscode-tailwindcss       # Tailwind CSS IntelliSense

# Web Development
code --install-extension ritwickdey.LiveServer           # Live reload for web pages
code --install-extension formulahendry.auto-rename-tag   # Auto rename HTML tags
code --install-extension pranaygp.vscode-css-peek        # CSS peek and go-to

# Remote Development (Essential for server work)
code --install-extension ms-vscode-remote.remote-ssh     # SSH remote development
code --install-extension ms-vscode-remote.remote-containers  # Docker containers
code --install-extension ms-vscode-remote.remote-wsl     # WSL integration

# Docker & Kubernetes
code --install-extension ms-azuretools.vscode-docker     # Docker support
code --install-extension ms-kubernetes-tools.vscode-kubernetes-tools  # Kubernetes

# Database
code --install-extension mtxr.sqltools                   # SQL client
code --install-extension mongodb.mongodb-vscode          # MongoDB support

# Productivity
code --install-extension vscodevim.vim                   # Vim keybindings
code --install-extension christian-kohler.path-intellisense  # Path autocomplete
code --install-extension wayou.vscode-todo-highlight     # TODO highlighting

# Themes and Icons
code --install-extension pkief.material-icon-theme       # Material icons
code --install-extension dracula-theme.theme-dracula     # Dracula theme
code --install-extension github.github-vscode-theme      # GitHub themes

echo "All extensions installed successfully!"
```

### Managing Extensions

```bash
# List all installed extensions with versions
code --list-extensions --show-versions

# Export extensions to a file for backup
code --list-extensions > vscode-extensions.txt

# Install extensions from a file
cat vscode-extensions.txt | xargs -L 1 code --install-extension

# Update all extensions (open VS Code and run)
# Extensions > ... > Check for Extension Updates
```

---

## Settings Configuration

VS Code settings are stored in JSON format. Here is a comprehensive settings configuration:

### User Settings Location

```bash
# User settings are stored at:
~/.config/Code/User/settings.json

# Open settings directly
code ~/.config/Code/User/settings.json

# Or use the command palette: Ctrl+Shift+P > "Preferences: Open Settings (JSON)"
```

### Comprehensive Settings Configuration

```json
{
    // ===========================================
    // EDITOR SETTINGS
    // ===========================================

    // Font configuration
    // Use a programming font with ligatures for better readability
    "editor.fontFamily": "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
    "editor.fontSize": 14,
    "editor.fontLigatures": true,           // Enable font ligatures (=> becomes arrow)
    "editor.lineHeight": 1.6,               // Comfortable line spacing

    // Cursor and selection
    "editor.cursorBlinking": "smooth",      // Smooth cursor animation
    "editor.cursorStyle": "line",           // Line cursor (alternatives: block, underline)
    "editor.cursorSmoothCaretAnimation": "on",
    "editor.multiCursorModifier": "ctrlCmd", // Use Ctrl/Cmd for multi-cursor

    // Code display
    "editor.minimap.enabled": true,         // Show minimap on the right
    "editor.minimap.maxColumn": 80,         // Limit minimap width
    "editor.renderWhitespace": "boundary",  // Show whitespace at boundaries
    "editor.rulers": [80, 120],             // Visual rulers at columns 80 and 120
    "editor.wordWrap": "off",               // Disable word wrap by default
    "editor.lineNumbers": "on",             // Show line numbers
    "editor.renderLineHighlight": "all",    // Highlight current line

    // Indentation
    "editor.tabSize": 4,                    // 4 spaces per tab
    "editor.insertSpaces": true,            // Use spaces instead of tabs
    "editor.detectIndentation": true,       // Auto-detect indentation
    "editor.autoIndent": "full",            // Full auto-indentation

    // IntelliSense and autocomplete
    "editor.suggestSelection": "first",     // Select first suggestion
    "editor.quickSuggestions": {
        "other": true,
        "comments": false,
        "strings": true
    },
    "editor.acceptSuggestionOnCommitCharacter": true,
    "editor.snippetSuggestions": "top",     // Show snippets at top
    "editor.tabCompletion": "on",           // Enable tab completion

    // Code actions
    "editor.formatOnSave": true,            // Format code on save
    "editor.formatOnPaste": true,           // Format pasted code
    "editor.codeActionsOnSave": {
        "source.fixAll": "explicit",        // Fix all auto-fixable issues
        "source.organizeImports": "explicit" // Organize imports on save
    },

    // Bracket handling
    "editor.bracketPairColorization.enabled": true,  // Color matching brackets
    "editor.guides.bracketPairs": true,     // Show bracket pair guides
    "editor.autoClosingBrackets": "always", // Auto-close brackets
    "editor.autoClosingQuotes": "always",   // Auto-close quotes

    // Scrolling
    "editor.smoothScrolling": true,         // Smooth scrolling animation
    "editor.scrollBeyondLastLine": false,   // Don't scroll past last line
    "editor.stickyScroll.enabled": true,    // Sticky scroll for context

    // ===========================================
    // WORKBENCH SETTINGS
    // ===========================================

    // Appearance
    "workbench.colorTheme": "GitHub Dark Default",
    "workbench.iconTheme": "material-icon-theme",
    "workbench.startupEditor": "none",      // Don't show welcome page
    "workbench.editor.enablePreview": true, // Preview mode for single-click
    "workbench.editor.enablePreviewFromQuickOpen": false,

    // Sidebar
    "workbench.sideBar.location": "left",   // Sidebar on the left
    "workbench.activityBar.location": "side", // Activity bar on side

    // Tabs
    "workbench.editor.showTabs": "multiple", // Show tabs when multiple files open
    "workbench.editor.tabCloseButton": "right",
    "workbench.editor.highlightModifiedTabs": true,

    // ===========================================
    // FILE SETTINGS
    // ===========================================

    "files.autoSave": "afterDelay",         // Auto-save after delay
    "files.autoSaveDelay": 1000,            // 1 second delay
    "files.trimTrailingWhitespace": true,   // Remove trailing whitespace
    "files.insertFinalNewline": true,       // Add newline at end of file
    "files.trimFinalNewlines": true,        // Remove extra newlines at end

    // File exclusions (hide from explorer)
    "files.exclude": {
        "**/.git": true,
        "**/.DS_Store": true,
        "**/node_modules": true,
        "**/__pycache__": true,
        "**/*.pyc": true,
        "**/.pytest_cache": true
    },

    // Watch exclusions (don't watch these for changes)
    "files.watcherExclude": {
        "**/node_modules/**": true,
        "**/.git/objects/**": true,
        "**/venv/**": true
    },

    // ===========================================
    // TERMINAL SETTINGS
    // ===========================================

    "terminal.integrated.defaultProfile.linux": "bash",
    "terminal.integrated.fontSize": 13,
    "terminal.integrated.fontFamily": "'Fira Code', monospace",
    "terminal.integrated.cursorBlinking": true,
    "terminal.integrated.cursorStyle": "line",
    "terminal.integrated.scrollback": 10000, // Lines of scrollback
    "terminal.integrated.enableMultiLinePasteWarning": "never",
    "terminal.integrated.copyOnSelection": true,

    // ===========================================
    // GIT SETTINGS
    // ===========================================

    "git.enableSmartCommit": true,          // Commit all changes if no staged
    "git.confirmSync": false,               // Don't confirm sync
    "git.autofetch": true,                  // Auto-fetch from remote
    "git.autoStash": true,                  // Auto-stash before pull
    "git.pruneOnFetch": true,               // Prune remote branches on fetch
    "git.defaultCloneDirectory": "~/Projects",

    // ===========================================
    // SEARCH SETTINGS
    // ===========================================

    "search.exclude": {
        "**/node_modules": true,
        "**/bower_components": true,
        "**/*.code-search": true,
        "**/dist": true,
        "**/build": true,
        "**/venv": true
    },
    "search.useIgnoreFiles": true,          // Respect .gitignore
    "search.followSymlinks": false,         // Don't follow symlinks

    // ===========================================
    // LANGUAGE-SPECIFIC SETTINGS
    // ===========================================

    // Python
    "[python]": {
        "editor.tabSize": 4,
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "ms-python.black-formatter",
        "editor.codeActionsOnSave": {
            "source.organizeImports": "explicit"
        }
    },

    // JavaScript/TypeScript
    "[javascript]": {
        "editor.tabSize": 2,
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "[typescript]": {
        "editor.tabSize": 2,
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "[typescriptreact]": {
        "editor.tabSize": 2,
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },

    // JSON
    "[json]": {
        "editor.tabSize": 2,
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "[jsonc]": {
        "editor.tabSize": 2,
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },

    // HTML/CSS
    "[html]": {
        "editor.tabSize": 2,
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "[css]": {
        "editor.tabSize": 2,
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },

    // Markdown
    "[markdown]": {
        "editor.wordWrap": "on",
        "editor.quickSuggestions": {
            "other": true,
            "comments": false,
            "strings": true
        }
    },

    // ===========================================
    // EXTENSION SETTINGS
    // ===========================================

    // Prettier
    "prettier.semi": true,
    "prettier.singleQuote": true,
    "prettier.tabWidth": 2,
    "prettier.trailingComma": "es5",

    // ESLint
    "eslint.validate": ["javascript", "typescript", "javascriptreact", "typescriptreact"],
    "eslint.codeActionsOnSave.mode": "problems",

    // GitLens
    "gitlens.codeLens.enabled": true,
    "gitlens.currentLine.enabled": true,

    // Error Lens
    "errorLens.enabledDiagnosticLevels": ["error", "warning"],
    "errorLens.excludeBySource": ["cSpell"]
}
```

---

## Keyboard Shortcuts

Master these keyboard shortcuts to boost your productivity:

### Custom Keybindings Configuration

Keybindings are stored at `~/.config/Code/User/keybindings.json`:

```json
[
    // ===========================================
    // FILE OPERATIONS
    // ===========================================

    {
        // Quick save all files
        "key": "ctrl+shift+s",
        "command": "workbench.action.files.saveAll"
    },
    {
        // Close all tabs
        "key": "ctrl+k ctrl+w",
        "command": "workbench.action.closeAllEditors"
    },

    // ===========================================
    // NAVIGATION
    // ===========================================

    {
        // Go to file (quick open)
        "key": "ctrl+p",
        "command": "workbench.action.quickOpen"
    },
    {
        // Go to symbol in file
        "key": "ctrl+shift+o",
        "command": "workbench.action.gotoSymbol"
    },
    {
        // Go to symbol in workspace
        "key": "ctrl+t",
        "command": "workbench.action.showAllSymbols"
    },
    {
        // Navigate back
        "key": "alt+left",
        "command": "workbench.action.navigateBack"
    },
    {
        // Navigate forward
        "key": "alt+right",
        "command": "workbench.action.navigateForward"
    },

    // ===========================================
    // EDITING
    // ===========================================

    {
        // Duplicate line down
        "key": "ctrl+shift+d",
        "command": "editor.action.copyLinesDownAction"
    },
    {
        // Move line up
        "key": "alt+up",
        "command": "editor.action.moveLinesUpAction"
    },
    {
        // Move line down
        "key": "alt+down",
        "command": "editor.action.moveLinesDownAction"
    },
    {
        // Delete entire line
        "key": "ctrl+shift+k",
        "command": "editor.action.deleteLines"
    },
    {
        // Add cursor above
        "key": "ctrl+alt+up",
        "command": "editor.action.insertCursorAbove"
    },
    {
        // Add cursor below
        "key": "ctrl+alt+down",
        "command": "editor.action.insertCursorBelow"
    },
    {
        // Select all occurrences of current selection
        "key": "ctrl+shift+l",
        "command": "editor.action.selectHighlights"
    },
    {
        // Add selection to next find match
        "key": "ctrl+d",
        "command": "editor.action.addSelectionToNextFindMatch"
    },
    {
        // Toggle line comment
        "key": "ctrl+/",
        "command": "editor.action.commentLine"
    },
    {
        // Toggle block comment
        "key": "ctrl+shift+/",
        "command": "editor.action.blockComment"
    },

    // ===========================================
    // CODE INTELLIGENCE
    // ===========================================

    {
        // Trigger suggestions
        "key": "ctrl+space",
        "command": "editor.action.triggerSuggest"
    },
    {
        // Quick fix / code actions
        "key": "ctrl+.",
        "command": "editor.action.quickFix"
    },
    {
        // Go to definition
        "key": "f12",
        "command": "editor.action.revealDefinition"
    },
    {
        // Peek definition
        "key": "alt+f12",
        "command": "editor.action.peekDefinition"
    },
    {
        // Find all references
        "key": "shift+f12",
        "command": "editor.action.goToReferences"
    },
    {
        // Rename symbol
        "key": "f2",
        "command": "editor.action.rename"
    },
    {
        // Format document
        "key": "ctrl+shift+i",
        "command": "editor.action.formatDocument"
    },

    // ===========================================
    // TERMINAL
    // ===========================================

    {
        // Toggle terminal
        "key": "ctrl+`",
        "command": "workbench.action.terminal.toggleTerminal"
    },
    {
        // Create new terminal
        "key": "ctrl+shift+`",
        "command": "workbench.action.terminal.new"
    },
    {
        // Split terminal
        "key": "ctrl+shift+5",
        "command": "workbench.action.terminal.split"
    },
    {
        // Clear terminal
        "key": "ctrl+k",
        "command": "workbench.action.terminal.clear",
        "when": "terminalFocus"
    },

    // ===========================================
    // SIDEBAR AND PANELS
    // ===========================================

    {
        // Toggle sidebar
        "key": "ctrl+b",
        "command": "workbench.action.toggleSidebarVisibility"
    },
    {
        // Focus explorer
        "key": "ctrl+shift+e",
        "command": "workbench.view.explorer"
    },
    {
        // Focus search
        "key": "ctrl+shift+f",
        "command": "workbench.view.search"
    },
    {
        // Focus source control
        "key": "ctrl+shift+g",
        "command": "workbench.view.scm"
    },
    {
        // Focus debug
        "key": "ctrl+shift+d",
        "command": "workbench.view.debug"
    },
    {
        // Focus extensions
        "key": "ctrl+shift+x",
        "command": "workbench.view.extensions"
    },

    // ===========================================
    // DEBUGGING
    // ===========================================

    {
        // Start debugging
        "key": "f5",
        "command": "workbench.action.debug.start"
    },
    {
        // Stop debugging
        "key": "shift+f5",
        "command": "workbench.action.debug.stop"
    },
    {
        // Restart debugging
        "key": "ctrl+shift+f5",
        "command": "workbench.action.debug.restart"
    },
    {
        // Toggle breakpoint
        "key": "f9",
        "command": "editor.debug.action.toggleBreakpoint"
    },
    {
        // Step over
        "key": "f10",
        "command": "workbench.action.debug.stepOver"
    },
    {
        // Step into
        "key": "f11",
        "command": "workbench.action.debug.stepInto"
    },
    {
        // Step out
        "key": "shift+f11",
        "command": "workbench.action.debug.stepOut"
    }
]
```

### Essential Keyboard Shortcuts Reference

| Category | Shortcut | Action |
|----------|----------|--------|
| **General** | `Ctrl+Shift+P` | Command Palette |
| | `Ctrl+P` | Quick Open File |
| | `Ctrl+Shift+N` | New Window |
| | `Ctrl+,` | Open Settings |
| **Editing** | `Ctrl+X` | Cut Line |
| | `Ctrl+C` | Copy Line |
| | `Ctrl+Shift+K` | Delete Line |
| | `Alt+Up/Down` | Move Line |
| | `Ctrl+/` | Toggle Comment |
| | `Ctrl+D` | Select Next Occurrence |
| **Navigation** | `Ctrl+G` | Go to Line |
| | `Ctrl+Shift+O` | Go to Symbol |
| | `F12` | Go to Definition |
| | `Alt+Left/Right` | Navigate Back/Forward |
| **Search** | `Ctrl+F` | Find |
| | `Ctrl+H` | Find and Replace |
| | `Ctrl+Shift+F` | Search in Files |
| **View** | `Ctrl+B` | Toggle Sidebar |
| | `Ctrl+`` | Toggle Terminal |
| | `Ctrl+Shift+E` | Explorer |
| | `Ctrl+Shift+G` | Source Control |

---

## Integrated Terminal Setup

The integrated terminal is one of VS Code's most powerful features. Configure it for maximum productivity:

### Terminal Profiles Configuration

Add to your `settings.json`:

```json
{
    // ===========================================
    // TERMINAL PROFILES
    // ===========================================

    // Define available terminal profiles
    "terminal.integrated.profiles.linux": {
        // Default Bash profile
        "bash": {
            "path": "/bin/bash",
            "icon": "terminal-bash",
            "args": ["-l"]  // Login shell to load .bash_profile
        },
        // Zsh profile (if installed)
        "zsh": {
            "path": "/bin/zsh",
            "icon": "terminal"
        },
        // Fish shell (if installed)
        "fish": {
            "path": "/usr/bin/fish",
            "icon": "terminal"
        },
        // Python virtual environment
        "python-venv": {
            "path": "/bin/bash",
            "args": ["-c", "source venv/bin/activate && exec bash"],
            "icon": "symbol-method"
        },
        // Node.js environment with nvm
        "node": {
            "path": "/bin/bash",
            "args": ["-c", "source ~/.nvm/nvm.sh && exec bash"],
            "icon": "symbol-event"
        },
        // Root terminal (use with caution)
        "root": {
            "path": "/bin/bash",
            "args": ["-c", "sudo -i"],
            "icon": "warning"
        }
    },

    // Set default profile
    "terminal.integrated.defaultProfile.linux": "bash",

    // ===========================================
    // TERMINAL APPEARANCE
    // ===========================================

    "terminal.integrated.fontSize": 13,
    "terminal.integrated.fontFamily": "'JetBrains Mono', 'Fira Code', monospace",
    "terminal.integrated.lineHeight": 1.2,
    "terminal.integrated.letterSpacing": 0,

    // Cursor settings
    "terminal.integrated.cursorBlinking": true,
    "terminal.integrated.cursorStyle": "line",
    "terminal.integrated.cursorWidth": 2,

    // ===========================================
    // TERMINAL BEHAVIOR
    // ===========================================

    // Scrollback lines (history)
    "terminal.integrated.scrollback": 10000,

    // Copy on selection (like Linux terminals)
    "terminal.integrated.copyOnSelection": true,

    // Right-click behavior
    "terminal.integrated.rightClickBehavior": "copyPaste",

    // Confirm on exit if processes running
    "terminal.integrated.confirmOnExit": "hasChildProcesses",

    // Disable multi-line paste warning
    "terminal.integrated.enableMultiLinePasteWarning": "never",

    // Environment variables
    "terminal.integrated.env.linux": {
        "EDITOR": "code --wait",
        "VISUAL": "code --wait"
    },

    // ===========================================
    // TERMINAL COLORS (custom theme)
    // ===========================================

    "workbench.colorCustomizations": {
        // Terminal colors
        "terminal.background": "#1a1b26",
        "terminal.foreground": "#c0caf5",
        "terminal.ansiBlack": "#15161e",
        "terminal.ansiRed": "#f7768e",
        "terminal.ansiGreen": "#9ece6a",
        "terminal.ansiYellow": "#e0af68",
        "terminal.ansiBlue": "#7aa2f7",
        "terminal.ansiMagenta": "#bb9af7",
        "terminal.ansiCyan": "#7dcfff",
        "terminal.ansiWhite": "#a9b1d6",
        "terminal.ansiBrightBlack": "#414868",
        "terminal.ansiBrightRed": "#f7768e",
        "terminal.ansiBrightGreen": "#9ece6a",
        "terminal.ansiBrightYellow": "#e0af68",
        "terminal.ansiBrightBlue": "#7aa2f7",
        "terminal.ansiBrightMagenta": "#bb9af7",
        "terminal.ansiBrightCyan": "#7dcfff",
        "terminal.ansiBrightWhite": "#c0caf5",
        "terminalCursor.foreground": "#c0caf5"
    }
}
```

### Terminal Tasks Configuration

Create `.vscode/tasks.json` in your project:

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            // Run development server
            "label": "Start Dev Server",
            "type": "shell",
            "command": "npm run dev",
            "group": "build",
            "presentation": {
                "reveal": "always",
                "panel": "new"
            },
            "problemMatcher": []
        },
        {
            // Run tests
            "label": "Run Tests",
            "type": "shell",
            "command": "npm test",
            "group": "test",
            "presentation": {
                "reveal": "always",
                "panel": "shared"
            },
            "problemMatcher": []
        },
        {
            // Build project
            "label": "Build",
            "type": "shell",
            "command": "npm run build",
            "group": {
                "kind": "build",
                "isDefault": true
            },
            "problemMatcher": ["$tsc"]
        },
        {
            // Lint code
            "label": "Lint",
            "type": "shell",
            "command": "npm run lint",
            "problemMatcher": ["$eslint-stylish"]
        },
        {
            // Docker compose up
            "label": "Docker Up",
            "type": "shell",
            "command": "docker-compose up -d",
            "problemMatcher": []
        }
    ]
}
```

---

## Git Integration

VS Code provides excellent Git integration out of the box. Here is how to configure and use it effectively:

### Git Configuration in settings.json

```json
{
    // ===========================================
    // GIT SETTINGS
    // ===========================================

    // Enable Git features
    "git.enabled": true,

    // Auto-fetch from remote periodically
    "git.autofetch": true,
    "git.autofetchPeriod": 180,  // Fetch every 3 minutes

    // Commit behavior
    "git.enableSmartCommit": true,           // Commit all if nothing staged
    "git.postCommitCommand": "none",         // Action after commit
    "git.confirmSync": false,                // Don't confirm before sync
    "git.confirmEmptyCommits": true,         // Warn on empty commits

    // Branch and merge
    "git.autoStash": true,                   // Auto-stash before pull
    "git.pruneOnFetch": true,                // Remove deleted remote branches
    "git.branchProtection": ["main", "master"],  // Protect main branches
    "git.branchProtectionPrompt": "alwaysPrompt",

    // Diff and merge
    "git.openDiffOnClick": true,             // Open diff when clicking
    "diffEditor.ignoreTrimWhitespace": false,

    // Clone settings
    "git.defaultCloneDirectory": "~/Projects",

    // Decorations
    "git.decorations.enabled": true,         // Show git decorations in explorer

    // Timeline
    "git.timeline.showAuthor": true,
    "git.timeline.showUncommitted": true,

    // ===========================================
    // GITLENS SETTINGS (if installed)
    // ===========================================

    // Code lens
    "gitlens.codeLens.enabled": true,
    "gitlens.codeLens.authors.enabled": true,
    "gitlens.codeLens.recentChange.enabled": true,

    // Current line blame
    "gitlens.currentLine.enabled": true,
    "gitlens.currentLine.format": "${author}, ${agoOrDate} - ${message}",

    // Hover details
    "gitlens.hovers.enabled": true,
    "gitlens.hovers.currentLine.over": "line",

    // Status bar
    "gitlens.statusBar.enabled": true,
    "gitlens.statusBar.format": "${author}, ${agoOrDate}",

    // Views
    "gitlens.views.repositories.files.layout": "tree",
    "gitlens.views.commits.avatars": true
}
```

### Useful Git Commands in VS Code

Access Git features from Command Palette (Ctrl+Shift+P):

```
# Stage changes
Git: Stage All Changes
Git: Stage Changes  (Stage selected file)

# Commit
Git: Commit
Git: Commit Staged
Git: Commit All

# Branch operations
Git: Create Branch
Git: Checkout to...
Git: Delete Branch
Git: Merge Branch

# Remote operations
Git: Pull
Git: Pull (Rebase)
Git: Push
Git: Fetch

# History and diff
Git: View History (with GitLens)
Git: Show Commit (View specific commit)

# Stash
Git: Stash
Git: Pop Stash
Git: Apply Stash

# Reset
Git: Undo Last Commit
Git: Discard All Changes
```

### Git Commit Message Template

Create `.vscode/commit-template.txt`:

```
# <type>(<scope>): <subject>
# |<---- Using a Maximum Of 50 Characters ---->|

# Explain why this change is being made
# |<---- Try To Limit Each Line to a Maximum Of 72 Characters ---->|

# Provide links or keys to any relevant tickets, articles or other resources
# Example: Github issue #23

# --- COMMIT END ---
# Type can be:
#    feat     (new feature)
#    fix      (bug fix)
#    docs     (changes to documentation)
#    style    (formatting, missing semi colons, etc; no code change)
#    refactor (refactoring production code)
#    test     (adding missing tests, refactoring tests)
#    chore    (updating grunt tasks etc; no production code change)
# --------------------
```

---

## Remote Development

VS Code's remote development capabilities allow you to work on remote servers, containers, and WSL as if they were local.

### Remote SSH Configuration

1. Install the Remote SSH extension:

```bash
code --install-extension ms-vscode-remote.remote-ssh
```

2. Configure SSH hosts in `~/.ssh/config`:

```ssh
# Development server
Host dev-server
    HostName 192.168.1.100
    User developer
    Port 22
    IdentityFile ~/.ssh/id_rsa
    ForwardAgent yes

# Production server (read-only access recommended)
Host prod-server
    HostName production.example.com
    User deploy
    Port 22
    IdentityFile ~/.ssh/prod_key

# Jump host configuration
Host internal-server
    HostName 10.0.0.50
    User admin
    ProxyJump bastion-host

# Bastion host
Host bastion-host
    HostName bastion.example.com
    User jump
    IdentityFile ~/.ssh/bastion_key
```

3. VS Code Remote SSH settings:

```json
{
    // Remote SSH settings
    "remote.SSH.remotePlatform": {
        "dev-server": "linux",
        "prod-server": "linux"
    },
    "remote.SSH.showLoginTerminal": true,
    "remote.SSH.useLocalServer": true,
    "remote.SSH.connectTimeout": 60,

    // Default extensions to install on remote
    "remote.SSH.defaultExtensions": [
        "ms-python.python",
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode"
    ]
}
```

### Remote Containers (Dev Containers)

1. Install the Remote Containers extension:

```bash
code --install-extension ms-vscode-remote.remote-containers
```

2. Create `.devcontainer/devcontainer.json` in your project:

```json
{
    // Name of the development container
    "name": "Ubuntu Development",

    // Use Docker Compose or Dockerfile
    "dockerComposeFile": "docker-compose.yml",
    "service": "app",
    "workspaceFolder": "/workspace",

    // Or use a Dockerfile directly
    // "build": {
    //     "dockerfile": "Dockerfile",
    //     "context": ".."
    // },

    // Features to add (utilities, tools)
    "features": {
        "ghcr.io/devcontainers/features/git:1": {},
        "ghcr.io/devcontainers/features/node:1": {
            "version": "18"
        },
        "ghcr.io/devcontainers/features/python:1": {
            "version": "3.11"
        }
    },

    // Forwarded ports
    "forwardPorts": [3000, 5000, 8080],

    // VS Code settings for the container
    "customizations": {
        "vscode": {
            "extensions": [
                "ms-python.python",
                "ms-python.vscode-pylance",
                "dbaeumer.vscode-eslint",
                "esbenp.prettier-vscode"
            ],
            "settings": {
                "terminal.integrated.defaultProfile.linux": "bash",
                "python.defaultInterpreterPath": "/usr/local/bin/python"
            }
        }
    },

    // Commands to run
    "postCreateCommand": "pip install -r requirements.txt && npm install",
    "postStartCommand": "echo 'Container started!'",

    // User configuration
    "remoteUser": "vscode"
}
```

3. Create `.devcontainer/docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: ..
      dockerfile: .devcontainer/Dockerfile
    volumes:
      - ..:/workspace:cached
      - ~/.ssh:/home/vscode/.ssh:ro
    command: sleep infinity
    environment:
      - NODE_ENV=development

  # Add additional services as needed
  db:
    image: postgres:14
    environment:
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: devdb
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

4. Create `.devcontainer/Dockerfile`:

```dockerfile
# Use Ubuntu as base image
FROM ubuntu:22.04

# Avoid prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install essential tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    vim \
    sudo \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Set default user
USER $USERNAME
```

---

## Debugging Configuration

VS Code's debugging capabilities are powerful and flexible. Here is how to set up debugging for various languages:

### Debug Configuration File

Create `.vscode/launch.json` in your project:

```json
{
    "version": "0.2.0",
    "configurations": [
        // ===========================================
        // PYTHON DEBUGGING
        // ===========================================
        {
            "name": "Python: Current File",
            "type": "debugpy",
            "request": "launch",
            "program": "${file}",
            "console": "integratedTerminal",
            "justMyCode": true,
            "cwd": "${workspaceFolder}"
        },
        {
            "name": "Python: Flask App",
            "type": "debugpy",
            "request": "launch",
            "module": "flask",
            "env": {
                "FLASK_APP": "app.py",
                "FLASK_DEBUG": "1"
            },
            "args": ["run", "--no-debugger", "--no-reload"],
            "jinja": true,
            "justMyCode": false
        },
        {
            "name": "Python: Django",
            "type": "debugpy",
            "request": "launch",
            "program": "${workspaceFolder}/manage.py",
            "args": ["runserver", "--noreload"],
            "django": true,
            "justMyCode": false
        },
        {
            "name": "Python: FastAPI",
            "type": "debugpy",
            "request": "launch",
            "module": "uvicorn",
            "args": ["main:app", "--reload", "--port", "8000"],
            "jinja": true
        },
        {
            "name": "Python: Pytest",
            "type": "debugpy",
            "request": "launch",
            "module": "pytest",
            "args": ["-v", "${file}"],
            "console": "integratedTerminal"
        },

        // ===========================================
        // JAVASCRIPT/TYPESCRIPT DEBUGGING
        // ===========================================
        {
            "name": "Node: Current File",
            "type": "node",
            "request": "launch",
            "program": "${file}",
            "console": "integratedTerminal",
            "skipFiles": ["<node_internals>/**"]
        },
        {
            "name": "Node: npm start",
            "type": "node",
            "request": "launch",
            "runtimeExecutable": "npm",
            "runtimeArgs": ["start"],
            "console": "integratedTerminal",
            "skipFiles": ["<node_internals>/**"]
        },
        {
            "name": "Node: Express App",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/src/index.js",
            "env": {
                "NODE_ENV": "development",
                "PORT": "3000"
            },
            "console": "integratedTerminal"
        },
        {
            "name": "Node: Attach to Process",
            "type": "node",
            "request": "attach",
            "port": 9229,
            "skipFiles": ["<node_internals>/**"]
        },
        {
            "name": "Jest: Current File",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/node_modules/.bin/jest",
            "args": ["${fileBasenameNoExtension}", "--config", "jest.config.js"],
            "console": "integratedTerminal",
            "internalConsoleOptions": "neverOpen"
        },

        // ===========================================
        // CHROME DEBUGGING (Frontend)
        // ===========================================
        {
            "name": "Chrome: Launch",
            "type": "chrome",
            "request": "launch",
            "url": "http://localhost:3000",
            "webRoot": "${workspaceFolder}/src",
            "sourceMaps": true
        },
        {
            "name": "Chrome: Attach",
            "type": "chrome",
            "request": "attach",
            "port": 9222,
            "webRoot": "${workspaceFolder}/src"
        },

        // ===========================================
        // GO DEBUGGING
        // ===========================================
        {
            "name": "Go: Launch Package",
            "type": "go",
            "request": "launch",
            "mode": "auto",
            "program": "${workspaceFolder}",
            "env": {},
            "args": []
        },
        {
            "name": "Go: Launch File",
            "type": "go",
            "request": "launch",
            "mode": "debug",
            "program": "${file}"
        },
        {
            "name": "Go: Test Current File",
            "type": "go",
            "request": "launch",
            "mode": "test",
            "program": "${file}"
        },

        // ===========================================
        // RUST DEBUGGING
        // ===========================================
        {
            "name": "Rust: Debug",
            "type": "lldb",
            "request": "launch",
            "program": "${workspaceFolder}/target/debug/${workspaceFolderBasename}",
            "args": [],
            "cwd": "${workspaceFolder}",
            "preLaunchTask": "cargo build"
        },

        // ===========================================
        // DOCKER DEBUGGING
        // ===========================================
        {
            "name": "Docker: Python",
            "type": "docker",
            "request": "launch",
            "preLaunchTask": "docker-run: debug",
            "python": {
                "pathMappings": [
                    {
                        "localRoot": "${workspaceFolder}",
                        "remoteRoot": "/app"
                    }
                ],
                "projectType": "flask"
            }
        }
    ],

    // ===========================================
    // COMPOUND CONFIGURATIONS
    // ===========================================
    "compounds": [
        {
            "name": "Full Stack: Node + Chrome",
            "configurations": ["Node: Express App", "Chrome: Launch"],
            "stopAll": true
        },
        {
            "name": "Full Stack: Python + Chrome",
            "configurations": ["Python: Flask App", "Chrome: Launch"],
            "stopAll": true
        }
    ]
}
```

### Debug Settings in settings.json

```json
{
    // Debug console settings
    "debug.console.fontSize": 13,
    "debug.console.fontFamily": "monospace",
    "debug.console.wordWrap": true,

    // Debug behavior
    "debug.inlineValues": "on",              // Show inline values during debug
    "debug.showBreakpointsInOverviewRuler": true,
    "debug.toolBarLocation": "floating",     // Floating debug toolbar
    "debug.openDebug": "openOnDebugBreak",   // Open debug view on breakpoint
    "debug.internalConsoleOptions": "openOnSessionStart",

    // Breakpoint settings
    "debug.allowBreakpointsEverywhere": false,
    "debug.showSubSessionsInToolBar": true
}
```

---

## Workspace Settings

Workspace settings allow you to configure VS Code on a per-project basis, ensuring consistent development environments across teams.

### Single-Folder Workspace

Create `.vscode/settings.json` in your project root:

```json
{
    // ===========================================
    // PROJECT-SPECIFIC SETTINGS
    // ===========================================

    // Override user settings for this project
    "editor.tabSize": 2,
    "editor.formatOnSave": true,

    // Python project settings
    "python.defaultInterpreterPath": "${workspaceFolder}/venv/bin/python",
    "python.analysis.typeCheckingMode": "basic",
    "python.testing.pytestEnabled": true,
    "python.testing.pytestArgs": ["tests"],

    // Node.js project settings
    "typescript.tsdk": "node_modules/typescript/lib",

    // Linting
    "eslint.workingDirectories": ["./src"],
    "python.linting.enabled": true,
    "python.linting.pylintEnabled": true,

    // Formatting
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "[python]": {
        "editor.defaultFormatter": "ms-python.black-formatter"
    },

    // File associations for this project
    "files.associations": {
        "*.env.*": "dotenv",
        "Dockerfile.*": "dockerfile"
    },

    // Search exclusions for this project
    "search.exclude": {
        "**/coverage": true,
        "**/dist": true,
        "**/.next": true
    }
}
```

### Multi-Root Workspace

Create a `.code-workspace` file for multi-root workspaces:

```json
{
    // Workspace file: myproject.code-workspace
    "folders": [
        {
            // Frontend application
            "name": "Frontend",
            "path": "./frontend"
        },
        {
            // Backend API
            "name": "Backend API",
            "path": "./backend"
        },
        {
            // Shared libraries
            "name": "Shared",
            "path": "./shared"
        },
        {
            // Infrastructure as code
            "name": "Infrastructure",
            "path": "./infrastructure"
        }
    ],

    "settings": {
        // ===========================================
        // GLOBAL WORKSPACE SETTINGS
        // ===========================================

        "editor.formatOnSave": true,
        "files.trimTrailingWhitespace": true,

        // Folder-specific settings using folder name
        "python.defaultInterpreterPath": "${workspaceFolder:Backend API}/venv/bin/python",

        // Search across all folders
        "search.exclude": {
            "**/node_modules": true,
            "**/venv": true,
            "**/dist": true
        }
    },

    "launch": {
        "version": "0.2.0",
        "configurations": [
            {
                "name": "Frontend: Dev Server",
                "type": "chrome",
                "request": "launch",
                "url": "http://localhost:3000",
                "webRoot": "${workspaceFolder:Frontend}/src"
            },
            {
                "name": "Backend: Flask API",
                "type": "debugpy",
                "request": "launch",
                "module": "flask",
                "cwd": "${workspaceFolder:Backend API}",
                "env": {
                    "FLASK_APP": "app.py"
                },
                "args": ["run"]
            }
        ],
        "compounds": [
            {
                "name": "Full Stack",
                "configurations": ["Frontend: Dev Server", "Backend: Flask API"]
            }
        ]
    },

    "tasks": {
        "version": "2.0.0",
        "tasks": [
            {
                "label": "Install All Dependencies",
                "dependsOn": ["Install Frontend", "Install Backend"],
                "problemMatcher": []
            },
            {
                "label": "Install Frontend",
                "type": "shell",
                "command": "npm install",
                "options": {
                    "cwd": "${workspaceFolder:Frontend}"
                }
            },
            {
                "label": "Install Backend",
                "type": "shell",
                "command": "pip install -r requirements.txt",
                "options": {
                    "cwd": "${workspaceFolder:Backend API}"
                }
            }
        ]
    },

    "extensions": {
        // Recommended extensions for this workspace
        "recommendations": [
            "ms-python.python",
            "ms-python.vscode-pylance",
            "dbaeumer.vscode-eslint",
            "esbenp.prettier-vscode",
            "bradlc.vscode-tailwindcss"
        ],
        // Extensions that should not be recommended
        "unwantedRecommendations": []
    }
}
```

### Recommended Extensions File

Create `.vscode/extensions.json`:

```json
{
    // Extensions recommended for this project
    "recommendations": [
        // Core development
        "ms-python.python",
        "ms-python.vscode-pylance",
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",

        // Git
        "eamodio.gitlens",

        // Docker
        "ms-azuretools.vscode-docker",

        // Testing
        "hbenl.vscode-test-explorer",

        // API development
        "humao.rest-client",

        // Documentation
        "yzhang.markdown-all-in-one"
    ],

    // Extensions that are not recommended for this project
    "unwantedRecommendations": [
        // Conflicts with project formatter
        "hookyqr.beautify"
    ]
}
```

---

## Performance Optimization

Optimize VS Code for better performance, especially on large projects:

### Performance Settings

```json
{
    // ===========================================
    // FILE WATCHING AND SEARCH OPTIMIZATION
    // ===========================================

    // Exclude large directories from file watching
    // This significantly improves performance on large projects
    "files.watcherExclude": {
        "**/.git/objects/**": true,
        "**/.git/subtree-cache/**": true,
        "**/node_modules/**": true,
        "**/venv/**": true,
        "**/.venv/**": true,
        "**/dist/**": true,
        "**/build/**": true,
        "**/.next/**": true,
        "**/coverage/**": true,
        "**/__pycache__/**": true,
        "**/.pytest_cache/**": true,
        "**/logs/**": true,
        "**/*.log": true
    },

    // Exclude from search
    "search.exclude": {
        "**/node_modules": true,
        "**/bower_components": true,
        "**/*.code-search": true,
        "**/dist": true,
        "**/build": true,
        "**/coverage": true,
        "**/venv": true,
        "**/.venv": true,
        "**/__pycache__": true,
        "**/package-lock.json": true,
        "**/yarn.lock": true,
        "**/pnpm-lock.yaml": true
    },

    // Exclude from explorer
    "files.exclude": {
        "**/.git": true,
        "**/.svn": true,
        "**/.hg": true,
        "**/CVS": true,
        "**/.DS_Store": true,
        "**/Thumbs.db": true,
        "**/__pycache__": true,
        "**/*.pyc": true,
        "**/.pytest_cache": true
    },

    // ===========================================
    // EDITOR PERFORMANCE
    // ===========================================

    // Disable features that consume resources
    "editor.minimap.enabled": false,        // Disable minimap for performance
    "editor.renderWhitespace": "none",      // Don't render whitespace
    "editor.renderControlCharacters": false,
    "editor.renderLineHighlight": "line",   // Only highlight line number

    // Reduce smooth scrolling animations
    "editor.smoothScrolling": false,
    "editor.cursorSmoothCaretAnimation": "off",
    "workbench.list.smoothScrolling": false,

    // Disable bracket colorization if not needed
    "editor.bracketPairColorization.enabled": false,
    "editor.guides.bracketPairs": false,

    // Limit suggestions
    "editor.quickSuggestions": {
        "other": true,
        "comments": false,
        "strings": false
    },
    "editor.suggest.maxVisibleSuggestions": 10,

    // ===========================================
    // TELEMETRY AND BACKGROUND PROCESSES
    // ===========================================

    // Disable telemetry (also improves privacy)
    "telemetry.telemetryLevel": "off",

    // Reduce Git background operations
    "git.autorefresh": false,
    "git.autofetch": false,

    // ===========================================
    // EXTENSION PERFORMANCE
    // ===========================================

    // TypeScript/JavaScript
    "typescript.disableAutomaticTypeAcquisition": true,
    "javascript.suggest.autoImports": false,
    "typescript.suggest.autoImports": false,

    // Python
    "python.analysis.indexing": false,       // Disable indexing for large projects
    "python.analysis.autoSearchPaths": false,

    // ESLint
    "eslint.run": "onSave",                 // Run ESLint only on save, not on type

    // ===========================================
    // MEMORY MANAGEMENT
    // ===========================================

    // Large file handling
    "files.maxMemoryForLargeFilesMB": 4096,

    // Limit integrated terminal scrollback
    "terminal.integrated.scrollback": 5000
}
```

### Command-Line Performance Options

```bash
# Start VS Code with performance logging
code --verbose --log trace

# Start VS Code without extensions (for troubleshooting)
code --disable-extensions

# Start VS Code with limited memory
code --max-memory=4096

# Check VS Code process info
# Open Developer Tools: Help > Toggle Developer Tools
# Go to Console tab and run: process.memoryUsage()

# Profile VS Code startup
code --prof-startup
```

### Performance Troubleshooting

```bash
# Check which extensions are slow
# 1. Open Command Palette (Ctrl+Shift+P)
# 2. Run: Developer: Show Running Extensions
# 3. Look for extensions with high activation time

# Generate a performance report
# 1. Open Command Palette
# 2. Run: Developer: Startup Performance

# Clear VS Code cache (if experiencing issues)
rm -rf ~/.config/Code/Cache
rm -rf ~/.config/Code/CachedData
rm -rf ~/.config/Code/CachedExtensions
rm -rf ~/.config/Code/CachedExtensionVSIXs

# Reset VS Code to default settings (backup first!)
cp ~/.config/Code/User/settings.json ~/.config/Code/User/settings.json.backup
rm ~/.config/Code/User/settings.json
```

---

## Conclusion

Visual Studio Code is a powerful and versatile editor that can significantly enhance your development workflow on Ubuntu. By following this guide, you have learned how to:

- Install VS Code using multiple methods (Snap, APT, .deb)
- Configure the editor for optimal performance
- Set up essential extensions for your development stack
- Master keyboard shortcuts for increased productivity
- Configure the integrated terminal for seamless command-line work
- Leverage Git integration for version control
- Use remote development features for servers and containers
- Set up debugging configurations for various languages
- Create workspace settings for team consistency
- Optimize performance for large projects

With these configurations in place, you will have a professional development environment tailored to your needs.

---

## Monitor Your Applications with OneUptime

While VS Code helps you write better code, ensuring your applications run smoothly in production is equally important. **[OneUptime](https://oneuptime.com)** is a comprehensive observability platform that helps you monitor the health and performance of your applications.

With OneUptime, you can:

- **Monitor Uptime**: Get instant alerts when your services go down
- **Track Performance**: Monitor response times and identify bottlenecks
- **View Logs**: Centralize and search through your application logs
- **Create Status Pages**: Keep your users informed about service status
- **Set Up Alerts**: Configure notifications via email, SMS, Slack, and more
- **Analyze Metrics**: Visualize application metrics with customizable dashboards

Whether you are building a personal project or managing enterprise infrastructure, OneUptime provides the observability tools you need to maintain reliable, high-performing applications.

**Get started with OneUptime today at [https://oneuptime.com](https://oneuptime.com)**
