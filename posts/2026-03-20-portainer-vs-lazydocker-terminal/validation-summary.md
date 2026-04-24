# Validation Summary: Portainer vs Lazydocker: Terminal Docker Management Comparison - Terminal

## Status
validated

## Post Type
Guide

## Technologies Covered
- Lazydocker
- Portainer Community Edition
- Docker
- Docker Compose
- Homebrew

## Sources Consulted
- Lazydocker official repository README: https://github.com/jesseduffield/lazydocker
- Lazydocker keybindings reference: https://github.com/jesseduffield/lazydocker/blob/master/docs/keybindings/Keybindings_en.md
- Lazydocker source keybindings implementation: https://github.com/jesseduffield/lazydocker/blob/master/pkg/gui/keybindings.go
- Homebrew formula page for `lazydocker`: https://formulae.brew.sh/formula/lazydocker
- Portainer CE install docs for Docker on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer environments docs: https://docs.portainer.io/admin/environments/add
- Portainer stack deployment docs: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer webhooks docs: https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer custom templates docs: https://docs.portainer.io/user/docker/templates/custom

## Issues Found
- The Lazydocker keybinding list was inaccurate. I corrected `l` to `m` for logs, changed `e` from "view environment variables" to "hide/show stopped containers", and clarified `?` as the options/help menu to match the official keybindings and source.
- The statement that Lazydocker stores "no data" was too absolute. Lazydocker maintains local configuration, so I changed the wording to "no server-side state to manage".
- The comparison table claimed Lazydocker had "Zero" overhead and Portainer used "~100MB RAM". Those were not supported by the official docs, so I replaced them with accurate qualitative descriptions.
- The comparison table said Lazydocker had no persistent state. I changed this to "Config only" because Lazydocker does keep local config, even though it does not run a server-side database.
- The Portainer recommendation mentioning "templates, and webhooks" was too broad for the CE-focused install path shown in the post, because stack webhooks and custom templates are Business Edition features in the official docs. I replaced that line with edition-neutral wording.

## Review Notes
- The `docker run` example for Portainer CE is valid, but current Portainer install docs commonly show `:sts` or `:lts` tags rather than `:latest`.
- Portainer's official install example often includes `--name portainer` and `--restart=always`. Their absence here does not make the command invalid.
