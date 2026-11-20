# Validation Summary: SSH Agent Forwarding After sudo, su, or tmux: Check SSH_AUTH_SOCK

## Status
validated

## Post Type
Technical troubleshooting guide with shell commands.

## Technologies Covered
- OpenSSH agent forwarding, `ssh-agent`, `ssh-add`, and `SSH_AUTH_SOCK`
- SSH connection multiplexing and `ControlPersist`
- Linux identities, Unix-domain sockets, and filesystem permissions
- sudo 1.9.17p2 with the sudoers policy
- util-linux `su`, PAM environment handling, and `namei`
- tmux session environments and Bourne-style shell syntax

## Sources Consulted
- [OpenSSH ssh-agent manual](https://man.openbsd.org/ssh-agent): agent initialization, environment setup, forwarding, and socket access caveats.
- [OpenSSH ssh-add manual](https://man.openbsd.org/ssh-add): fingerprint listing, exit statuses, confirmation requirements, and destination constraints.
- [OpenSSH forwarding implementation](https://github.com/openssh/openssh-portable/blob/master/session.c): forwarded listener creation under the authenticated identity and cleanup.
- [OpenSSH ssh_config manual](https://man.openbsd.org/ssh_config): ControlMaster, ControlPersist, and ForwardAgent.
- [sudoers 1.9.17p2 manual source](https://raw.githubusercontent.com/sudo-project/sudo/v1.9.17p2/docs/sudoers.man.in): env_reset, env_keep, and login environment initialization. The post's corresponding GitHub link also resolves.
- [sudo 1.9.17p2 manual source](https://github.com/sudo-project/sudo/blob/v1.9.17p2/docs/sudo.man.in): --preserve-env, target-user selection, and policy restrictions.
- [util-linux su manual source](https://github.com/util-linux/util-linux/blob/master/login-utils/su.1.adoc): ordinary and login environments, preservation, whitelisting, and subsequent PAM changes.
- [util-linux namei manual source](https://github.com/util-linux/util-linux/blob/master/misc-utils/namei.1.adoc): pathname traversal and long-format permissions and ownership output.
- [tmux manual](https://man.openbsd.org/tmux): show-options -A, show-environment, set-environment, attach-session -E, update-environment, and global/session inheritance.

## Issues Found
- The original text said that starting a new remote agent changes which agent the shell uses. Starting an agent alone cannot modify the calling shell's environment. Changed this to say that adopting the new agent's environment changes which agent the shell uses. The ssh-agent manual explicitly distinguishes starting the agent from evaluating its emitted environment assignments. The warning that an empty remote agent cannot restore forwarded identities remains correct.

## Review Notes
- Verified the distinction between a socket pathname, filesystem accessibility, a live listener, and successful signing. Listing identities does not guarantee destination authentication.
- Confirmed sudo's documented behavior against the specified 1.9.17p2 tag; the article does not claim this is the latest release. Local sudoers rules can alter retention and authorization.
- Confirmed util-linux su semantics and the PAM caveat. These statements should not be generalized to other su implementations.
- Confirmed tmux command options and environment inheritance. Updating a session affects newly created processes; existing shells need an explicit update. The chained refresh commands skip attachment when either prerequisite fails.
- The examples assume an existing tmux session named work, an appropriate target account, and a verified forwarding connection. These are workflow placeholders, not automatically provisioned resources.
- All five fenced shell examples passed /bin/sh -n syntax checking. Cross-user sudo/su operations and a live forwarded SSH connection were not exercised; runtime behavior was reviewed against official documentation and implementation sources.
- Technical reference URLs resolve to the intended official resources. Upstream master branches and OpenBSD-current manuals can change over time; the sudo references are version-pinned.
