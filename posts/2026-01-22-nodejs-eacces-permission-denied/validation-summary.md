# Validation Summary: How to Fix 'Error: EACCES: permission denied' in Node.js

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Node.js
- npm
- nvm
- Linux file permissions and capabilities
- Nginx reverse proxy configuration
- Docker and Docker Compose
- authbind

## Sources Consulted
- npm Docs: Resolving EACCES permissions errors when installing packages globally - https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally/
- npm Docs: npm ci - https://docs.npmjs.com/cli/v11/commands/npm-ci/
- Node.js Docs: File system API - https://nodejs.org/api/fs.html
- Node.js Docs: Node.js v22 to v24 migration notes - https://nodejs.org/en/blog/migrations/v22-to-v24
- nvm README - https://github.com/nvm-sh/nvm
- Node.js Release Working Group - https://github.com/nodejs/release
- Docker Docs: Dockerfile reference - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Building best practices - https://docs.docker.com/build/building/best-practices/
- Docker Docs: Compose file reference, version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Official Image: Node - https://hub.docker.com/_/node
- Linux man-pages: capabilities(7) - https://man7.org/linux/man-pages/man7/capabilities.7.html

## Issues Found
- The npm global-directory section marked manual prefix changes as the recommended path and used `~/.npm-global`. Updated it to use the npm-documented `~/.local` prefix and marked nvm as the recommended solution, matching current npm guidance.
- The nvm install example used an outdated install script version and installed the latest Node.js with `nvm install node` before trying to use Node 20. Updated it to nvm `v0.40.5` and `nvm install --lts` / `nvm use --lts`.
- The ownership repair commands changed only the owner and referenced the old global directory. Updated them to set both owner and group for `~/.npm` and `~/.local`.
- The post said to never use `sudo npm`. Softened this to "avoid" because elevated installs can be intentional in controlled system-package scenarios, while still preserving the security guidance.
- The recursive chmod example used `chmod -R 755` while describing writable contents, which can make files executable and is not the right general repair. Replaced it with `chmod -R u+rwX,go+rX,go-w`.
- The `fs.access()` section recommended preflight access checks before file operations. Added a warning that Node.js docs advise opening, reading, or writing directly and handling errors to avoid race conditions.
- The Dockerfile used `FROM node:20`, which is outdated as of this review date, and `npm ci --only=production`, which is superseded by `--omit=dev`. Updated the image to `node:24` and the npm command to `npm ci --omit=dev`.
- The Compose example included the obsolete top-level `version` field and used the legacy `docker-compose` command. Removed `version` and changed the command to `docker compose up`.
- The diagnostic script checked parent-directory writability by masking mode bits with `fs.constants.W_OK`, which does not correctly determine whether the current process can write. Replaced it with `fs.accessSync(dir, fs.constants.W_OK)`.
- The summary table still referenced the old npm global directory and "check access before write" guidance. Updated it to match the corrected recommendations.

## Review Notes
The remaining examples are broadly correct for Linux/macOS-style environments. The authbind and `setcap` approaches are Linux-specific, and `process.getuid()` / `process.getgid()` are POSIX-only Node.js APIs, so a future revision could call out Windows differences more explicitly.
