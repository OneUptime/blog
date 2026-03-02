# How to Install and Configure Neovim on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Neovim, Text Editors, Development, Linux

Description: Learn how to install Neovim on Ubuntu, configure it with Lua, set up plugins with lazy.nvim, and enable LSP-based code completion for a modern development environment.

---

Neovim is a modernized fork of Vim that adds built-in LSP support, Lua scripting, better async handling, and a more active plugin ecosystem. It is fully compatible with Vim configurations but extends far beyond what Vim offers. This guide covers installing a recent version, setting up a Lua-based configuration, and building a working development environment.

## Installing Neovim on Ubuntu

Ubuntu's default repositories often contain an outdated version of Neovim. Use the official release for the latest stable version:

```bash
# Option 1: Install from Ubuntu repositories (may be older)
sudo apt update
sudo apt install neovim

# Check version
nvim --version | head -1
```

For a recent version (0.9+):

```bash
# Option 2: Install from the official AppImage
curl -LO https://github.com/neovim/neovim/releases/latest/download/nvim-linux64.tar.gz
sudo tar -C /opt -xzf nvim-linux64.tar.gz
sudo ln -sf /opt/nvim-linux64/bin/nvim /usr/local/bin/nvim

# Option 3: Install from unstable PPA
sudo add-apt-repository ppa:neovim-ppa/unstable
sudo apt update
sudo apt install neovim

# Option 4: Build from source (for latest features)
sudo apt install cmake gettext
git clone https://github.com/neovim/neovim.git
cd neovim && git checkout stable
make CMAKE_BUILD_TYPE=RelWithDebInfo
sudo make install
```

Verify the installation:

```bash
nvim --version
# Should show: NVIM v0.9.x or higher
```

## Directory Structure

Neovim uses `~/.config/nvim/` for configuration:

```bash
# Create the config directory structure
mkdir -p ~/.config/nvim/lua
mkdir -p ~/.config/nvim/lua/plugins

# Minimal structure:
# ~/.config/nvim/
# ├── init.lua          (main config entry point)
# └── lua/
#     ├── options.lua   (settings)
#     ├── keymaps.lua   (key bindings)
#     └── plugins/      (plugin configs)
```

## Basic init.lua

The main configuration file uses Lua:

```lua
-- ~/.config/nvim/init.lua

-- Load modules
require("options")
require("keymaps")

-- Bootstrap lazy.nvim (plugin manager)
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable",
    lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

-- Load plugins
require("lazy").setup("plugins")
```

## options.lua

```lua
-- ~/.config/nvim/lua/options.lua

local opt = vim.opt

-- Display
opt.number = true           -- Show line numbers
opt.relativenumber = true   -- Relative line numbers
opt.cursorline = true       -- Highlight current line
opt.colorcolumn = "80"      -- Column marker
opt.signcolumn = "yes"      -- Always show sign column
opt.wrap = false            -- Disable line wrapping

-- Indentation
opt.expandtab = true        -- Use spaces instead of tabs
opt.tabstop = 4             -- Tab width
opt.shiftwidth = 4          -- Indent width
opt.softtabstop = 4
opt.autoindent = true
opt.smartindent = true

-- Search
opt.hlsearch = true         -- Highlight search results
opt.incsearch = true        -- Incremental search
opt.ignorecase = true       -- Case-insensitive
opt.smartcase = true        -- Case-sensitive when uppercase used

-- Files
opt.encoding = "utf-8"
opt.backup = false
opt.swapfile = false
opt.undofile = true         -- Persistent undo
opt.undodir = vim.fn.expand("~/.config/nvim/undo")

-- Interface
opt.scrolloff = 8           -- Lines to keep visible above/below cursor
opt.sidescrolloff = 8       -- Columns to keep visible
opt.termguicolors = true    -- True color support
opt.updatetime = 250        -- Faster completion
opt.timeoutlen = 500        -- Timeout for key sequences
opt.splitbelow = true       -- Horizontal splits go below
opt.splitright = true       -- Vertical splits go right
opt.mouse = "a"             -- Enable mouse

-- Completion
opt.completeopt = { "menuone", "noselect" }
opt.pumheight = 10          -- Completion menu height

-- Create undo directory
vim.fn.mkdir(vim.fn.expand("~/.config/nvim/undo"), "p")
```

## keymaps.lua

```lua
-- ~/.config/nvim/lua/keymaps.lua

local map = vim.keymap.set
local opts = { noremap = true, silent = true }

-- Leader key
vim.g.mapleader = ","
vim.g.maplocalleader = ","

-- Better window navigation
map("n", "<C-h>", "<C-w>h", opts)
map("n", "<C-j>", "<C-w>j", opts)
map("n", "<C-k>", "<C-w>k", opts)
map("n", "<C-l>", "<C-w>l", opts)

-- Save and quit
map("n", "<leader>w", ":w<CR>", opts)
map("n", "<leader>q", ":q<CR>", opts)
map("n", "<leader>Q", ":q!<CR>", opts)

-- Clear search highlights
map("n", "<leader><space>", ":nohlsearch<CR>", opts)

-- Better paste (don't overwrite clipboard on paste)
map("v", "p", '"_dP', opts)

-- Move selected lines
map("v", "J", ":m '>+1<CR>gv=gv", opts)
map("v", "K", ":m '<-2<CR>gv=gv", opts)

-- Indent without losing selection
map("v", "<", "<gv", opts)
map("v", ">", ">gv", opts)

-- Buffer navigation
map("n", "<leader>]", ":bnext<CR>", opts)
map("n", "<leader>[", ":bprev<CR>", opts)
map("n", "<leader>d", ":bdelete<CR>", opts)

-- Terminal
map("n", "<leader>t", ":terminal<CR>", opts)
map("t", "<Esc>", "<C-\\><C-n>", opts)  -- Exit terminal mode with Esc
```

