# Validation Summary: How to Set Up a Git Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Git
- OpenSSH
- systemd
- Git daemon
- GitWeb
- Nginx
- fcgiwrap / FastCGI
- Bash
- Gitolite

## Sources Consulted
- Git daemon official documentation: https://git-scm.com/docs/git-daemon
- Git shell official documentation: https://git-scm.com/docs/git-shell
- Git init official documentation: https://git-scm.com/docs/git-init
- Git remote official documentation: https://git-scm.com/docs/git-remote
- GitWeb configuration official documentation: https://git-scm.com/docs/gitweb.conf
- Nginx FastCGI module documentation: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- fcgiwrap Ubuntu manpage: https://manpages.ubuntu.com/manpages/stonking/man8/fcgiwrap.8.html
- OpenSSH forced-command behavior / SSH_ORIGINAL_COMMAND documentation: https://man7.org/linux/man-pages/man1/ssh.1.html
- Local Git 2.43.0 `--help` output and man pages for `git-daemon`, `git-shell`, `git-init`, `git-clone`, `git-push`, and `git-remote`

## Issues Found
- The Git daemon systemd service was described as anonymous read-only access, but it used `--enable=receive-pack`, which enables pushes over the unauthenticated Git protocol. Removed `--enable=receive-pack`.
- The Git daemon service used `--export-all` while the next section instructed users to create `git-daemon-export-ok` for specific repositories. Removed `--export-all` and added `/home/git/repositories` as the served directory so `git-daemon-export-ok` controls which repositories are exported.
- The GitWeb install command enabled GitWeb syntax highlighting but did not install the `highlight` package that GitWeb expects for that feature. Added `highlight` to the package install command.
- The GitWeb configuration comment labeled `$git_temp` as the Git binary. Corrected the comment to identify it as the temporary directory.
- The Nginx/fcgiwrap GitWeb configuration did not pass `SCRIPT_FILENAME`, which fcgiwrap uses to identify the CGI script. Added `fastcgi_param SCRIPT_FILENAME /usr/share/gitweb/index.cgi;` to both GitWeb FastCGI locations.
- The post-receive hook chmod command lacked `sudo`, even though the repository and hook are owned by the `git` user in the earlier setup. Changed it to `sudo chmod +x`.
- The per-repository access example did not actually restrict access to a repository; it passed through the original Git command. Replaced it with a forced-command wrapper under `git-shell-commands` that only allows `git-upload-pack` and `git-receive-pack` for the specified repository.
- The backup script claimed to back up all repositories but only matched top-level `*.git` directories, missing nested repositories shown in the repository structure example. Replaced the glob with a recursive `find` loop that preserves nested paths.

## Review Notes
- The Git daemon protocol is unauthenticated and unencrypted. The corrected example keeps it read-only, which matches the post's stated use case.
- GitWeb provides repository browsing, not full Git hosting workflows. The post correctly presents Git over SSH as the recommended write path for small teams.
