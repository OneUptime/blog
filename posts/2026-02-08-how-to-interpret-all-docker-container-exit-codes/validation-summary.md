# Validation Summary: How to Interpret All Docker Container Exit Codes

## Status
validated

## Post Type
Technical reference guide

## Technologies Covered
- Docker Engine and Docker CLI
- Docker Compose
- Linux/Unix process exit statuses
- Linux signals
- Bash and POSIX-style shell behavior
- Python, Node.js, and NGINX application exit codes

## Sources Consulted
- Docker Docs: `docker run` exit status, https://docs.docker.com/engine/reference/run/
- Docker Docs: `docker inspect`, https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: `docker container ls`, https://docs.docker.com/reference/cli/docker/container/ls/
- Docker Docs: `docker kill`, https://docs.docker.com/reference/cli/docker/container/kill/
- Docker Docs: Compose service `restart`, https://docs.docker.com/reference/compose-file/services/#restart
- Docker Docs: Compose stop behavior, https://docs.docker.com/compose/support-and-feedback/faq/
- GNU Bash Reference Manual: Exit Status, https://www.gnu.org/software/bash/manual/html_node/Exit-Status.html
- GNU C Library Manual: Exit Status, https://www.gnu.org/software/libc/manual/html_node/Exit-Status.html
- Linux man-pages: signal(7), https://man7.org/linux/man-pages/man7/signal.7.html
- Node.js Documentation: Process exit codes, https://nodejs.org/api/process.html#exit-codes
- Python Documentation: argparse exits with status code 2 for invalid arguments, https://docs.python.org/3/library/argparse.html
- NGINX Documentation: command-line parameters, https://nginx.org/en/docs/switches.html

## Issues Found
- The opening stated that any non-zero exit code signals a problem. Changed this to "usually signals a problem" because `docker stop`/SIGTERM and application-defined non-zero statuses can be expected.
- The first inspect command was described as checking the last run. Updated the comment because `docker inspect my-container --format '{{.State.ExitCode}}'` checks a specific named container.
- The exit code 127 description included Dockerfile `RUN` alongside container runtime commands. Narrowed it to CMD, ENTRYPOINT, or another container command to avoid conflating build-step failures with stopped container exit codes.
- The exit code 128 section claimed it means an invalid `exit()` argument. Rewrote it as an application-specific code and clarified that signal-derived statuses start at 129.
- The signal table was introduced as all signal-related exit codes. Changed it to common Linux signal-related exit codes because Linux has additional signals beyond SIGTERM, including real-time signals.
- The exit code 143 section stated that `docker stop` produces 143 as a normal result. Clarified that this is common only when the process terminates with default SIGTERM behavior; applications can handle SIGTERM and exit with another status.
- The diagnostic script only treated 129-164 as signal-derived statuses. Expanded the Linux signal range check through 192, matching 128 plus Linux signal 64.
- The summary overgeneralized `1-127` as application errors and `128+` as signal-related. Updated it to account for Docker's reserved `docker run` statuses 125-127 and the fact that not every 128+ value is necessarily signal-derived.

## Review Notes
The examples are Linux-container oriented. Signal numbers are conventional for Linux, but some signal numbers can vary on other Unix-like platforms and architectures.
