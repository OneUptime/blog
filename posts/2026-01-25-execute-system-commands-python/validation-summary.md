# Validation Summary: How to Execute System Commands from Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Python standard library subprocess module
- Python os module legacy process APIs
- POSIX command-line tools
- Git CLI
- Docker CLI

## Sources Consulted
- Python subprocess documentation: https://docs.python.org/3/library/subprocess.html
- Python os module documentation: https://docs.python.org/3/library/os.html
- Python PEP 324: https://peps.python.org/pep-0324/
- Git status documentation: https://git-scm.com/docs/git-status
- Git commit documentation: https://git-scm.com/docs/git-commit
- Docker ps CLI documentation: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker exec CLI documentation: https://docs.docker.com/reference/cli/docker/container/exec/

## Issues Found
- The post stated that `subprocess.run()` is recommended in Python 3.5+ immediately before examples using `capture_output` and `text`. `subprocess.run()` was added in Python 3.5, but `capture_output` and `text` were added in Python 3.7. Updated the sentence to clarify that the shown arguments require Python 3.7+.
- The comparison table described `os.system()` as deprecated. Current Python documentation recommends using `subprocess` instead of `os.system()`, but does not mark `os.system()` itself as deprecated. Updated the table note to say it is an older API and that `subprocess` is recommended.

## Review Notes
The examples are mostly POSIX-oriented because they use commands such as `ls`, `grep`, `ping -c`, `sleep`, `df`, and `free`. They are technically correct for Unix-like environments, but a future revision could call out Windows alternatives or note the platform assumption.
