# Validation Summary: How to Use Environment Variables in Cron Jobs on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (cron package, vixie-cron based)
- cron / crontab
- Bash shell scripting
- NVM (Node Version Manager)
- pyenv (Python version manager)
- rbenv (Ruby version manager)
- systemd timers and units
- env, set -a / set +a

## Sources Consulted
- crontab(5) man page (Ubuntu cron package 3.0pl1-184ubuntu2 on Ubuntu 24.04)
- cron(8) man page
- Bash reference manual for `set -a` builtin (https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html)
- NVM official documentation (https://github.com/nvm-sh/nvm)
- pyenv official documentation (https://github.com/pyenv/pyenv)
- rbenv official documentation (https://github.com/rbenv/rbenv)
- systemd.timer and systemd.service man pages (https://www.freedesktop.org/software/systemd/man/systemd.timer.html)

## Issues Found
No technical issues found.

Verification highlights:
- Default cron environment (`SHELL=/bin/sh`, `PATH=/usr/bin:/bin`, `HOME`/`LOGNAME` from `/etc/passwd`, `MAILTO` defaulting to crontab owner) matches the crontab(5) man page.
- The claim that variable expansion is not performed in crontab environment definitions is explicitly confirmed by the man page: "The value string is not parsed for environmental substitutions or replacement of variables or tilde(~) expansion".
- `set -a` / `set +a` semantics for auto-exporting sourced variables are correct.
- Inline `VAR=value command` syntax in crontab entries works because cron passes the command line to the shell, which handles command-prefix variable assignments.
- nvm initialization via `export NVM_DIR` + sourcing `nvm.sh` matches official install instructions.
- pyenv initialization via `eval "$(pyenv init -)"` is the canonical interactive-shell setup.
- rbenv initialization via `eval "$(rbenv init -)"` is the canonical interactive-shell setup.
- systemd unit/timer fields (`Type=oneshot`, `EnvironmentFile=`, `OnCalendar=`, `Persistent=true`, `WantedBy=timers.target`) are valid.
- `%` escaping (`\%`) in cron commands is required because unescaped `%` in cron means newline; the debugging snippet correctly escapes it.
- The example AWS credentials use the standard AWS-documented example values (AKIAIOSFODNN7EXAMPLE / wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY), not real keys.

## Review Notes
- The `pyenv activate myproject` example in the pyenv wrapper requires the separate `pyenv-virtualenv` plugin and an additional `eval "$(pyenv virtualenv-init -)"` line. The post hedges with "Activate virtualenv if needed", so this is accurate-as-written but readers using `pyenv activate` for the first time may need to install the plugin separately.
- On Ubuntu, `/bin/sh` is a symlink to `/usr/bin/dash`, which has stricter POSIX semantics than bash. The post correctly notes this matters for bash-specific syntax and recommends setting `SHELL=/bin/bash` in the crontab when needed.
- The `env $(cat /etc/myapp/cron-env | xargs)` pattern is fragile with values containing spaces, quotes, or shell metacharacters; the post explicitly warns about this and recommends the `source` method as the safer alternative.
- Modern pyenv documentation now also suggests splitting init between `pyenv init --path` (in `.profile`) and `pyenv init -` (in interactive shells), but `eval "$(pyenv init -)"` alone in a script is still valid and is what users typically have working.
