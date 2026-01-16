# How to Install and Configure Neovim on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Neovim, Editor, Vim, Development, Tutorial

Description: Complete guide to installing and configuring Neovim as a development IDE on Ubuntu.

---

Neovim is a modern, extensible text editor that builds upon Vim's legacy while introducing powerful new features like built-in LSP support, Lua-based configuration, and asynchronous plugin architecture. This comprehensive guide will walk you through installing Neovim on Ubuntu and transforming it into a full-featured development IDE.

## Table of Contents

1. [Installing Neovim](#installing-neovim)
2. [Basic Configuration with init.lua](#basic-configuration-with-initlua)
3. [Plugin Management with lazy.nvim](#plugin-management-with-lazynvim)
4. [Essential Plugins](#essential-plugins)
5. [Language Server Protocol Setup](#language-server-protocol-setup)
6. [Code Completion with nvim-cmp](#code-completion-with-nvim-cmp)
7. [File Explorer with nvim-tree](#file-explorer-with-nvim-tree)
8. [Git Integration](#git-integration)
9. [Debugging with nvim-dap](#debugging-with-nvim-dap)
10. [Key Mappings](#key-mappings)
11. [Colorschemes and UI](#colorschemes-and-ui)
12. [Useful Neovim Commands](#useful-neovim-commands)
13. [Complete Configuration](#complete-configuration)

---

## Installing Neovim

There are several methods to install Neovim on Ubuntu. Choose the one that best fits your needs.

### Method 1: Using the Official PPA (Recommended for Stability)

The Ubuntu PPA provides stable Neovim releases that are easy to update:

```bash
# Add the Neovim stable PPA repository
sudo add-apt-repository ppa:neovim-ppa/stable

# Update package lists
sudo apt update

# Install Neovim
sudo apt install neovim
```

For the latest development features, use the unstable PPA instead:

```bash
# Add the unstable PPA for bleeding-edge features
sudo add-apt-repository ppa:neovim-ppa/unstable

# Update and install
sudo apt update
sudo apt install neovim
```

### Method 2: Using AppImage (Portable, No Root Required)

AppImage is perfect for users who want the latest version without system-wide installation:

```bash
# Download the latest Neovim AppImage
curl -LO https://github.com/neovim/neovim/releases/latest/download/nvim.appimage

# Make it executable
chmod u+x nvim.appimage

# Move to a directory in your PATH (optional)
sudo mv nvim.appimage /usr/local/bin/nvim

# Or run directly
./nvim.appimage
```

If you encounter FUSE issues, extract and run directly:

```bash
# Extract the AppImage
./nvim.appimage --appimage-extract

# Run from extracted directory
./squashfs-root/usr/bin/nvim

# Or create a symlink
sudo ln -s $(pwd)/squashfs-root/usr/bin/nvim /usr/local/bin/nvim
```

### Method 3: Building from Source (Maximum Control)

Building from source gives you the latest features and full control:

```bash
# Install build dependencies
sudo apt install ninja-build gettext cmake unzip curl build-essential

# Clone the Neovim repository
git clone https://github.com/neovim/neovim.git
cd neovim

# Checkout the stable branch (or master for latest)
git checkout stable

# Build Neovim with Release optimizations
make CMAKE_BUILD_TYPE=Release

# Install system-wide
sudo make install
```

### Verify Installation

After installation, verify Neovim is working:

```bash
# Check Neovim version
nvim --version

# Run Neovim health check
nvim +checkhealth
```

---

## Basic Configuration with init.lua

Neovim uses Lua for configuration, stored in `~/.config/nvim/init.lua`. Let's create a foundational configuration:

```bash
# Create the Neovim configuration directory
mkdir -p ~/.config/nvim

# Create the main configuration file
touch ~/.config/nvim/init.lua
```

Add this basic configuration to `~/.config/nvim/init.lua`:

```lua
-- ============================================================================
-- NEOVIM BASIC CONFIGURATION
-- ============================================================================
-- This configuration sets up fundamental Neovim options for a better
-- editing experience. Each section is commented for clarity.

-- ----------------------------------------------------------------------------
-- Leader Key Configuration
-- ----------------------------------------------------------------------------
-- Set the leader key to space for easier access to custom mappings
-- Must be set before loading plugins
vim.g.mapleader = " "
vim.g.maplocalleader = " "

-- ----------------------------------------------------------------------------
-- General Options
-- ----------------------------------------------------------------------------
local opt = vim.opt

-- Line numbers
opt.number = true          -- Show absolute line numbers
opt.relativenumber = true  -- Show relative line numbers for easy jumping

-- Tabs and indentation
opt.tabstop = 4           -- Number of spaces a tab counts for
opt.shiftwidth = 4        -- Number of spaces for auto-indent
opt.expandtab = true      -- Convert tabs to spaces
opt.autoindent = true     -- Copy indent from current line when starting new line
opt.smartindent = true    -- Smart auto-indenting for C-like programs

-- Search settings
opt.ignorecase = true     -- Ignore case in search patterns
opt.smartcase = true      -- Override ignorecase if pattern has uppercase
opt.hlsearch = true       -- Highlight all search matches
opt.incsearch = true      -- Show matches as you type

-- Visual settings
opt.termguicolors = true  -- Enable 24-bit RGB colors in the terminal
opt.signcolumn = "yes"    -- Always show the sign column (for git signs, diagnostics)
opt.cursorline = true     -- Highlight the current line
opt.scrolloff = 8         -- Keep 8 lines visible above/below cursor
opt.sidescrolloff = 8     -- Keep 8 columns visible left/right of cursor
opt.wrap = false          -- Don't wrap long lines
opt.colorcolumn = "80"    -- Show column guide at 80 characters

-- Window splitting
opt.splitright = true     -- Open vertical splits to the right
opt.splitbelow = true     -- Open horizontal splits below

-- File handling
opt.swapfile = false      -- Don't create swap files
opt.backup = false        -- Don't create backup files
opt.undofile = true       -- Enable persistent undo
opt.undodir = vim.fn.stdpath("data") .. "/undodir"  -- Set undo directory

-- Clipboard
opt.clipboard = "unnamedplus"  -- Use system clipboard

-- Performance
opt.updatetime = 250      -- Faster completion and diagnostics
opt.timeoutlen = 300      -- Time to wait for mapped sequence to complete

-- Appearance
opt.showmode = false      -- Don't show mode (shown in statusline)
opt.pumheight = 10        -- Maximum number of items in popup menu
opt.cmdheight = 1         -- Height of command line

-- Mouse support
opt.mouse = "a"           -- Enable mouse in all modes

-- ----------------------------------------------------------------------------
-- Basic Keymaps
-- ----------------------------------------------------------------------------
local keymap = vim.keymap.set

-- Better window navigation
keymap("n", "<C-h>", "<C-w>h", { desc = "Move to left window" })
keymap("n", "<C-j>", "<C-w>j", { desc = "Move to lower window" })
keymap("n", "<C-k>", "<C-w>k", { desc = "Move to upper window" })
keymap("n", "<C-l>", "<C-w>l", { desc = "Move to right window" })

-- Better line movement in visual mode
keymap("v", "J", ":m '>+1<CR>gv=gv", { desc = "Move selection down" })
keymap("v", "K", ":m '<-2<CR>gv=gv", { desc = "Move selection up" })

-- Keep cursor centered when scrolling
keymap("n", "<C-d>", "<C-d>zz", { desc = "Scroll down and center" })
keymap("n", "<C-u>", "<C-u>zz", { desc = "Scroll up and center" })

-- Keep search terms centered
keymap("n", "n", "nzzzv", { desc = "Next search result centered" })
keymap("n", "N", "Nzzzv", { desc = "Previous search result centered" })

-- Clear search highlighting
keymap("n", "<Esc>", "<cmd>nohlsearch<CR>", { desc = "Clear search highlight" })

-- Better paste (don't overwrite register)
keymap("x", "<leader>p", '"_dP', { desc = "Paste without overwriting register" })

-- Quick save and quit
keymap("n", "<leader>w", "<cmd>w<CR>", { desc = "Save file" })
keymap("n", "<leader>q", "<cmd>q<CR>", { desc = "Quit" })

-- Buffer navigation
keymap("n", "<S-h>", "<cmd>bprevious<CR>", { desc = "Previous buffer" })
keymap("n", "<S-l>", "<cmd>bnext<CR>", { desc = "Next buffer" })
keymap("n", "<leader>bd", "<cmd>bdelete<CR>", { desc = "Delete buffer" })
```

---

## Plugin Management with lazy.nvim

lazy.nvim is the modern standard for Neovim plugin management, offering lazy loading, automatic dependency resolution, and excellent performance.

### Installing lazy.nvim

Add this to your `init.lua` after the basic configuration:

```lua
-- ============================================================================
-- PLUGIN MANAGER: lazy.nvim
-- ============================================================================
-- Bootstrap lazy.nvim - automatically install if not present

local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"

-- Check if lazy.nvim is installed, if not, clone it
if not vim.loop.fs_stat(lazypath) then
    vim.fn.system({
        "git",
        "clone",
        "--filter=blob:none",
        "https://github.com/folke/lazy.nvim.git",
        "--branch=stable",  -- Use latest stable release
        lazypath,
    })
end

-- Add lazy.nvim to runtime path
vim.opt.rtp:prepend(lazypath)

-- Load lazy.nvim and configure plugins
require("lazy").setup({
    -- Plugins will be added here
    -- Each plugin is a table with configuration options

    -- Plugin specification structure:
    -- { "author/plugin-name", opts = { ... }, config = function() ... end }
}, {
    -- lazy.nvim configuration options
    install = {
        colorscheme = { "tokyonight", "habamax" },  -- Colorschemes to use during install
    },
    checker = {
        enabled = true,     -- Automatically check for plugin updates
        notify = false,     -- Don't notify on updates
    },
    change_detection = {
        notify = false,     -- Don't notify when config changes
    },
})
```

---

## Essential Plugins

Let's add essential plugins for a complete development environment. Update the `require("lazy").setup({...})` call:

```lua
-- ============================================================================
-- PLUGINS CONFIGURATION
-- ============================================================================

require("lazy").setup({
    -- ------------------------------------------------------------------------
    -- Colorscheme: Tokyo Night
    -- ------------------------------------------------------------------------
    {
        "folke/tokyonight.nvim",
        lazy = false,       -- Load immediately (not lazy)
        priority = 1000,    -- Load before other plugins
        config = function()
            require("tokyonight").setup({
                style = "night",        -- Options: storm, moon, night, day
                transparent = false,    -- Disable transparent background
                terminal_colors = true, -- Configure terminal colors
                styles = {
                    comments = { italic = true },
                    keywords = { italic = true },
                    functions = {},
                    variables = {},
                },
            })
            vim.cmd.colorscheme("tokyonight")
        end,
    },

    -- ------------------------------------------------------------------------
    -- Telescope: Fuzzy Finder
    -- ------------------------------------------------------------------------
    {
        "nvim-telescope/telescope.nvim",
        branch = "0.1.x",
        dependencies = {
            "nvim-lua/plenary.nvim",  -- Required dependency
            {
                "nvim-telescope/telescope-fzf-native.nvim",
                build = "make",        -- Build the C extension for better performance
            },
        },
        config = function()
            local telescope = require("telescope")
            local actions = require("telescope.actions")

            telescope.setup({
                defaults = {
                    -- Default mappings inside Telescope
                    mappings = {
                        i = {  -- Insert mode mappings
                            ["<C-j>"] = actions.move_selection_next,
                            ["<C-k>"] = actions.move_selection_previous,
                            ["<C-q>"] = actions.send_selected_to_qflist + actions.open_qflist,
                        },
                    },
                    -- Ignore patterns
                    file_ignore_patterns = {
                        "node_modules",
                        ".git/",
                        "dist/",
                        "build/",
                    },
                },
                pickers = {
                    find_files = {
                        hidden = true,  -- Show hidden files
                    },
                },
            })

            -- Load fzf extension for better sorting
            telescope.load_extension("fzf")

            -- Telescope keymaps
            local builtin = require("telescope.builtin")
            vim.keymap.set("n", "<leader>ff", builtin.find_files, { desc = "Find files" })
            vim.keymap.set("n", "<leader>fg", builtin.live_grep, { desc = "Live grep" })
            vim.keymap.set("n", "<leader>fb", builtin.buffers, { desc = "Find buffers" })
            vim.keymap.set("n", "<leader>fh", builtin.help_tags, { desc = "Help tags" })
            vim.keymap.set("n", "<leader>fr", builtin.oldfiles, { desc = "Recent files" })
            vim.keymap.set("n", "<leader>fc", builtin.git_commits, { desc = "Git commits" })
            vim.keymap.set("n", "<leader>fs", builtin.git_status, { desc = "Git status" })
        end,
    },

    -- ------------------------------------------------------------------------
    -- Treesitter: Syntax Highlighting and Code Understanding
    -- ------------------------------------------------------------------------
    {
        "nvim-treesitter/nvim-treesitter",
        build = ":TSUpdate",  -- Update parsers on install
        dependencies = {
            "nvim-treesitter/nvim-treesitter-textobjects",  -- Enhanced text objects
        },
        config = function()
            require("nvim-treesitter.configs").setup({
                -- Languages to install parsers for
                ensure_installed = {
                    "lua",
                    "vim",
                    "vimdoc",
                    "javascript",
                    "typescript",
                    "python",
                    "rust",
                    "go",
                    "c",
                    "cpp",
                    "json",
                    "yaml",
                    "toml",
                    "html",
                    "css",
                    "markdown",
                    "markdown_inline",
                    "bash",
                    "dockerfile",
                },
                -- Automatically install missing parsers
                auto_install = true,
                -- Enable syntax highlighting
                highlight = {
                    enable = true,
                    additional_vim_regex_highlighting = false,
                },
                -- Enable indentation based on treesitter
                indent = {
                    enable = true,
                },
                -- Enhanced text objects
                textobjects = {
                    select = {
                        enable = true,
                        lookahead = true,
                        keymaps = {
                            ["af"] = "@function.outer",
                            ["if"] = "@function.inner",
                            ["ac"] = "@class.outer",
                            ["ic"] = "@class.inner",
                            ["aa"] = "@parameter.outer",
                            ["ia"] = "@parameter.inner",
                        },
                    },
                    move = {
                        enable = true,
                        goto_next_start = {
                            ["]m"] = "@function.outer",
                            ["]]"] = "@class.outer",
                        },
                        goto_previous_start = {
                            ["[m"] = "@function.outer",
                            ["[["] = "@class.outer",
                        },
                    },
                },
            })
        end,
    },

    -- Continue with more plugins...
})
```

---

## Language Server Protocol Setup

LSP provides intelligent code features like auto-completion, go-to-definition, and diagnostics. We'll use `mason.nvim` and `nvim-lspconfig` for easy LSP management.

Add these plugins to your lazy.nvim configuration:

```lua
    -- ------------------------------------------------------------------------
    -- Mason: LSP/DAP/Linter/Formatter Manager
    -- ------------------------------------------------------------------------
    {
        "williamboman/mason.nvim",
        config = function()
            require("mason").setup({
                ui = {
                    icons = {
                        package_installed = "✓",
                        package_pending = "➜",
                        package_uninstalled = "✗",
                    },
                },
            })
        end,
    },

    -- Mason-LSPConfig: Bridge between mason and lspconfig
    {
        "williamboman/mason-lspconfig.nvim",
        dependencies = { "williamboman/mason.nvim" },
        config = function()
            require("mason-lspconfig").setup({
                -- Language servers to automatically install
                ensure_installed = {
                    "lua_ls",          -- Lua
                    "ts_ls",           -- TypeScript/JavaScript
                    "pyright",         -- Python
                    "rust_analyzer",   -- Rust
                    "gopls",           -- Go
                    "clangd",          -- C/C++
                    "html",            -- HTML
                    "cssls",           -- CSS
                    "jsonls",          -- JSON
                    "yamlls",          -- YAML
                    "bashls",          -- Bash
                    "dockerls",        -- Docker
                },
                -- Automatically set up LSP servers
                automatic_installation = true,
            })
        end,
    },

    -- ------------------------------------------------------------------------
    -- LSP Configuration
    -- ------------------------------------------------------------------------
    {
        "neovim/nvim-lspconfig",
        dependencies = {
            "williamboman/mason.nvim",
            "williamboman/mason-lspconfig.nvim",
            "hrsh7th/cmp-nvim-lsp",   -- LSP source for nvim-cmp
            "folke/neodev.nvim",      -- Neovim Lua development
        },
        config = function()
            -- Set up neodev for Neovim Lua development
            require("neodev").setup()

            local lspconfig = require("lspconfig")
            local cmp_nvim_lsp = require("cmp_nvim_lsp")

            -- Enhanced capabilities with nvim-cmp
            local capabilities = cmp_nvim_lsp.default_capabilities()

            -- Function to run when LSP attaches to a buffer
            local on_attach = function(client, bufnr)
                -- Helper for setting keymaps
                local opts = { buffer = bufnr, silent = true }
                local keymap = vim.keymap.set

                -- LSP Navigation
                keymap("n", "gd", vim.lsp.buf.definition,
                    vim.tbl_extend("force", opts, { desc = "Go to definition" }))
                keymap("n", "gD", vim.lsp.buf.declaration,
                    vim.tbl_extend("force", opts, { desc = "Go to declaration" }))
                keymap("n", "gi", vim.lsp.buf.implementation,
                    vim.tbl_extend("force", opts, { desc = "Go to implementation" }))
                keymap("n", "gr", vim.lsp.buf.references,
                    vim.tbl_extend("force", opts, { desc = "Show references" }))
                keymap("n", "gt", vim.lsp.buf.type_definition,
                    vim.tbl_extend("force", opts, { desc = "Go to type definition" }))

                -- LSP Information
                keymap("n", "K", vim.lsp.buf.hover,
                    vim.tbl_extend("force", opts, { desc = "Hover documentation" }))
                keymap("n", "<C-k>", vim.lsp.buf.signature_help,
                    vim.tbl_extend("force", opts, { desc = "Signature help" }))

                -- LSP Actions
                keymap("n", "<leader>rn", vim.lsp.buf.rename,
                    vim.tbl_extend("force", opts, { desc = "Rename symbol" }))
                keymap({ "n", "v" }, "<leader>ca", vim.lsp.buf.code_action,
                    vim.tbl_extend("force", opts, { desc = "Code actions" }))
                keymap("n", "<leader>f", function()
                    vim.lsp.buf.format({ async = true })
                end, vim.tbl_extend("force", opts, { desc = "Format buffer" }))

                -- Diagnostics
                keymap("n", "[d", vim.diagnostic.goto_prev,
                    vim.tbl_extend("force", opts, { desc = "Previous diagnostic" }))
                keymap("n", "]d", vim.diagnostic.goto_next,
                    vim.tbl_extend("force", opts, { desc = "Next diagnostic" }))
                keymap("n", "<leader>e", vim.diagnostic.open_float,
                    vim.tbl_extend("force", opts, { desc = "Show diagnostic" }))
                keymap("n", "<leader>dl", vim.diagnostic.setloclist,
                    vim.tbl_extend("force", opts, { desc = "Diagnostic list" }))
            end

            -- Configure diagnostic appearance
            vim.diagnostic.config({
                virtual_text = {
                    prefix = "●",      -- Prefix for virtual text
                    source = "if_many", -- Show source if multiple
                },
                signs = true,
                underline = true,
                update_in_insert = false,  -- Don't update diagnostics in insert mode
                severity_sort = true,      -- Sort by severity
                float = {
                    border = "rounded",
                    source = "always",
                },
            })

            -- Diagnostic signs in the gutter
            local signs = { Error = " ", Warn = " ", Hint = "󰠠 ", Info = " " }
            for type, icon in pairs(signs) do
                local hl = "DiagnosticSign" .. type
                vim.fn.sign_define(hl, { text = icon, texthl = hl, numhl = "" })
            end

            -- Configure individual language servers
            -- Lua
            lspconfig.lua_ls.setup({
                capabilities = capabilities,
                on_attach = on_attach,
                settings = {
                    Lua = {
                        workspace = {
                            checkThirdParty = false,
                        },
                        telemetry = {
                            enable = false,
                        },
                        diagnostics = {
                            globals = { "vim" },  -- Recognize vim global
                        },
                    },
                },
            })

            -- TypeScript/JavaScript
            lspconfig.ts_ls.setup({
                capabilities = capabilities,
                on_attach = on_attach,
            })

            -- Python
            lspconfig.pyright.setup({
                capabilities = capabilities,
                on_attach = on_attach,
            })

            -- Rust
            lspconfig.rust_analyzer.setup({
                capabilities = capabilities,
                on_attach = on_attach,
                settings = {
                    ["rust-analyzer"] = {
                        checkOnSave = {
                            command = "clippy",  -- Use clippy for linting
                        },
                    },
                },
            })

            -- Go
            lspconfig.gopls.setup({
                capabilities = capabilities,
                on_attach = on_attach,
            })

            -- C/C++
            lspconfig.clangd.setup({
                capabilities = capabilities,
                on_attach = on_attach,
            })

            -- HTML
            lspconfig.html.setup({
                capabilities = capabilities,
                on_attach = on_attach,
            })

            -- CSS
            lspconfig.cssls.setup({
                capabilities = capabilities,
                on_attach = on_attach,
            })

            -- JSON
            lspconfig.jsonls.setup({
                capabilities = capabilities,
                on_attach = on_attach,
            })

            -- YAML
            lspconfig.yamlls.setup({
                capabilities = capabilities,
                on_attach = on_attach,
            })

            -- Bash
            lspconfig.bashls.setup({
                capabilities = capabilities,
                on_attach = on_attach,
            })

            -- Docker
            lspconfig.dockerls.setup({
                capabilities = capabilities,
                on_attach = on_attach,
            })
        end,
    },
```

---

## Code Completion with nvim-cmp

nvim-cmp provides powerful auto-completion with support for multiple sources.

```lua
    -- ------------------------------------------------------------------------
    -- nvim-cmp: Auto-completion Engine
    -- ------------------------------------------------------------------------
    {
        "hrsh7th/nvim-cmp",
        dependencies = {
            "hrsh7th/cmp-nvim-lsp",     -- LSP completion source
            "hrsh7th/cmp-buffer",        -- Buffer completion source
            "hrsh7th/cmp-path",          -- Path completion source
            "hrsh7th/cmp-cmdline",       -- Command line completion
            "L3MON4D3/LuaSnip",          -- Snippet engine
            "saadparwaiz1/cmp_luasnip",  -- Snippet completion source
            "rafamadriz/friendly-snippets", -- Snippet collection
            "onsails/lspkind.nvim",      -- Completion icons
        },
        config = function()
            local cmp = require("cmp")
            local luasnip = require("luasnip")
            local lspkind = require("lspkind")

            -- Load friendly-snippets
            require("luasnip.loaders.from_vscode").lazy_load()

            cmp.setup({
                -- Snippet expansion
                snippet = {
                    expand = function(args)
                        luasnip.lsp_expand(args.body)
                    end,
                },

                -- Completion window appearance
                window = {
                    completion = cmp.config.window.bordered(),
                    documentation = cmp.config.window.bordered(),
                },

                -- Key mappings for completion
                mapping = cmp.mapping.preset.insert({
                    -- Navigate completion menu
                    ["<C-k>"] = cmp.mapping.select_prev_item(),
                    ["<C-j>"] = cmp.mapping.select_next_item(),

                    -- Scroll documentation
                    ["<C-b>"] = cmp.mapping.scroll_docs(-4),
                    ["<C-f>"] = cmp.mapping.scroll_docs(4),

                    -- Trigger completion
                    ["<C-Space>"] = cmp.mapping.complete(),

                    -- Cancel completion
                    ["<C-e>"] = cmp.mapping.abort(),

                    -- Confirm selection
                    ["<CR>"] = cmp.mapping.confirm({ select = false }),

                    -- Tab for completion and snippet navigation
                    ["<Tab>"] = cmp.mapping(function(fallback)
                        if cmp.visible() then
                            cmp.select_next_item()
                        elseif luasnip.expand_or_jumpable() then
                            luasnip.expand_or_jump()
                        else
                            fallback()
                        end
                    end, { "i", "s" }),

                    -- Shift-Tab for reverse navigation
                    ["<S-Tab>"] = cmp.mapping(function(fallback)
                        if cmp.visible() then
                            cmp.select_prev_item()
                        elseif luasnip.jumpable(-1) then
                            luasnip.jump(-1)
                        else
                            fallback()
                        end
                    end, { "i", "s" }),
                }),

                -- Completion sources (ordered by priority)
                sources = cmp.config.sources({
                    { name = "nvim_lsp", priority = 1000 },  -- LSP
                    { name = "luasnip", priority = 750 },    -- Snippets
                    { name = "buffer", priority = 500 },      -- Buffer words
                    { name = "path", priority = 250 },        -- File paths
                }),

                -- Formatting with icons
                formatting = {
                    format = lspkind.cmp_format({
                        mode = "symbol_text",  -- Show symbol and text
                        maxwidth = 50,
                        ellipsis_char = "...",
                        menu = {
                            nvim_lsp = "[LSP]",
                            luasnip = "[Snippet]",
                            buffer = "[Buffer]",
                            path = "[Path]",
                        },
                    }),
                },

                -- Experimental features
                experimental = {
                    ghost_text = true,  -- Show preview of completion
                },
            })

            -- Command line completion for /
            cmp.setup.cmdline("/", {
                mapping = cmp.mapping.preset.cmdline(),
                sources = {
                    { name = "buffer" },
                },
            })

            -- Command line completion for :
            cmp.setup.cmdline(":", {
                mapping = cmp.mapping.preset.cmdline(),
                sources = cmp.config.sources({
                    { name = "path" },
                }, {
                    { name = "cmdline" },
                }),
            })
        end,
    },
```

---

## File Explorer with nvim-tree

nvim-tree provides a file explorer sidebar similar to VS Code.

```lua
    -- ------------------------------------------------------------------------
    -- nvim-tree: File Explorer
    -- ------------------------------------------------------------------------
    {
        "nvim-tree/nvim-tree.lua",
        dependencies = {
            "nvim-tree/nvim-web-devicons",  -- File icons
        },
        config = function()
            -- Disable netrw (Vim's built-in file explorer)
            vim.g.loaded_netrw = 1
            vim.g.loaded_netrwPlugin = 1

            require("nvim-tree").setup({
                -- Sort files naturally (1, 2, 10 instead of 1, 10, 2)
                sort_by = "case_sensitive",

                -- View configuration
                view = {
                    width = 35,
                    side = "left",
                    number = false,
                    relativenumber = false,
                },

                -- Renderer configuration
                renderer = {
                    group_empty = true,  -- Group empty folders
                    highlight_git = true,
                    icons = {
                        show = {
                            file = true,
                            folder = true,
                            folder_arrow = true,
                            git = true,
                        },
                    },
                },

                -- Filter configuration
                filters = {
                    dotfiles = false,  -- Show dotfiles
                    custom = {
                        ".git",
                        "node_modules",
                        ".cache",
                    },
                },

                -- Git integration
                git = {
                    enable = true,
                    ignore = false,
                },

                -- Actions
                actions = {
                    open_file = {
                        quit_on_open = false,  -- Keep tree open when opening file
                        resize_window = true,
                    },
                },

                -- Update focused file
                update_focused_file = {
                    enable = true,
                    update_root = false,
                },
            })

            -- Keymaps
            vim.keymap.set("n", "<leader>e", "<cmd>NvimTreeToggle<CR>",
                { desc = "Toggle file explorer" })
            vim.keymap.set("n", "<leader>o", "<cmd>NvimTreeFocus<CR>",
                { desc = "Focus file explorer" })
        end,
    },
```

---

## Git Integration

### Gitsigns: Git Signs in the Gutter

```lua
    -- ------------------------------------------------------------------------
    -- Gitsigns: Git Integration
    -- ------------------------------------------------------------------------
    {
        "lewis6991/gitsigns.nvim",
        config = function()
            require("gitsigns").setup({
                -- Sign characters
                signs = {
                    add = { text = "│" },
                    change = { text = "│" },
                    delete = { text = "_" },
                    topdelete = { text = "‾" },
                    changedelete = { text = "~" },
                    untracked = { text = "┆" },
                },

                -- Sign column configuration
                signcolumn = true,
                numhl = false,
                linehl = false,
                word_diff = false,

                -- Watch gitdir for changes
                watch_gitdir = {
                    interval = 1000,
                    follow_files = true,
                },

                -- Attach to untracked files
                attach_to_untracked = true,

                -- Current line blame
                current_line_blame = true,
                current_line_blame_opts = {
                    virt_text = true,
                    virt_text_pos = "eol",
                    delay = 500,
                },
                current_line_blame_formatter = "<author>, <author_time:%Y-%m-%d> - <summary>",

                -- Keymaps
                on_attach = function(bufnr)
                    local gs = package.loaded.gitsigns
                    local opts = { buffer = bufnr }

                    -- Navigation
                    vim.keymap.set("n", "]c", function()
                        if vim.wo.diff then return "]c" end
                        vim.schedule(function() gs.next_hunk() end)
                        return "<Ignore>"
                    end, vim.tbl_extend("force", opts, { expr = true, desc = "Next hunk" }))

                    vim.keymap.set("n", "[c", function()
                        if vim.wo.diff then return "[c" end
                        vim.schedule(function() gs.prev_hunk() end)
                        return "<Ignore>"
                    end, vim.tbl_extend("force", opts, { expr = true, desc = "Previous hunk" }))

                    -- Actions
                    vim.keymap.set("n", "<leader>hs", gs.stage_hunk,
                        vim.tbl_extend("force", opts, { desc = "Stage hunk" }))
                    vim.keymap.set("n", "<leader>hr", gs.reset_hunk,
                        vim.tbl_extend("force", opts, { desc = "Reset hunk" }))
                    vim.keymap.set("v", "<leader>hs", function()
                        gs.stage_hunk({ vim.fn.line("."), vim.fn.line("v") })
                    end, vim.tbl_extend("force", opts, { desc = "Stage selected hunk" }))
                    vim.keymap.set("v", "<leader>hr", function()
                        gs.reset_hunk({ vim.fn.line("."), vim.fn.line("v") })
                    end, vim.tbl_extend("force", opts, { desc = "Reset selected hunk" }))
                    vim.keymap.set("n", "<leader>hS", gs.stage_buffer,
                        vim.tbl_extend("force", opts, { desc = "Stage buffer" }))
                    vim.keymap.set("n", "<leader>hu", gs.undo_stage_hunk,
                        vim.tbl_extend("force", opts, { desc = "Undo stage hunk" }))
                    vim.keymap.set("n", "<leader>hR", gs.reset_buffer,
                        vim.tbl_extend("force", opts, { desc = "Reset buffer" }))
                    vim.keymap.set("n", "<leader>hp", gs.preview_hunk,
                        vim.tbl_extend("force", opts, { desc = "Preview hunk" }))
                    vim.keymap.set("n", "<leader>hb", function()
                        gs.blame_line({ full = true })
                    end, vim.tbl_extend("force", opts, { desc = "Blame line" }))
                    vim.keymap.set("n", "<leader>hd", gs.diffthis,
                        vim.tbl_extend("force", opts, { desc = "Diff this" }))
                    vim.keymap.set("n", "<leader>hD", function()
                        gs.diffthis("~")
                    end, vim.tbl_extend("force", opts, { desc = "Diff this ~" }))
                end,
            })
        end,
    },

    -- ------------------------------------------------------------------------
    -- Vim-Fugitive: Git Commands
    -- ------------------------------------------------------------------------
    {
        "tpope/vim-fugitive",
        cmd = { "Git", "G", "Gdiffsplit", "Gread", "Gwrite", "Ggrep", "GMove", "GDelete", "GBrowse" },
        keys = {
            { "<leader>gs", "<cmd>Git<CR>", desc = "Git status (Fugitive)" },
            { "<leader>gc", "<cmd>Git commit<CR>", desc = "Git commit" },
            { "<leader>gp", "<cmd>Git push<CR>", desc = "Git push" },
            { "<leader>gl", "<cmd>Git pull<CR>", desc = "Git pull" },
            { "<leader>gB", "<cmd>Git blame<CR>", desc = "Git blame" },
            { "<leader>gd", "<cmd>Gdiffsplit<CR>", desc = "Git diff split" },
        },
    },
```

---

## Debugging with nvim-dap

nvim-dap provides debugging capabilities similar to VS Code.

```lua
    -- ------------------------------------------------------------------------
    -- nvim-dap: Debug Adapter Protocol
    -- ------------------------------------------------------------------------
    {
        "mfussenegger/nvim-dap",
        dependencies = {
            "rcarriga/nvim-dap-ui",      -- UI for DAP
            "nvim-neotest/nvim-nio",     -- Required by dap-ui
            "theHamsta/nvim-dap-virtual-text",  -- Virtual text during debugging
            "jay-babu/mason-nvim-dap.nvim",     -- Mason integration for DAP
        },
        config = function()
            local dap = require("dap")
            local dapui = require("dapui")

            -- Mason DAP setup
            require("mason-nvim-dap").setup({
                ensure_installed = {
                    "python",      -- debugpy
                    "codelldb",    -- C/C++/Rust
                    "js",          -- JavaScript/TypeScript
                    "delve",       -- Go
                },
                automatic_installation = true,
                handlers = {},
            })

            -- DAP UI setup
            dapui.setup({
                icons = {
                    expanded = "▾",
                    collapsed = "▸",
                    current_frame = "●",
                },
                layouts = {
                    {
                        elements = {
                            { id = "scopes", size = 0.25 },
                            { id = "breakpoints", size = 0.25 },
                            { id = "stacks", size = 0.25 },
                            { id = "watches", size = 0.25 },
                        },
                        size = 40,
                        position = "left",
                    },
                    {
                        elements = {
                            { id = "repl", size = 0.5 },
                            { id = "console", size = 0.5 },
                        },
                        size = 10,
                        position = "bottom",
                    },
                },
            })

            -- Virtual text setup
            require("nvim-dap-virtual-text").setup({
                enabled = true,
                commented = true,
            })

            -- Automatically open/close DAP UI
            dap.listeners.after.event_initialized["dapui_config"] = function()
                dapui.open()
            end
            dap.listeners.before.event_terminated["dapui_config"] = function()
                dapui.close()
            end
            dap.listeners.before.event_exited["dapui_config"] = function()
                dapui.close()
            end

            -- DAP Signs
            vim.fn.sign_define("DapBreakpoint", {
                text = "●",
                texthl = "DapBreakpoint",
                linehl = "",
                numhl = "",
            })
            vim.fn.sign_define("DapBreakpointCondition", {
                text = "●",
                texthl = "DapBreakpointCondition",
                linehl = "",
                numhl = "",
            })
            vim.fn.sign_define("DapStopped", {
                text = "→",
                texthl = "DapStopped",
                linehl = "DapStoppedLine",
                numhl = "",
            })

            -- Keymaps
            vim.keymap.set("n", "<F5>", dap.continue, { desc = "Debug: Continue" })
            vim.keymap.set("n", "<F10>", dap.step_over, { desc = "Debug: Step Over" })
            vim.keymap.set("n", "<F11>", dap.step_into, { desc = "Debug: Step Into" })
            vim.keymap.set("n", "<F12>", dap.step_out, { desc = "Debug: Step Out" })
            vim.keymap.set("n", "<leader>db", dap.toggle_breakpoint, { desc = "Toggle breakpoint" })
            vim.keymap.set("n", "<leader>dB", function()
                dap.set_breakpoint(vim.fn.input("Breakpoint condition: "))
            end, { desc = "Conditional breakpoint" })
            vim.keymap.set("n", "<leader>dr", dap.repl.open, { desc = "Open REPL" })
            vim.keymap.set("n", "<leader>du", dapui.toggle, { desc = "Toggle DAP UI" })
            vim.keymap.set("n", "<leader>dl", dap.run_last, { desc = "Run last debug config" })
        end,
    },
```

---

## Key Mappings

Here's a summary of all the key mappings configured in this setup:

### General Navigation

| Key | Mode | Description |
|-----|------|-------------|
| `<Space>` | All | Leader key |
| `<C-h/j/k/l>` | Normal | Navigate between windows |
| `<C-d>` | Normal | Scroll down (centered) |
| `<C-u>` | Normal | Scroll up (centered) |
| `J/K` | Visual | Move selection down/up |
| `<S-h>` | Normal | Previous buffer |
| `<S-l>` | Normal | Next buffer |

### File Operations

| Key | Mode | Description |
|-----|------|-------------|
| `<leader>w` | Normal | Save file |
| `<leader>q` | Normal | Quit |
| `<leader>e` | Normal | Toggle file explorer |
| `<leader>o` | Normal | Focus file explorer |

### Telescope (Fuzzy Finder)

| Key | Mode | Description |
|-----|------|-------------|
| `<leader>ff` | Normal | Find files |
| `<leader>fg` | Normal | Live grep |
| `<leader>fb` | Normal | Find buffers |
| `<leader>fh` | Normal | Help tags |
| `<leader>fr` | Normal | Recent files |
| `<leader>fc` | Normal | Git commits |
| `<leader>fs` | Normal | Git status |

### LSP

| Key | Mode | Description |
|-----|------|-------------|
| `gd` | Normal | Go to definition |
| `gD` | Normal | Go to declaration |
| `gi` | Normal | Go to implementation |
| `gr` | Normal | Show references |
| `gt` | Normal | Go to type definition |
| `K` | Normal | Hover documentation |
| `<C-k>` | Normal | Signature help |
| `<leader>rn` | Normal | Rename symbol |
| `<leader>ca` | Normal/Visual | Code actions |
| `<leader>f` | Normal | Format buffer |
| `[d` | Normal | Previous diagnostic |
| `]d` | Normal | Next diagnostic |
| `<leader>e` | Normal | Show diagnostic |

### Git

| Key | Mode | Description |
|-----|------|-------------|
| `]c` | Normal | Next hunk |
| `[c` | Normal | Previous hunk |
| `<leader>hs` | Normal/Visual | Stage hunk |
| `<leader>hr` | Normal/Visual | Reset hunk |
| `<leader>hS` | Normal | Stage buffer |
| `<leader>hu` | Normal | Undo stage hunk |
| `<leader>hp` | Normal | Preview hunk |
| `<leader>hb` | Normal | Blame line |
| `<leader>hd` | Normal | Diff this |
| `<leader>gs` | Normal | Git status (Fugitive) |
| `<leader>gc` | Normal | Git commit |
| `<leader>gp` | Normal | Git push |
| `<leader>gl` | Normal | Git pull |

### Debugging

| Key | Mode | Description |
|-----|------|-------------|
| `<F5>` | Normal | Continue |
| `<F10>` | Normal | Step over |
| `<F11>` | Normal | Step into |
| `<F12>` | Normal | Step out |
| `<leader>db` | Normal | Toggle breakpoint |
| `<leader>dB` | Normal | Conditional breakpoint |
| `<leader>dr` | Normal | Open REPL |
| `<leader>du` | Normal | Toggle DAP UI |

---

## Colorschemes and UI

### Additional UI Plugins

```lua
    -- ------------------------------------------------------------------------
    -- Lualine: Statusline
    -- ------------------------------------------------------------------------
    {
        "nvim-lualine/lualine.nvim",
        dependencies = { "nvim-tree/nvim-web-devicons" },
        config = function()
            require("lualine").setup({
                options = {
                    theme = "tokyonight",
                    component_separators = { left = "", right = "" },
                    section_separators = { left = "", right = "" },
                    globalstatus = true,
                },
                sections = {
                    lualine_a = { "mode" },
                    lualine_b = { "branch", "diff", "diagnostics" },
                    lualine_c = { { "filename", path = 1 } },
                    lualine_x = { "encoding", "fileformat", "filetype" },
                    lualine_y = { "progress" },
                    lualine_z = { "location" },
                },
            })
        end,
    },

    -- ------------------------------------------------------------------------
    -- Bufferline: Buffer Tabs
    -- ------------------------------------------------------------------------
    {
        "akinsho/bufferline.nvim",
        version = "*",
        dependencies = { "nvim-tree/nvim-web-devicons" },
        config = function()
            require("bufferline").setup({
                options = {
                    mode = "buffers",
                    numbers = "none",
                    close_command = "bdelete! %d",
                    indicator = {
                        style = "icon",
                        icon = "▎",
                    },
                    buffer_close_icon = "󰅖",
                    modified_icon = "●",
                    close_icon = "",
                    left_trunc_marker = "",
                    right_trunc_marker = "",
                    diagnostics = "nvim_lsp",
                    diagnostics_indicator = function(count, level)
                        local icon = level:match("error") and " " or " "
                        return " " .. icon .. count
                    end,
                    offsets = {
                        {
                            filetype = "NvimTree",
                            text = "File Explorer",
                            highlight = "Directory",
                            separator = true,
                        },
                    },
                    show_buffer_close_icons = true,
                    show_close_icon = false,
                    separator_style = "thin",
                },
            })
        end,
    },

    -- ------------------------------------------------------------------------
    -- Indent Blankline: Indentation Guides
    -- ------------------------------------------------------------------------
    {
        "lukas-reineke/indent-blankline.nvim",
        main = "ibl",
        config = function()
            require("ibl").setup({
                indent = {
                    char = "│",
                },
                scope = {
                    enabled = true,
                    show_start = true,
                    show_end = false,
                },
            })
        end,
    },

    -- ------------------------------------------------------------------------
    -- Which-Key: Keybinding Help
    -- ------------------------------------------------------------------------
    {
        "folke/which-key.nvim",
        event = "VeryLazy",
        config = function()
            require("which-key").setup({
                plugins = {
                    marks = true,
                    registers = true,
                    spelling = { enabled = false },
                },
                win = {
                    border = "rounded",
                },
            })

            -- Register key groups
            require("which-key").add({
                { "<leader>f", group = "Find/Files" },
                { "<leader>g", group = "Git" },
                { "<leader>h", group = "Git Hunks" },
                { "<leader>d", group = "Debug" },
                { "<leader>b", group = "Buffer" },
                { "<leader>c", group = "Code" },
            })
        end,
    },

    -- ------------------------------------------------------------------------
    -- Autopairs: Auto-close Brackets
    -- ------------------------------------------------------------------------
    {
        "windwp/nvim-autopairs",
        event = "InsertEnter",
        config = function()
            require("nvim-autopairs").setup({
                check_ts = true,  -- Use treesitter
            })
            -- Integration with nvim-cmp
            local cmp_autopairs = require("nvim-autopairs.completion.cmp")
            local cmp = require("cmp")
            cmp.event:on("confirm_done", cmp_autopairs.on_confirm_done())
        end,
    },

    -- ------------------------------------------------------------------------
    -- Comment.nvim: Easy Commenting
    -- ------------------------------------------------------------------------
    {
        "numToStr/Comment.nvim",
        event = { "BufReadPre", "BufNewFile" },
        config = function()
            require("Comment").setup()
        end,
    },

    -- ------------------------------------------------------------------------
    -- Todo Comments: Highlight TODO/FIXME
    -- ------------------------------------------------------------------------
    {
        "folke/todo-comments.nvim",
        dependencies = { "nvim-lua/plenary.nvim" },
        config = function()
            require("todo-comments").setup()
        end,
    },
}, {
    -- lazy.nvim options (from earlier)
    install = {
        colorscheme = { "tokyonight", "habamax" },
    },
    checker = {
        enabled = true,
        notify = false,
    },
    change_detection = {
        notify = false,
    },
})
```

### Popular Colorscheme Alternatives

You can easily switch colorschemes by replacing the tokyonight configuration:

```lua
-- Catppuccin (Pastel theme)
{
    "catppuccin/nvim",
    name = "catppuccin",
    priority = 1000,
    config = function()
        require("catppuccin").setup({
            flavour = "mocha",  -- latte, frappe, macchiato, mocha
        })
        vim.cmd.colorscheme("catppuccin")
    end,
},

-- Gruvbox (Retro earth tones)
{
    "ellisonleao/gruvbox.nvim",
    priority = 1000,
    config = function()
        vim.cmd.colorscheme("gruvbox")
    end,
},

-- One Dark (Atom theme)
{
    "navarasu/onedark.nvim",
    priority = 1000,
    config = function()
        require("onedark").setup({ style = "dark" })
        require("onedark").load()
    end,
},

-- Nord (Arctic blue)
{
    "shaunsingh/nord.nvim",
    priority = 1000,
    config = function()
        vim.cmd.colorscheme("nord")
    end,
},
```

---

## Useful Neovim Commands

Here are essential Neovim commands to know:

### File Operations

```vim
:e <file>           " Edit/open a file
:w                  " Save current file
:w <file>           " Save as new file
:q                  " Quit
:wq or :x           " Save and quit
:q!                 " Quit without saving
:wa                 " Save all buffers
:qa                 " Quit all
```

### Buffer Management

```vim
:ls or :buffers     " List all buffers
:b <number/name>    " Switch to buffer
:bn                 " Next buffer
:bp                 " Previous buffer
:bd                 " Delete (close) buffer
:bd!                " Force delete buffer
```

### Window Management

```vim
:sp <file>          " Horizontal split
:vsp <file>         " Vertical split
:close              " Close current window
:only               " Close all other windows
<C-w>r              " Rotate windows
<C-w>=              " Make windows equal size
<C-w>_              " Maximize height
<C-w>|              " Maximize width
```

### Search and Replace

```vim
/<pattern>          " Search forward
?<pattern>          " Search backward
n / N               " Next/previous match
*                   " Search word under cursor
:%s/old/new/g       " Replace all in file
:%s/old/new/gc      " Replace with confirmation
:noh                " Clear search highlighting
```

### Plugin Management (lazy.nvim)

```vim
:Lazy               " Open lazy.nvim UI
:Lazy sync          " Update all plugins
:Lazy clean         " Remove unused plugins
:Lazy health        " Check plugin health
```

### LSP Commands

```vim
:LspInfo            " Show LSP status
:LspStart           " Start LSP server
:LspStop            " Stop LSP server
:LspRestart         " Restart LSP server
:Mason              " Open Mason UI
```

### Treesitter Commands

```vim
:TSInstall <lang>   " Install parser
:TSUpdate           " Update all parsers
:TSModuleInfo       " Show module info
```

### Telescope Commands

```vim
:Telescope find_files       " Find files
:Telescope live_grep        " Search in files
:Telescope buffers          " List buffers
:Telescope help_tags        " Search help
:Telescope keymaps          " Search keymaps
:Telescope commands         " Search commands
```

---

## Complete Configuration

Here's how to organize your Neovim configuration for maintainability:

### Directory Structure

```
~/.config/nvim/
├── init.lua                 # Main entry point
├── lua/
│   ├── config/
│   │   ├── options.lua      # Vim options
│   │   ├── keymaps.lua      # Key mappings
│   │   └── autocmds.lua     # Auto commands
│   └── plugins/
│       ├── colorscheme.lua  # Theme configuration
│       ├── telescope.lua    # Fuzzy finder
│       ├── treesitter.lua   # Syntax highlighting
│       ├── lsp.lua          # Language servers
│       ├── completion.lua   # Auto-completion
│       ├── git.lua          # Git integration
│       ├── ui.lua           # UI plugins
│       └── editor.lua       # Editor enhancements
└── after/
    └── ftplugin/            # Filetype-specific settings
        ├── python.lua
        ├── javascript.lua
        └── ...
```

### Modular init.lua

```lua
-- ~/.config/nvim/init.lua
-- ============================================================================
-- NEOVIM CONFIGURATION - ENTRY POINT
-- ============================================================================

-- Load core configuration
require("config.options")    -- Basic Neovim options
require("config.keymaps")    -- Key mappings
require("config.autocmds")   -- Auto commands

-- Bootstrap and load lazy.nvim
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
    vim.fn.system({
        "git", "clone", "--filter=blob:none",
        "https://github.com/folke/lazy.nvim.git",
        "--branch=stable", lazypath,
    })
end
vim.opt.rtp:prepend(lazypath)

-- Load plugins from lua/plugins/ directory
require("lazy").setup("plugins", {
    install = { colorscheme = { "tokyonight" } },
    checker = { enabled = true, notify = false },
    change_detection = { notify = false },
})
```

### Example Plugin Module

```lua
-- ~/.config/nvim/lua/plugins/telescope.lua
-- ============================================================================
-- TELESCOPE CONFIGURATION
-- ============================================================================

return {
    "nvim-telescope/telescope.nvim",
    branch = "0.1.x",
    dependencies = {
        "nvim-lua/plenary.nvim",
        { "nvim-telescope/telescope-fzf-native.nvim", build = "make" },
    },
    keys = {
        { "<leader>ff", "<cmd>Telescope find_files<cr>", desc = "Find files" },
        { "<leader>fg", "<cmd>Telescope live_grep<cr>", desc = "Live grep" },
        { "<leader>fb", "<cmd>Telescope buffers<cr>", desc = "Buffers" },
        { "<leader>fh", "<cmd>Telescope help_tags<cr>", desc = "Help" },
    },
    config = function()
        local telescope = require("telescope")
        telescope.setup({
            -- Configuration here
        })
        telescope.load_extension("fzf")
    end,
}
```

---

## Troubleshooting

### Common Issues and Solutions

**1. LSP not starting**
```bash
# Check LSP status
:LspInfo

# Ensure language server is installed
:Mason

# Check logs
:LspLog
```

**2. Treesitter parsing errors**
```bash
# Reinstall parser
:TSInstall <language>

# Update all parsers
:TSUpdate
```

**3. Plugin errors after update**
```bash
# Clear lazy.nvim cache
rm -rf ~/.local/share/nvim/lazy

# Restart and resync
nvim
:Lazy sync
```

**4. Checkhealth errors**
```bash
# Run health check
:checkhealth

# Check specific plugin
:checkhealth telescope
:checkhealth nvim-treesitter
```

**5. Performance issues**
```lua
-- Disable unused providers in init.lua
vim.g.loaded_ruby_provider = 0
vim.g.loaded_perl_provider = 0
vim.g.loaded_node_provider = 0
```

---

## Summary

You now have a fully configured Neovim IDE with:

- Multiple installation methods (PPA, AppImage, source)
- Lua-based configuration with lazy.nvim plugin manager
- Intelligent code completion with nvim-cmp
- Language Server Protocol support for multiple languages
- Treesitter for advanced syntax highlighting
- Telescope for fuzzy finding files, text, and more
- nvim-tree file explorer
- Git integration with gitsigns and fugitive
- Debugging support with nvim-dap
- Beautiful UI with lualine, bufferline, and Tokyo Night theme
- Comprehensive key mappings for efficient editing

Neovim's extensibility means you can continue customizing this setup to match your exact workflow. Explore the plugin ecosystem on GitHub and check the Neovim documentation for more features.

---

## Monitor Your Development Infrastructure with OneUptime

As you set up your development environment with Neovim, remember that building great software also requires reliable infrastructure monitoring. Whether you're running development servers, CI/CD pipelines, or production deployments, [OneUptime](https://oneuptime.com) provides comprehensive monitoring to keep your services running smoothly.

OneUptime offers:

- **Uptime Monitoring**: Track the availability of your development servers, staging environments, and production systems
- **Performance Metrics**: Monitor response times and identify bottlenecks before they impact your users
- **Incident Management**: Get alerted immediately when issues arise and coordinate responses effectively
- **Status Pages**: Keep your team and stakeholders informed about system health
- **Log Management**: Centralize and analyze logs from all your services
- **On-Call Scheduling**: Ensure the right team members are notified at the right time

Start monitoring your infrastructure today with OneUptime and focus on what you do best—writing great code in Neovim.
