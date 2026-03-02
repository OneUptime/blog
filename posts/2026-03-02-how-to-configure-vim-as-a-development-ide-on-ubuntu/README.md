# How to Configure Vim as a Development IDE on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Vim, Development, Linux, Text Editors

Description: Learn how to transform Vim into a full-featured development IDE on Ubuntu with plugins, LSP support, fuzzy finding, syntax highlighting, and Git integration.

---

Vim's default configuration is minimal by design. With the right plugins and settings, it becomes a capable development environment that rivals graphical IDEs while remaining lightweight and keyboard-driven. This guide covers building a practical Vim development setup on Ubuntu from scratch.

## Installing a Modern Vim

Ensure you have Vim 8.0+ for plugin compatibility:

```bash
# Install latest Vim from Ubuntu repositories
sudo apt update
sudo apt install vim

# Check version
vim --version | grep "Vi IMproved"

# For the very latest version, install from the PPA
sudo add-apt-repository ppa:jonathonf/vim
sudo apt update
sudo apt install vim
```

Alternatively, switch to Neovim which has better plugin support (see the Neovim post for that setup).

## Setting Up vim-plug (Plugin Manager)

`vim-plug` is the most popular Vim plugin manager:

```bash
# Install vim-plug
curl -fLo ~/.vim/autoload/plug.vim --create-dirs \
    https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
```

## Base ~/.vimrc Configuration

Start with solid fundamentals before adding plugins:

```vim
" ~/.vimrc

" ========================================
" Basic Settings
" ========================================

set nocompatible              " Disable Vi compatibility
filetype plugin indent on     " Enable filetype detection
syntax on                     " Enable syntax highlighting

" Display
set number                    " Show line numbers
set relativenumber            " Relative line numbers
set cursorline                " Highlight current line
set colorcolumn=80,120        " Show column markers
set signcolumn=yes            " Always show sign column (for LSP markers)
set ruler                     " Show cursor position
set showcmd                   " Show incomplete commands
set showmatch                 " Highlight matching brackets

" Indentation
set expandtab                 " Use spaces instead of tabs
set tabstop=4                 " Tab width
set shiftwidth=4              " Indent width
set softtabstop=4             " Soft tab stop
set autoindent                " Auto-indent new lines
set smartindent               " Smart indentation

" Search
set hlsearch                  " Highlight search results
set incsearch                 " Incremental search
set ignorecase                " Case-insensitive search
set smartcase                 " Case-sensitive when uppercase used

" Performance
set lazyredraw                " Don't redraw during macros
set ttyfast                   " Faster terminal connection

" Files
set encoding=utf-8            " UTF-8 encoding
set fileencoding=utf-8
set backup                    " Keep backup files
set backupdir=~/.vim/backup// " Store backups here
set directory=~/.vim/swap//   " Store swap files here
set undofile                  " Persistent undo
set undodir=~/.vim/undo//     " Store undo history

" Interface
set laststatus=2              " Always show status line
set wildmenu                  " Enhanced command completion
set wildmode=list:longest     " Complete to longest common string
set mouse=a                   " Enable mouse support
set scrolloff=5               " Keep 5 lines visible above/below cursor
set splitbelow                " New horizontal splits go below
set splitright                " New vertical splits go right

" Create directories if they don't exist
silent !mkdir -p ~/.vim/{backup,swap,undo}
```

## Plugin Configuration

Add this block to `~/.vimrc` for plugin management:

```vim
" ========================================
" Plugins (vim-plug)
" ========================================

call plug#begin('~/.vim/plugged')

" File navigation
Plug 'preservim/nerdtree'                          " File tree sidebar
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } } " Fuzzy finder
Plug 'junegunn/fzf.vim'                            " fzf Vim integration

" Git integration
Plug 'tpope/vim-fugitive'                          " Git commands in Vim
Plug 'airblade/vim-gitgutter'                      " Git diff in gutter

" Status line
Plug 'vim-airline/vim-airline'                     " Better status bar
Plug 'vim-airline/vim-airline-themes'

" Syntax and language support
Plug 'sheerun/vim-polyglot'                        " Language pack
Plug 'dense-analysis/ale'                          " Async linting/fixing

" Code completion
Plug 'ycm-core/YouCompleteMe', { 'do': './install.py' }
" OR: lighter alternative
" Plug 'prabirshrestha/vim-lsp'
" Plug 'mattn/vim-lsp-settings'

" Editing helpers
Plug 'tpope/vim-surround'                          " Surround text objects
Plug 'tpope/vim-commentary'                        " Comment toggling
Plug 'jiangmiao/auto-pairs'                        " Auto-close brackets
Plug 'godlygeek/tabular'                           " Align text

" Color scheme
Plug 'morhetz/gruvbox'
Plug 'joshdick/onedark.vim'

call plug#end()
```

After adding plugins to `~/.vimrc`, open Vim and run `:PlugInstall`.

## Key Plugin Configurations

Add these after the `plug#end()` call:

