# Validation Summary: How to Self-Host a Code Server (VS Code) with Portainer

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Portainer
- Docker Compose
- LinuxServer.io `code-server` image
- `code-server`
- Traefik
- Visual Studio Code settings
- Git and SSH
- Python and `pip`
- Node.js and `npm`

## Sources Consulted
- LinuxServer.io `code-server` image docs: https://docs.linuxserver.io/images/docker-code-server/
- code-server FAQ: https://coder.com/docs/code-server/FAQ
- code-server usage guide: https://coder.com/docs/code-server/guide
- Portainer image build docs: https://docs.portainer.io/2.27/user/docker/images/build
- Portainer known issue for Compose `build` steps on remote environments: https://docs.portainer.io/2.33-lts/faqs/known-issues/docker-compose-files-including-build-steps-fail
- Portainer FAQ on building images separately for stack deployments from Git: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/can-i-build-an-image-while-deploying-a-stack-application-from-git
- Traefik Docker Compose basic example: https://doc.traefik.io/traefik/v2.10/user-guides/docker-compose/basic-example/
- Traefik Docker routing reference: https://doc.traefik.io/traefik/v2.10/routing/providers/docker/
- Docker Compose build specification: https://docs.docker.com/compose/compose-file/build/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- VS Code themes documentation: https://code.visualstudio.com/docs/configure/themes
- VS Code Python settings reference: https://code.visualstudio.com/docs/python/settings-reference
- VS Code Python formatting documentation: https://code.visualstudio.com/docs/python/formatting
- `pip install` reference: https://pip.pypa.io/en/stable/cli/pip_install/
- Python Packaging User Guide on externally managed environments: https://packaging.python.org/en/latest/specifications/externally-managed-environments.html
- Ubuntu package search for `netcat`: https://packages.ubuntu.com/search?keywords=netcat

## Issues Found
- The Traefik example only attached `code-server` to a private app network. Traefik must share a network with the target container, so I added an external `proxy` network and the `traefik.docker.network=proxy` label.
- The `PROXY_DOMAIN` comment said it was for CSP headers. LinuxServer documents it for code-server subdomain proxying, so I corrected the comment.
- The `HASHED_PASSWORD` example omitted Docker Compose and Portainer escaping. code-server requires `$` to be doubled in Compose, so I added that note.
- The custom-image stack example used a `build:` section directly in the Compose snippet. Portainer documents build-step limitations for remote environments and recommends building first, so I changed the stack example to reference a prebuilt image only.
- The Dockerfile installed `netcat`, which is not the package name on current Ubuntu releases used by the LinuxServer image. I changed it to `netcat-openbsd`.
- The Dockerfile used `pip3 install` directly on an Ubuntu-based image. Current `pip` behavior on externally managed system Python installs requires an override for this pattern, so I added `--break-system-packages`.
- The settings example placed `python.defaultInterpreterPath` in user settings even though the VS Code Python docs say it should be configured at workspace or folder scope. I removed it.
- The settings example referenced the Black formatter without installing it. I added `ms-python.black-formatter` to the extension list.
- The icon theme example used `material-icon-theme` without installing that extension. I changed it to the built-in `vs-seti` theme.
- The workspace-sharing section used an unsupported Gitpod-style `#https://github.com/...` URL and mixed JSON into a `bash` block. I replaced it with code-server’s documented `?folder=` and `?workspace=` URL parameters and changed the config snippets to `jsonc`.
- The introduction and conclusion claimed a “full VS Code experience.” code-server’s docs note that it is not entirely equivalent to Microsoft’s VS Code, so I softened that wording.

## Review Notes
- Mounting `/var/run/docker.sock` gives the container effectively host-level Docker control. This is technically valid but high-trust and should only be used when that risk is acceptable.
- code-server’s docs note that multi-user deployments are better isolated with one VM per user. The post’s “multiple users” section works as separate instances, but it is not a strong isolation model.