## Plugin Configuration with lazy.nvim

Create individual plugin specs in `~/.config/nvim/lua/plugins/`:

```lua
-- ~/.config/nvim/lua/plugins/init.lua (or any .lua file in plugins/)

return {
  -- Color scheme
  {
    "folke/tokyonight.nvim",
    lazy = false,
    priority = 1000,
    config = function()
      vim.cmd.colorscheme("tokyonight-night")
    end,
  },

  -- File tree
  {
    "nvim-tree/nvim-tree.lua",
    dependencies = { "nvim-tree/nvim-web-devicons" },
    config = function()
      require("nvim-tree").setup({
        filters = { dotfiles = false },
      })
      vim.keymap.set("n", "<leader>n", ":NvimTreeToggle<CR>", { silent = true })
    end,
  },

  -- Fuzzy finder
  {
    "nvim-telescope/telescope.nvim",
    tag = "0.1.6",
    dependencies = { "nvim-lua/plenary.nvim" },
    config = function()
      local telescope = require("telescope.builtin")
      vim.keymap.set("n", "<C-p>", telescope.find_files, {})
      vim.keymap.set("n", "<leader>/", telescope.live_grep, {})
      vim.keymap.set("n", "<leader>b", telescope.buffers, {})
    end,
  },

  -- Syntax highlighting
  {
    "nvim-treesitter/nvim-treesitter",
    build = ":TSUpdate",
    config = function()
      require("nvim-treesitter.configs").setup({
        ensure_installed = { "lua", "python", "javascript", "typescript", "go", "bash", "yaml", "json" },
        highlight = { enable = true },
        indent = { enable = true },
      })
    end,
  },

  -- LSP
  {
    "neovim/nvim-lspconfig",
    dependencies = {
      "williamboman/mason.nvim",
      "williamboman/mason-lspconfig.nvim",
    },
    config = function()
      require("mason").setup()
      require("mason-lspconfig").setup({
        ensure_installed = { "pyright", "tsserver", "gopls", "lua_ls" },
      })
      local lspconfig = require("lspconfig")
      lspconfig.pyright.setup({})
      lspconfig.tsserver.setup({})
      lspconfig.gopls.setup({})

      -- LSP keymaps
      vim.keymap.set("n", "gd", vim.lsp.buf.definition, {})
      vim.keymap.set("n", "K", vim.lsp.buf.hover, {})
      vim.keymap.set("n", "<leader>rn", vim.lsp.buf.rename, {})
      vim.keymap.set("n", "<leader>ca", vim.lsp.buf.code_action, {})
    end,
  },

  -- Autocompletion
  {
    "hrsh7th/nvim-cmp",
    dependencies = {
      "hrsh7th/cmp-nvim-lsp",
      "hrsh7th/cmp-buffer",
      "hrsh7th/cmp-path",
      "L3MON4D3/LuaSnip",
      "saadparwaiz1/cmp_luasnip",
    },
    config = function()
      local cmp = require("cmp")
      cmp.setup({
        snippet = {
          expand = function(args)
            require("luasnip").lsp_expand(args.body)
          end,
        },
        mapping = cmp.mapping.preset.insert({
          ["<C-b>"] = cmp.mapping.scroll_docs(-4),
          ["<C-f>"] = cmp.mapping.scroll_docs(4),
          ["<C-Space>"] = cmp.mapping.complete(),
          ["<CR>"] = cmp.mapping.confirm({ select = true }),
          ["<Tab>"] = cmp.mapping.select_next_item(),
          ["<S-Tab>"] = cmp.mapping.select_prev_item(),
        }),
        sources = cmp.config.sources({
          { name = "nvim_lsp" },
          { name = "luasnip" },
          { name = "buffer" },
          { name = "path" },
        }),
      })
    end,
  },

  -- Git integration
  {
    "lewis6991/gitsigns.nvim",
    config = function()
      require("gitsigns").setup()
    end,
  },

  -- Status line
  {
    "nvim-lualine/lualine.nvim",
    dependencies = { "nvim-tree/nvim-web-devicons" },
    config = function()
      require("lualine").setup({ options = { theme = "tokyonight" } })
    end,
  },

  -- Comment toggling
  {
    "numToStr/Comment.nvim",
    config = function()
      require("Comment").setup()
    end,
  },
}
```

## Installing Language Servers with Mason

After starting Neovim, Mason manages LSP server installations:

```
:Mason          - Open Mason UI
:MasonInstall pyright tsserver gopls lua-language-server
```

Or from the command line:

```bash
# Install ripgrep for Telescope live_grep
sudo apt install ripgrep

# Install Node.js for TypeScript LSP
sudo apt install nodejs npm
```

## First Launch

```bash
# Open Neovim - lazy.nvim will bootstrap and install plugins
nvim

# Inside Neovim, check plugin status
:Lazy

# Check LSP status
:LspInfo

# Check health
:checkhealth
```

The `:checkhealth` output identifies missing dependencies or configuration issues.

## Migrating from Vim

Neovim reads `~/.vimrc` if no `~/.config/nvim/init.lua` exists, making migration gradual. Existing Vim plugins work in Neovim, though native Lua plugins are generally faster and better maintained.