```vim
" ========================================
" Plugin Configuration
" ========================================

" NERDTree
nnoremap <leader>n :NERDTreeToggle<CR>
nnoremap <leader>f :NERDTreeFind<CR>
let NERDTreeShowHidden=1                " Show hidden files
let NERDTreeIgnore=['\.pyc$', '__pycache__', '\.git']
" Auto-open NERDTree when opening a directory
autocmd StdinReadPre * let s:std_in=1
autocmd VimEnter * if argc() == 1 && isdirectory(argv()[0]) && !exists('s:std_in') | NERDTree argv()[0] | wincmd p | ene | exe 'cd '.argv()[0] | endif

" FZF
nnoremap <C-p> :Files<CR>              " Ctrl+P to find files
nnoremap <leader>g :GFiles<CR>         " Search git files
nnoremap <leader>b :Buffers<CR>        " Switch buffers
nnoremap <leader>/ :Rg<CR>            " Search file contents (requires ripgrep)
let g:fzf_layout = { 'down': '40%' }

" ALE (linting)
let g:ale_linters = {
\   'python': ['flake8', 'pylint'],
\   'javascript': ['eslint'],
\   'typescript': ['tsserver', 'eslint'],
\   'go': ['gopls'],
\}
let g:ale_fixers = {
\   '*': ['remove_trailing_lines', 'trim_whitespace'],
\   'python': ['black', 'isort'],
\   'javascript': ['prettier', 'eslint'],
\}
let g:ale_fix_on_save = 1              " Auto-fix on save
let g:ale_sign_error = '✗'
let g:ale_sign_warning = '⚠'

" vim-airline
let g:airline_powerline_fonts = 1
let g:airline#extensions#tabline#enabled = 1
let g:airline#extensions#ale#enabled = 1

" Color scheme
set background=dark
colorscheme gruvbox

" GitGutter
set updatetime=300                     " Faster response for git markers
```

## Key Mappings for Development

```vim
" ========================================
" Key Mappings
" ========================================

" Leader key
let mapleader = ","

" Quick save and quit
nnoremap <leader>w :w<CR>
nnoremap <leader>q :q<CR>
nnoremap <leader>Q :q!<CR>

" Clear search highlighting
nnoremap <leader><space> :nohlsearch<CR>

" Window navigation (faster than Ctrl+W+direction)
nnoremap <C-h> <C-w>h
nnoremap <C-j> <C-w>j
nnoremap <C-k> <C-w>k
nnoremap <C-l> <C-w>l

" Buffer navigation
nnoremap <leader>] :bnext<CR>
nnoremap <leader>[ :bprev<CR>
nnoremap <leader>d :bdelete<CR>

" Move lines up/down in visual mode
vnoremap J :m '>+1<CR>gv=gv
vnoremap K :m '<-2<CR>gv=gv

" Indent/outdent and reselect
vnoremap < <gv
vnoremap > >gv

" Toggle relative numbers
nnoremap <F3> :set relativenumber!<CR>

" Quick terminal
nnoremap <leader>t :terminal<CR>
```

## Installing YouCompleteMe

YCM requires compilation:

```bash
# Install dependencies
sudo apt install build-essential cmake python3-dev

# After :PlugInstall in Vim:
cd ~/.vim/plugged/YouCompleteMe
python3 install.py --all
# Or for specific languages:
python3 install.py --ts-completer --clangd-completer
```

## Installing Language Servers for ALE

```bash
# Python
pip3 install flake8 pylint black isort

# JavaScript/TypeScript
npm install -g eslint prettier typescript typescript-language-server

# Go
go install golang.org/x/tools/gopls@latest

# Bash
sudo apt install shellcheck
```

## Useful Built-in Vim IDE Features

Beyond plugins, Vim has useful built-in development features:

```vim
" Jump to definition (requires tags - run ctags first)
" ctags -R . in your project root
Ctrl+]          " Jump to tag under cursor
Ctrl+T          " Jump back
Ctrl+W+]        " Open tag in split

" Code folding
set foldmethod=indent   " Fold based on indentation
za              " Toggle fold
zR              " Open all folds
zM              " Close all folds

" Built-in autocomplete (no plugins needed)
Ctrl+X Ctrl+N   " Complete from current file
Ctrl+X Ctrl+F   " Complete filename
Ctrl+X Ctrl+L   " Complete whole line
Ctrl+X Ctrl+O   " Omni-completion (language-aware)
```

## Project-Specific Settings

Use `.editorconfig` or per-project vimrc files:

```bash
# In project root, create .vimrc.local
echo "set tabstop=2 shiftwidth=2" > /path/to/project/.vimrc.local
```

```vim
" In ~/.vimrc - load project-local settings
if filereadable(expand('./.vimrc.local'))
    source ./.vimrc.local
endif
```

## Performance Tips

```vim
" Limit syntax highlighting to 200 columns (improves performance on long lines)
set synmaxcol=200

" Disable syntax in large files
autocmd BufWinEnter * if line2byte(line("$") + 1) > 1000000 | syntax clear | endif

" Faster escape
set ttimeoutlen=10
set timeoutlen=500
```

A Vim setup like this is portable, fast, and effective. The investment in configuring it pays off every time you work on a remote server where installing a GUI editor is not an option.
