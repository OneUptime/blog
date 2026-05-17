# Validation Summary: How to Use direnv for Per-Project Environment Variables on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- direnv (shell environment manager)
- Ubuntu (apt package manager)
- Bash, Zsh, Fish shells
- nvm (Node Version Manager)
- pyenv (Python Version Manager)
- rbenv (Ruby Version Manager)
- AWS SSM Parameter Store
- HashiCorp Vault

## Sources Consulted
- direnv stdlib source: https://github.com/direnv/direnv/blob/master/stdlib.sh
- direnv stdlib man page: https://direnv.net/man/direnv-stdlib.1.html
- direnv man page: https://direnv.net/man/direnv.1.html
- direnv wiki — Node integration: https://github.com/direnv/direnv/wiki/Node
- direnv wiki — Python integration: https://github.com/direnv/direnv/wiki/Python
- direnv wiki — Ruby integration: https://github.com/direnv/direnv/wiki/Ruby

## Issues Found

1. **`use nvm` presented as a stdlib function.** The original "direnv Standard Library" code block listed `use nvm 20` as a built-in stdlib helper. `use_nvm` is not in `stdlib.sh` — the direnv wiki documents it as a user-defined function in `~/.config/direnv/direnvrc`. Replaced the line with `use node 20` (which IS in stdlib, backed by `$NODE_VERSIONS`).

2. **`use ruby <version>` presented as a stdlib function.** `use_ruby` is not in stdlib either; only `use_rbenv` and `layout ruby` are. Changed the stdlib example to `use rbenv`.

3. **Misleading `export_function` custom function in stdlib example.** The block defined a custom `export_function() { ... }` and presented it as if it were a stdlib helper. Removed it (custom shell functions in a `.envrc` are not stdlib) and replaced with two genuine stdlib helpers (`dotenv_if_exists`, `source_up`) that fit the section's theme.

4. **nvm integration section assumed `use nvm` works out of the box.** Rewrote the section to first show defining `use_nvm()` in `~/.config/direnv/direnvrc` (the canonical wiki-documented pattern), then call `use nvm 20.10.0` in the project `.envrc`. Also fixed the `.nvmrc` example: previously it called `use nvm` (which would still fail without the custom function) — now it sources `nvm.sh` and calls `nvm use` directly, which auto-detects `.nvmrc`. Switched `source` to `\.` to match nvm's own installer guidance (avoids alias conflicts).

5. **pyenv integration section used non-existent `use python <version>`.** `use_python` is not in stdlib. Replaced with `layout pyenv 3.11.6`, which is a real stdlib function that creates and activates a pyenv-managed virtualenv.

6. **rbenv integration section used non-existent `use ruby <version>`.** Replaced with `use rbenv`, the actual stdlib function.

## Review Notes

- The `~/.local/share/direnv/allow/` path for allow records is correct on Linux (it's `$XDG_DATA_HOME/direnv/allow` with the standard default).
- The `dotenv` claim ("doesn't execute arbitrary shell code") is accurate enough: the stdlib `dotenv` shells out to `direnv dotenv bash` (a Go-based parser) and only `eval`s the safely-escaped `export` statements that subcommand emits.
- The shell hook snippets for Bash, Zsh, and Fish are all correct per the official docs.
- The `.gitignore` example near "Using .envrc with Existing .env Files" lists `.env` and `.envrc.local` while the surrounding prose mentions putting `.envrc` in `.gitignore`. The listed gitignore entries are the common convention (commit `.envrc`, ignore `.env` and `.envrc.local`), but the prose wording is slightly inconsistent. Not technically wrong, so left as-is.
- `direnv version` is the documented command; some older docs use `direnv --version`, but both work in current releases.
- `DIRENV_LOG_FORMAT` is documented and defaults to `direnv: %s`; setting it explicitly in the debugging section is fine but redundant unless the user has previously cleared it.
